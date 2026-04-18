import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Message, MessageChannel, MessageStatus, MessageDirection } from '../../entities/message.entity';
import { MessageTemplate } from '../../entities/message-template.entity';
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
}

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectRepository(Message) private repo: Repository<Message>,
    @InjectRepository(MessageTemplate) private templates: Repository<MessageTemplate>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectRepository(User) private users: Repository<User>,
    private mail: MailService,
    private whatsapp: WhatsappService,
    private notifications: NotificationsService,
  ) {}

  /** Substitui variáveis {{nome}}, {{empresa}}, etc. */
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

    const vars = await this.buildVarsForLead(input.leadId, input.mentorId);
    const renderedBody = this.renderTemplate(input.body, vars);
    const renderedSubject = input.subject ? this.renderTemplate(input.subject, vars) : undefined;

    let recipientAddress: string | undefined;
    let userId: string | undefined;
    if (lead) {
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
    });
    const saved = await this.repo.save(msg);

    if (!input.scheduledAt) {
      // dispara em background (não bloqueia request)
      this.dispatch(saved.id).catch((e) => this.logger.error(`dispatch falhou: ${e.message}`));
    }
    return saved;
  }

  /** Executa o envio real conforme o canal. */
  async dispatch(messageId: string) {
    const msg = await this.repo.findOne({ where: { id: messageId } });
    if (!msg) return;
    if (![MessageStatus.QUEUED, MessageStatus.SCHEDULED].includes(msg.status)) return;

    await this.repo.update(messageId, { status: MessageStatus.SENDING });

    try {
      if (msg.channel === MessageChannel.EMAIL) {
        if (!msg.recipientAddress) throw new Error('Lead sem email cadastrado');
        await this.mail.send({
          to: msg.recipientAddress,
          subject: msg.subject || 'Nova mensagem',
          html: this.bodyToHtml(msg.body),
        });
      } else if (msg.channel === MessageChannel.WHATSAPP) {
        if (!msg.recipientAddress) throw new Error('Lead sem telefone cadastrado');
        const result = await this.whatsapp.sendText(msg.mentorId, msg.recipientAddress, msg.body);
        if (!result.ok) throw new Error(result.error || 'Falha no WhatsApp');
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

  private bodyToHtml(body: string): string {
    const safe = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
    return `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;line-height:1.6">${safe}</div>`;
  }

  /** Cron a cada minuto: dispara mensagens agendadas vencidas */
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduled() {
    const due = await this.repo.find({
      where: { status: MessageStatus.SCHEDULED, scheduledAt: LessThanOrEqual(new Date()) },
      take: 50,
    });
    if (due.length === 0) return;
    this.logger.log(`Processando ${due.length} mensagens agendadas`);
    for (const m of due) {
      await this.dispatch(m.id);
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
