import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Message, MessageChannel, MessageStatus, MessageDirection, MessageAttachment } from '../../entities/message.entity';
import { MessageTemplate } from '../../entities/message-template.entity';
import { MessageBroadcast, BroadcastStatus, BroadcastSequenceStep } from '../../entities/message-broadcast.entity';
import { Lead } from '../../entities/lead.entity';
import { User } from '../../entities/user.entity';
import { MailService } from '../../shared/mail.service';
import { WhatsappService } from '../integrations/whatsapp.service';
import { NotificationsService } from '../notifications/notifications.service';

interface SendInput {
  mentorId: string;
  senderId?: string;
  leadId?: string;
  channel: MessageChannel;
  subject?: string;
  body: string;
  templateId?: string;
  automationId?: string;
  scheduledAt?: Date | null;
  attachments?: MessageAttachment[];
  /** Endereço bruto opcional (override do lead) — usado para envio de teste */
  recipientAddress?: string;
  isTest?: boolean;
  sequenceId?: string;
  sequenceStep?: number;
  broadcastId?: string;
}

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectRepository(Message) private repo: Repository<Message>,
    @InjectRepository(MessageTemplate) private templates: Repository<MessageTemplate>,
    @InjectRepository(MessageBroadcast) private broadcasts: Repository<MessageBroadcast>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectRepository(User) private users: Repository<User>,
    private mail: MailService,
    private whatsapp: WhatsappService,
    private notifications: NotificationsService,
  ) {}

  renderTemplate(text: string, vars: Record<string, string | undefined>): string {
    if (!text) return '';
    return text.replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_, key: string) => {
      const v = vars[key];
      return v != null ? String(v) : `{{${key}}}`;
    });
  }

  async buildVarsForLead(leadId?: string, mentorId?: string): Promise<Record<string, string>> {
    if (!leadId) return {};
    const lead = await this.leads.findOne({ where: { id: leadId } });
    if (!lead) return {};
    const mentor = mentorId ? await this.users.findOne({ where: { id: mentorId } }) : null;
    const firstName = lead.name?.split(' ')[0] || '';
    return {
      nome: lead.name || '',
      primeiro_nome: firstName,
      email: lead.email || '',
      telefone: lead.phone || '',
      empresa: lead.company || lead.companyLegalName || '',
      mentor: mentor?.name || mentor?.brandName || '',
      marca: mentor?.brandName || mentor?.name || '',
    };
  }

  async send(input: SendInput) {
    const lead = input.leadId ? await this.leads.findOne({ where: { id: input.leadId, mentorId: input.mentorId } }) : null;
    if (input.leadId && !lead) throw new BadRequestException('Lead não encontrado');

    const vars = lead ? await this.buildVarsForLead(input.leadId, input.mentorId) : {};
    const renderedBody = this.renderTemplate(input.body, vars);
    const renderedSubject = input.subject ? this.renderTemplate(input.subject, vars) : undefined;

    let recipientAddress: string | undefined = input.recipientAddress;
    let userId: string | undefined;
    if (!recipientAddress && lead) {
      userId = lead.userId;
      if (input.channel === MessageChannel.EMAIL) recipientAddress = lead.email;
      else if (input.channel === MessageChannel.WHATSAPP) recipientAddress = lead.phone;
    }

    const msg = this.repo.create({
      mentorId: input.mentorId,
      leadId: input.leadId,
      userId,
      channel: input.channel,
      direction: MessageDirection.OUT,
      subject: renderedSubject,
      body: renderedBody,
      status: input.scheduledAt ? MessageStatus.SCHEDULED : MessageStatus.QUEUED,
      scheduledAt: input.scheduledAt || null,
      templateId: input.templateId,
      automationId: input.automationId,
      senderId: input.senderId,
      recipientAddress,
      attachments: input.attachments,
      isTest: !!input.isTest,
      sequenceId: input.sequenceId,
      sequenceStep: input.sequenceStep,
      broadcastId: input.broadcastId,
    });
    const saved = await this.repo.save(msg);

    if (!input.scheduledAt) {
      this.dispatch(saved.id).catch((e) => this.logger.error(`dispatch falhou: ${e.message}`));
    }
    return saved;
  }

  /** Envio direto para um número/email específico (teste rápido). Não cria histórico de lead. */
  async sendTest(mentorId: string, channel: MessageChannel, to: string, body: string, subject?: string, attachments?: MessageAttachment[]) {
    return this.send({
      mentorId,
      channel,
      body,
      subject,
      attachments,
      recipientAddress: to,
      isTest: true,
    });
  }

  /** Sequência: cria N mensagens encadeadas com delay (segundos) entre elas. */
  async sendSequence(opts: {
    mentorId: string;
    senderId?: string;
    leadId: string;
    channel: MessageChannel;
    steps: BroadcastSequenceStep[];
    startAt?: Date;
    sequenceId?: string;
    broadcastId?: string;
  }) {
    const sequenceId = opts.sequenceId || crypto.randomUUID();
    const start = opts.startAt ? new Date(opts.startAt) : new Date();
    let cursor = start.getTime();
    const created: Message[] = [];
    for (let i = 0; i < opts.steps.length; i++) {
      const step = opts.steps[i];
      if (i > 0) cursor += Math.max(0, step.delaySeconds || 0) * 1000;
      const scheduledAt = i === 0 && !opts.startAt ? null : new Date(cursor);
      const m = await this.send({
        mentorId: opts.mentorId,
        senderId: opts.senderId,
        leadId: opts.leadId,
        channel: opts.channel,
        body: step.body,
        subject: step.subject,
        attachments: step.attachments,
        scheduledAt,
        sequenceId,
        sequenceStep: i,
        broadcastId: opts.broadcastId,
      });
      created.push(m);
    }
    return { sequenceId, messages: created };
  }

  /** Cria broadcast (envio em massa) a partir de lista de leads + sequência. */
  async createBroadcast(dto: {
    mentorId: string;
    createdBy?: string;
    name: string;
    channel: MessageChannel;
    sequence: BroadcastSequenceStep[];
    leadIds?: string[];
    groupTargets?: { jid: string; name?: string; isChannel?: boolean }[];
    perRecipientDelaySeconds?: number;
    jitter?: number;
    scheduledAt?: Date | null;
  }) {
    if (!dto.sequence?.length) throw new BadRequestException('Sequência vazia');
    const hasLeads = !!dto.leadIds?.length;
    const hasGroups = !!dto.groupTargets?.length;
    if (!hasLeads && !hasGroups) throw new BadRequestException('Sem destinatários');
    if (hasGroups && dto.channel !== MessageChannel.WHATSAPP) {
      throw new BadRequestException('Grupos/canais só são suportados via WhatsApp');
    }
    const total = hasGroups ? dto.groupTargets!.length : dto.leadIds!.length;
    const broadcast = this.broadcasts.create({
      mentorId: dto.mentorId,
      createdBy: dto.createdBy,
      name: dto.name,
      channel: dto.channel,
      sequence: dto.sequence,
      leadIds: dto.leadIds || [],
      groupTargets: dto.groupTargets,
      perRecipientDelaySeconds: dto.perRecipientDelaySeconds ?? 8,
      jitter: dto.jitter ?? 0.3,
      totalRecipients: total,
      scheduledAt: dto.scheduledAt || null,
      status: dto.scheduledAt ? BroadcastStatus.SCHEDULED : BroadcastStatus.RUNNING,
      startedAt: dto.scheduledAt ? null : new Date(),
    });
    const saved = await this.broadcasts.save(broadcast);
    if (!dto.scheduledAt) {
      this.runBroadcast(saved.id).catch((e) => this.logger.error(`broadcast falhou: ${e.message}`));
    }
    return saved;
  }

  /** Executa broadcast: agenda mensagens com delays acumulados para cada destinatário. */
  async runBroadcast(broadcastId: string) {
    const b = await this.broadcasts.findOne({ where: { id: broadcastId } });
    if (!b) return;
    if (![BroadcastStatus.RUNNING, BroadcastStatus.SCHEDULED, BroadcastStatus.DRAFT].includes(b.status)) return;
    await this.broadcasts.update(broadcastId, { status: BroadcastStatus.RUNNING, startedAt: new Date() });

    const baseStart = b.scheduledAt ? b.scheduledAt.getTime() : Date.now();
    let cursor = baseStart;
    let sentCount = 0;
    let failedCount = 0;

    // Modo grupos/canais
    if (b.groupTargets && b.groupTargets.length > 0) {
      for (const target of b.groupTargets) {
        try {
          // delay anti-bloqueio
          if (cursor > baseStart) {
            const base = b.perRecipientDelaySeconds * 1000;
            const variance = base * b.jitter * (Math.random() * 2 - 1);
            const wait = Math.max(1000, base + variance);
            await new Promise((r) => setTimeout(r, wait));
          }
          for (let i = 0; i < b.sequence.length; i++) {
            const step = b.sequence[i];
            if (i > 0 && step.delaySeconds) await new Promise((r) => setTimeout(r, step.delaySeconds! * 1000));
            const r = await this.whatsapp.sendTextToGroup(b.mentorId, target.jid, step.body);
            if (!r.ok) throw new Error(r.error || 'falha envio grupo');
          }
          sentCount++;
          cursor = Date.now();
        } catch (e: any) {
          this.logger.error(`broadcast ${broadcastId} group ${target.jid}: ${e.message}`);
          failedCount++;
        }
      }
      await this.broadcasts.update(broadcastId, {
        status: BroadcastStatus.COMPLETED,
        finishedAt: new Date(),
        sentCount,
        failedCount,
      });
      return;
    }

    // Modo leads (existente)
    for (const leadId of b.leadIds) {
      try {
        if (cursor > baseStart) {
          const base = b.perRecipientDelaySeconds * 1000;
          const variance = base * b.jitter * (Math.random() * 2 - 1);
          cursor += Math.max(1000, base + variance);
        }
        await this.sendSequence({
          mentorId: b.mentorId,
          senderId: b.createdBy,
          leadId,
          channel: b.channel,
          steps: b.sequence,
          startAt: new Date(cursor),
          broadcastId: b.id,
        });
        for (let i = 1; i < b.sequence.length; i++) cursor += (b.sequence[i].delaySeconds || 0) * 1000;
        sentCount++;
      } catch (e: any) {
        this.logger.error(`broadcast ${broadcastId} lead ${leadId}: ${e.message}`);
        failedCount++;
      }
    }

    await this.broadcasts.update(broadcastId, {
      status: BroadcastStatus.COMPLETED,
      finishedAt: new Date(),
      sentCount,
      failedCount,
    });
  }

  async cancelBroadcast(mentorId: string, id: string) {
    const b = await this.broadcasts.findOne({ where: { id, mentorId } });
    if (!b) throw new BadRequestException('Broadcast não encontrado');
    await this.broadcasts.update(id, { status: BroadcastStatus.CANCELED, finishedAt: new Date() });
    // cancela mensagens agendadas ainda não enviadas
    await this.repo
      .createQueryBuilder()
      .update(Message)
      .set({ status: MessageStatus.FAILED, errorMessage: 'Broadcast cancelado' })
      .where('broadcastId = :id AND status = :s', { id, s: MessageStatus.SCHEDULED })
      .execute();
    return { ok: true };
  }

  async listBroadcasts(mentorId: string) {
    return this.broadcasts.find({ where: { mentorId }, order: { createdAt: 'DESC' }, take: 100 });
  }

  async broadcastReport(mentorId: string, id: string) {
    const b = await this.broadcasts.findOne({ where: { id, mentorId } });
    if (!b) throw new BadRequestException('Broadcast não encontrado');
    const msgs = await this.repo.find({ where: { broadcastId: id }, order: { createdAt: 'ASC' } });
    const byStatus: Record<string, number> = {};
    for (const m of msgs) byStatus[m.status] = (byStatus[m.status] || 0) + 1;
    return { broadcast: b, messages: msgs, summary: byStatus };
  }

   /** Executa o envio real conforme o canal. */
   async dispatch(messageId: string) {
     const msg = await this.repo.findOne({ where: { id: messageId } });
     if (!msg) return;
     if (![MessageStatus.QUEUED, MessageStatus.SCHEDULED].includes(msg.status)) return;
 
     await this.repo.update(messageId, { status: MessageStatus.SENDING });
 
     try {
       if (msg.channel === MessageChannel.EMAIL) {
         if (!msg.recipientAddress) throw new Error('Destinatário sem email');
 
         const mentor = await this.users.findOne({ where: { id: msg.mentorId } });
         const lead = msg.leadId ? await this.leads.findOne({ where: { id: msg.leadId } }) : null;
         
         let appUrl = process.env.APP_URL || 'http://localhost:8080';
         if (mentor?.customDomain) appUrl = `https://${mentor.customDomain}`;
         const loginUrl = `${appUrl.replace(/\/$/, '')}/login`;
 
         const attachmentsHtml = (msg.attachments || []).map((a) => {
           const url = this.absoluteUrl(a.url);
           return `<p style="margin: 10px 0;"><a href="${url}" target="_blank" style="color: ${mentor?.brandPrimaryColor || '#2563eb'}; text-decoration: underline;">📎 ${a.originalName || 'Anexo'}</a></p>`;
         }).join('');
 
         const html = this.mail.generateStandardTemplate({
           brandName: mentor?.brandName || mentor?.name || 'MentorFlow',
           brandLogoUrl: mentor?.brandLogoUrl,
           brandPrimaryColor: mentor?.brandPrimaryColor,
           firstName: lead?.name?.split(' ')[0] || 'Aventureiro(a)',
           message: this.bodyToHtml(msg.body) + (attachmentsHtml ? `<div style="margin-top: 24px; padding-top: 16px; border-top: 1px dashed #e2e8f0;">${attachmentsHtml}</div>` : ''),
           email: msg.recipientAddress,
           loginUrl,
         });
 
         await this.mail.send({
           to: msg.recipientAddress,
           subject: msg.subject || 'Nova mensagem',
           html,
         });
       } else if (msg.channel === MessageChannel.WHATSAPP) {
        if (!msg.recipientAddress) throw new Error('Destinatário sem telefone');
        const publicBase = process.env.PUBLIC_BASE_URL || process.env.APP_URL;
        const attachments = msg.attachments || [];
        if (attachments.length === 0) {
          const r = await this.whatsapp.sendText(msg.mentorId, msg.recipientAddress, msg.body);
          if (!r.ok) throw new Error(r.error || 'Falha no WhatsApp');
        } else {
          // Envia mídia(s) e o texto separadamente para garantir entrega
          for (let i = 0; i < attachments.length; i++) {
            const a = attachments[i];
            const r = await this.whatsapp.sendMedia(
              msg.mentorId,
              msg.recipientAddress,
              { url: a.url, mimetype: a.mimetype, kind: a.kind, caption: i === 0 ? msg.body : undefined, fileName: a.originalName },
              publicBase,
            );
            if (!r.ok) throw new Error(r.error || 'Falha enviando mídia');
          }
        }
      } else if (msg.channel === MessageChannel.IN_APP) {
        if (!msg.userId) throw new Error('Lead sem conta no app (não tem userId)');
        await this.notifications.create({
          userId: msg.userId,
          type: 'mentor_message',
          title: msg.subject || 'Nova mensagem do mentor',
          body: msg.body,
        });
      }

      await this.repo.update(messageId, {
        status: MessageStatus.SENT,
        sentAt: new Date(),
        errorMessage: null as any,
      });
    } catch (e: any) {
      this.logger.error(`Falha enviando msg ${messageId}: ${e.message}`);
      await this.repo.update(messageId, {
        status: MessageStatus.FAILED,
        errorMessage: e.message?.slice(0, 500),
      });
    }
  }

  private absoluteUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const base = process.env.PUBLIC_BASE_URL || process.env.APP_URL || '';
    return base.replace(/\/$/, '') + url;
  }

  private bodyToHtml(body: string): string {
    const safe = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
    return `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;line-height:1.6">${safe}</div>`;
  }

  /** Cron: dispara mensagens agendadas vencidas e inicia broadcasts agendados */
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduled() {
    const due = await this.repo.find({
      where: { status: MessageStatus.SCHEDULED, scheduledAt: LessThanOrEqual(new Date()) },
      take: 100,
    });
    if (due.length) {
      this.logger.log(`Processando ${due.length} mensagens agendadas`);
      for (const m of due) await this.dispatch(m.id);
    }

    const dueB = await this.broadcasts.find({
      where: { status: BroadcastStatus.SCHEDULED, scheduledAt: LessThanOrEqual(new Date()) },
      take: 5,
    });
    for (const b of dueB) {
      this.runBroadcast(b.id).catch((e) => this.logger.error(`broadcast cron: ${e.message}`));
    }
  }

  // ============== Histórico ==============
  async listForLead(mentorId: string, leadId: string) {
    return this.repo.find({
      where: { mentorId, leadId },
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async listAll(mentorId: string, filter?: { channel?: MessageChannel; status?: MessageStatus }) {
    const where: any = { mentorId };
    if (filter?.channel) where.channel = filter.channel;
    if (filter?.status) where.status = filter.status;
    return this.repo.find({ where, order: { createdAt: 'DESC' }, take: 200 });
  }
}
