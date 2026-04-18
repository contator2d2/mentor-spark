import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MentorSubscription, SubscriptionStatus, BillingCycle } from '../../entities/mentor-subscription.entity';
import { Charge, ChargeStatus, ChargeMethod } from '../../entities/charge.entity';
import { Lead } from '../../entities/lead.entity';
import { User } from '../../entities/user.entity';
import { MessageTemplate, MessageTemplateCategory } from '../../entities/message-template.entity';
import { MessageChannel } from '../../entities/message.entity';
import { AsaasService } from './asaas.service';
import { WhatsappService } from '../integrations/whatsapp.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Chaves dos templates editáveis pelo mentor.
 * Quando o mentor não tem template customizado, usamos um fallback hardcoded.
 */
export const BILLING_TEMPLATE_KEYS = {
  CREATED: 'billing.created',
  REMIND_3D: 'billing.reminder.3d',
  DUE_TODAY: 'billing.due',
  OVERDUE: 'billing.overdue',
  PAID: 'billing.paid',
} as const;

const FALLBACK_TEMPLATES: Record<string, string> = {
  [BILLING_TEMPLATE_KEYS.CREATED]:
    '💰 Olá {{primeiro_nome}}!\n\nNova cobrança: {{descricao}}\nValor: R$ {{valor}}\nVencimento: {{vencimento}}\n\n{{link_pagamento}}{{pix_copia_cola}}',
  [BILLING_TEMPLATE_KEYS.REMIND_3D]:
    '📅 Olá {{primeiro_nome}}! Lembrete: sua cobrança "{{descricao}}" vence em 3 dias ({{vencimento}}).\n\nValor: R$ {{valor}}\n{{link_pagamento}}',
  [BILLING_TEMPLATE_KEYS.DUE_TODAY]:
    '⏰ Olá {{primeiro_nome}}! Sua cobrança "{{descricao}}" vence HOJE.\n\nValor: R$ {{valor}}\n{{link_pagamento}}{{pix_copia_cola}}',
  [BILLING_TEMPLATE_KEYS.OVERDUE]:
    '⚠️ Olá {{primeiro_nome}}! Sua cobrança "{{descricao}}" está em atraso há {{dias_atraso}} dia(s).\n\nValor: R$ {{valor}}\n{{link_pagamento}}{{pix_copia_cola}}',
  [BILLING_TEMPLATE_KEYS.PAID]:
    '✅ Olá {{primeiro_nome}}! Recebemos o pagamento de "{{descricao}}" — R$ {{valor}}. Obrigado!{{nota_fiscal}}',
};

@Injectable()
export class MentorBillingService {
  private readonly logger = new Logger(MentorBillingService.name);

  constructor(
    @InjectRepository(MentorSubscription) private subs: Repository<MentorSubscription>,
    @InjectRepository(Charge) private charges: Repository<Charge>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(MessageTemplate) private templates: Repository<MessageTemplate>,
    private asaas: AsaasService,
    private whatsapp: WhatsappService,
    private notifications: NotificationsService,
  ) {}

  // ============ Templates personalizáveis ============
  async getTemplate(mentorId: string, key: string): Promise<string> {
    const tpl = await this.templates.findOne({
      where: { mentorId, name: key, channel: MessageChannel.WHATSAPP },
    });
    return tpl?.body || FALLBACK_TEMPLATES[key] || '';
  }

  async listBillingTemplates(mentorId: string) {
    const all = await this.templates.find({
      where: { mentorId, channel: MessageChannel.WHATSAPP, name: In(Object.values(BILLING_TEMPLATE_KEYS)) },
    });
    return Object.entries(BILLING_TEMPLATE_KEYS).map(([k, key]) => {
      const found = all.find((t) => t.name === key);
      return {
        key,
        label: this.labelForKey(key),
        body: found?.body || FALLBACK_TEMPLATES[key] || '',
        isCustom: !!found,
      };
    });
  }

  async upsertBillingTemplate(mentorId: string, key: string, body: string) {
    if (!Object.values(BILLING_TEMPLATE_KEYS).includes(key as any)) {
      throw new BadRequestException('Chave de template inválida');
    }
    let tpl = await this.templates.findOne({
      where: { mentorId, name: key, channel: MessageChannel.WHATSAPP },
    });
    if (!tpl) {
      tpl = this.templates.create({
        mentorId,
        name: key,
        channel: MessageChannel.WHATSAPP,
        category: MessageTemplateCategory.REMINDER,
        body,
      });
    } else {
      tpl.body = body;
    }
    return this.templates.save(tpl);
  }

  private labelForKey(key: string): string {
    const map: Record<string, string> = {
      [BILLING_TEMPLATE_KEYS.CREATED]: 'Cobrança gerada',
      [BILLING_TEMPLATE_KEYS.REMIND_3D]: 'Lembrete 3 dias antes',
      [BILLING_TEMPLATE_KEYS.DUE_TODAY]: 'Vencimento hoje',
      [BILLING_TEMPLATE_KEYS.OVERDUE]: 'Em atraso',
      [BILLING_TEMPLATE_KEYS.PAID]: 'Pagamento confirmado',
    };
    return map[key] || key;
  }

  private renderVars(text: string, vars: Record<string, string>): string {
    if (!text) return '';
    return text.replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_, k: string) =>
      vars[k] != null ? vars[k] : '',
    );
  }

  private buildVars(c: Charge, lead: Lead, daysOverdue?: number) {
    const linkPagamento = c.invoiceUrl ? `\nLink: ${c.invoiceUrl}` : '';
    const pixCopiaCola = c.pixCopyPaste ? `\n\nPix copia-e-cola:\n${c.pixCopyPaste}` : '';
    const notaFiscal = c.nfeUrl ? `\n\nNota fiscal: ${c.nfeUrl}` : '';
    return {
      primeiro_nome: (lead.name || '').split(' ')[0] || '',
      nome: lead.name || '',
      descricao: c.description,
      valor: Number(c.amount).toFixed(2).replace('.', ','),
      vencimento: new Date(c.dueDate).toLocaleDateString('pt-BR'),
      dias_atraso: daysOverdue != null ? String(daysOverdue) : '',
      link_pagamento: linkPagamento,
      pix_copia_cola: pixCopiaCola,
      nota_fiscal: notaFiscal,
      parcela:
        c.installmentNumber && c.installmentTotal
          ? `${c.installmentNumber}/${c.installmentTotal}`
          : '',
    };
  }

  private async notify(mentorId: string, c: Charge, lead: Lead, key: string, daysOverdue?: number) {
    if (!lead.phone) return;
    const tpl = await this.getTemplate(mentorId, key);
    const msg = this.renderVars(tpl, this.buildVars(c, lead, daysOverdue));
    await this.whatsapp.sendText(mentorId, lead.phone, msg).catch(() => null);

    // notificação in-app pro mentorado se ele tem conta
    if (lead.userId) {
      await this.notifications
        .create({
          userId: lead.userId,
          type: 'charge',
          title: this.labelForKey(key),
          body: `${c.description} — R$ ${Number(c.amount).toFixed(2)}`,
          link: '/me/financeiro',
        })
        .catch(() => null);
    }
  }

  // ---------- Subscriptions ----------
  async listSubscriptions(mentorId: string, leadId?: string) {
    const where: any = { mentorId };
    if (leadId) where.leadId = leadId;
    return this.subs.find({ where, order: { createdAt: 'DESC' } });
  }

  async createSubscription(
    mentorId: string,
    dto: Partial<MentorSubscription> & { createInAsaas?: boolean; billingType?: 'PIX' | 'BOLETO' | 'CREDIT_CARD' },
  ) {
    const lead = await this.leads.findOne({ where: { id: dto.leadId, mentorId } as any });
    if (!lead) throw new NotFoundException('Lead não encontrado');

    let asaasCustomerId: string | undefined;
    let asaasSubscriptionId: string | undefined;

    if (dto.createInAsaas) {
      try {
        const customer = await this.asaas.upsertCustomer({
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          externalReference: `lead:${lead.id}`,
        });
        asaasCustomerId = customer.id;
        const cycleMap: any = {
          monthly: 'MONTHLY',
          quarterly: 'QUARTERLY',
          semiannual: 'SEMIANNUALLY',
          annual: 'YEARLY',
        };
        const sub = await this.asaas.createSubscription({
          customer: asaasCustomerId,
          billingType: dto.billingType || 'PIX',
          value: Number(dto.amount),
          nextDueDate: dto.startDate || new Date().toISOString().slice(0, 10),
          cycle: cycleMap[dto.cycle || 'monthly'],
          description: dto.productName,
          externalReference: `mentor:${mentorId}:lead:${lead.id}`,
        });
        asaasSubscriptionId = sub.id;
      } catch (e: any) {
        this.logger.warn(`Asaas opcional falhou: ${e.message}`);
      }
    }

    const sub = this.subs.create({
      ...dto,
      mentorId,
      asaasCustomerId,
      asaasSubscriptionId,
      status: SubscriptionStatus.ACTIVE,
    });
    return this.subs.save(sub);
  }

  async cancelSubscription(mentorId: string, id: string) {
    const s = await this.subs.findOne({ where: { id, mentorId } });
    if (!s) throw new NotFoundException();
    if (s.asaasSubscriptionId) {
      try { await this.asaas.cancelSubscription(s.asaasSubscriptionId); } catch {}
    }
    s.status = SubscriptionStatus.CANCELLED;
    return this.subs.save(s);
  }

  // ---------- Charges ----------
  async listCharges(mentorId: string, filter?: { status?: ChargeStatus; leadId?: string }) {
    try {
      const qb = this.charges.createQueryBuilder('c').where('c.mentorId = :m', { m: mentorId });
      if (filter?.status) qb.andWhere('c.status = :s', { s: filter.status });
      if (filter?.leadId) qb.andWhere('c.leadId = :l', { l: filter.leadId });
      return await qb.orderBy('c.dueDate', 'DESC').getMany();
    } catch (e: any) {
      this.logger.warn(`listCharges falhou (schema desatualizado?): ${e?.message}. Retornando lista vazia.`);
      return [];
    }
  }

  async getCharge(mentorId: string, id: string) {
    const c = await this.charges.findOne({ where: { id, mentorId } });
    if (!c) throw new NotFoundException();
    return c;
  }

  async createCharge(
    mentorId: string,
    dto: Partial<Charge> & { createInAsaas?: boolean; installments?: number },
  ) {
    const lead = await this.leads.findOne({ where: { id: dto.leadId, mentorId } as any });
    if (!lead) throw new NotFoundException('Lead não encontrado');

    // ============ Parcelado: gera N cobranças com vencimentos mensais ============
    if (dto.installments && dto.installments > 1) {
      const total = dto.installments;
      const parcela = Number(((dto.amount || 0) as number) / total).toFixed(2);
      const baseDue = new Date(dto.dueDate || new Date().toISOString().slice(0, 10));
      const created: Charge[] = [];
      for (let i = 0; i < total; i++) {
        const due = new Date(baseDue);
        due.setMonth(due.getMonth() + i);
        const c = await this.createSingleCharge(mentorId, lead, {
          ...dto,
          amount: parcela as any,
          dueDate: due.toISOString().slice(0, 10),
          description: `${dto.description} (${i + 1}/${total})`,
          installmentNumber: i + 1,
          installmentTotal: total,
          parentChargeId: created[0]?.id,
          // só envia mensagem da primeira
          metadata: { ...(dto.metadata || {}), suppressNotification: i > 0 },
        });
        if (i === 0) {
          // marca o parent
          await this.charges.update(c.id, { parentChargeId: c.id });
          c.parentChargeId = c.id;
        }
        created.push(c);
      }
      return created;
    }

    return this.createSingleCharge(mentorId, lead, dto);
  }

  private async createSingleCharge(
    mentorId: string,
    lead: Lead,
    dto: Partial<Charge> & { createInAsaas?: boolean },
  ): Promise<Charge> {
    let asaasData: any = null;
    if (dto.createInAsaas) {
      try {
        const customer = await this.asaas.upsertCustomer({
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          externalReference: `lead:${lead.id}`,
        });
        const billingMap: any = { pix: 'PIX', boleto: 'BOLETO', credit_card: 'CREDIT_CARD' };
        asaasData = await this.asaas.createCharge({
          customer: customer.id,
          billingType: billingMap[dto.method || 'pix'],
          value: Number(dto.amount),
          dueDate: dto.dueDate!,
          description: dto.description,
          externalReference: `mentor:${mentorId}:lead:${lead.id}`,
        });
      } catch (e: any) {
        this.logger.warn(`Asaas charge falhou: ${e.message}`);
      }
    }

    const charge = this.charges.create({
      ...dto,
      mentorId,
      asaasChargeId: asaasData?.id,
      invoiceUrl: asaasData?.invoiceUrl,
      bankSlipUrl: asaasData?.bankSlipUrl,
    });
    const saved = await this.charges.save(charge);

    if (asaasData?.id && dto.method === ChargeMethod.PIX) {
      try {
        const qr = await this.asaas.getPixQrCode(asaasData.id);
        saved.pixQrCode = qr.encodedImage;
        saved.pixCopyPaste = qr.payload;
        await this.charges.save(saved);
      } catch {}
    }

    const suppress = (dto.metadata as any)?.suppressNotification;
    if (!suppress) {
      await this.notify(mentorId, saved, lead, BILLING_TEMPLATE_KEYS.CREATED);
    }

    return saved;
  }

  async updateCharge(mentorId: string, id: string, dto: Partial<Charge>) {
    const c = await this.getCharge(mentorId, id);
    Object.assign(c, dto);
    return this.charges.save(c);
  }

  /** Anexa nota fiscal (URL já uploaded via /uploads). Notifica mentorado. */
  async attachInvoice(
    mentorId: string,
    id: string,
    dto: { nfeUrl: string; nfeNumber?: string; nfeFileName?: string; notify?: boolean },
  ) {
    const c = await this.getCharge(mentorId, id);
    c.nfeUrl = dto.nfeUrl;
    c.nfeNumber = dto.nfeNumber;
    c.nfeFileName = dto.nfeFileName;
    c.nfeIssuedAt = new Date();
    const saved = await this.charges.save(c);

    if (dto.notify !== false) {
      const lead = await this.leads.findOne({ where: { id: c.leadId } });
      if (lead?.phone) {
        const msg = `📄 Olá ${lead.name.split(' ')[0]}! Nota fiscal disponível para "${c.description}".\n\n${dto.nfeUrl}`;
        await this.whatsapp.sendText(mentorId, lead.phone, msg).catch(() => null);
      }
      if (lead?.userId) {
        await this.notifications.create({
          userId: lead.userId,
          type: 'charge',
          title: 'Nota fiscal disponível',
          body: c.description,
          link: '/me/financeiro',
        }).catch(() => null);
      }
    }
    return saved;
  }

  async markPaid(mentorId: string, id: string) {
    const c = await this.charges.findOne({ where: { id, mentorId } });
    if (!c) throw new NotFoundException();
    c.status = ChargeStatus.PAID;
    c.paidAt = new Date();
    const saved = await this.charges.save(c);
    const lead = await this.leads.findOne({ where: { id: c.leadId } });
    if (lead) await this.notify(mentorId, saved, lead, BILLING_TEMPLATE_KEYS.PAID);
    return saved;
  }

  async cancelCharge(mentorId: string, id: string) {
    const c = await this.charges.findOne({ where: { id, mentorId } });
    if (!c) throw new NotFoundException();
    if (c.asaasChargeId) {
      try { await this.asaas.cancelCharge(c.asaasChargeId); } catch {}
    }
    c.status = ChargeStatus.CANCELLED;
    return this.charges.save(c);
  }

  /** Reenviar lembrete manual */
  async sendReminder(mentorId: string, id: string) {
    const c = await this.getCharge(mentorId, id);
    const lead = await this.leads.findOne({ where: { id: c.leadId } });
    if (!lead) throw new NotFoundException('Lead não encontrado');
    const today = new Date();
    const due = new Date(c.dueDate);
    const diff = Math.floor((due.getTime() - today.getTime()) / 86_400_000);
    let key: string;
    if (diff > 0) key = BILLING_TEMPLATE_KEYS.REMIND_3D;
    else if (diff === 0) key = BILLING_TEMPLATE_KEYS.DUE_TODAY;
    else key = BILLING_TEMPLATE_KEYS.OVERDUE;
    await this.notify(mentorId, c, lead, key, diff < 0 ? Math.abs(diff) : undefined);
    c.lastReminderAt = new Date();
    c.reminderCount = (c.reminderCount || 0) + 1;
    return this.charges.save(c);
  }

  // ---------- API pública para o MENTORADO ----------
  async listForMentorado(userId: string) {
    // localiza leads do user (pode estar em múltiplos mentores)
    const leadList = await this.leads.find({ where: { userId } });
    if (!leadList.length) return [];
    const ids = leadList.map((l) => l.id);
    const all = await this.charges.find({
      where: { leadId: In(ids) },
      order: { dueDate: 'DESC' },
    });
    return all.map((c) => ({
      id: c.id,
      description: c.description,
      amount: c.amount,
      dueDate: c.dueDate,
      paidAt: c.paidAt,
      status: c.status,
      method: c.method,
      invoiceUrl: c.invoiceUrl,
      pixQrCode: c.pixQrCode,
      pixCopyPaste: c.pixCopyPaste,
      bankSlipUrl: c.bankSlipUrl,
      nfeUrl: c.nfeUrl,
      nfeNumber: c.nfeNumber,
      nfeFileName: c.nfeFileName,
      installmentNumber: c.installmentNumber,
      installmentTotal: c.installmentTotal,
    }));
  }

  // ---------- Webhook Asaas ----------
  async handleAsaasWebhook(payload: any) {
    const event = payload?.event;
    const payment = payload?.payment;
    if (!payment?.id) return { ok: true };
    const charge = await this.charges.findOne({ where: { asaasChargeId: payment.id } });
    if (!charge) return { ok: true };
    const wasPaid = charge.status === ChargeStatus.PAID;
    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      charge.status = ChargeStatus.PAID;
      charge.paidAt = new Date();
    } else if (event === 'PAYMENT_OVERDUE') {
      charge.status = ChargeStatus.OVERDUE;
    } else if (event === 'PAYMENT_REFUNDED') {
      charge.status = ChargeStatus.REFUNDED;
    } else if (event === 'PAYMENT_DELETED') {
      charge.status = ChargeStatus.CANCELLED;
    }
    const saved = await this.charges.save(charge);
    if (!wasPaid && saved.status === ChargeStatus.PAID) {
      const lead = await this.leads.findOne({ where: { id: charge.leadId } });
      if (lead) await this.notify(charge.mentorId, saved, lead, BILLING_TEMPLATE_KEYS.PAID);
    }
    await this.notifications.create({
      userId: charge.mentorId,
      type: 'charge',
      title: `Cobrança ${charge.status}`,
      body: `${charge.description} - R$ ${Number(charge.amount).toFixed(2)}`,
    });
    return { ok: true };
  }

  // ---------- Régua de cobrança automática ----------
  /** Roda 4x/dia. Lembra 3 dias antes, no dia, e 1/3/7 dias após vencimento. */
  @Cron('0 9,12,15,18 * * *')
  async billingReminders() {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const pending = await this.charges.find({
      where: [{ status: ChargeStatus.PENDING }, { status: ChargeStatus.OVERDUE }],
    });

    for (const c of pending) {
      const due = new Date(c.dueDate);
      const diffDays = Math.floor((due.getTime() - now.getTime()) / 86_400_000);
      if (diffDays < 0 && c.status === ChargeStatus.PENDING) {
        c.status = ChargeStatus.OVERDUE;
        await this.charges.save(c);
      }
      const reminderDays = [-3, 0, 1, 3, 7];
      if (!reminderDays.includes(diffDays)) continue;
      if (c.lastReminderAt && c.lastReminderAt.toISOString().slice(0, 10) === today) continue;

      const lead = await this.leads.findOne({ where: { id: c.leadId } });
      if (!lead?.phone) continue;

      let key: string;
      if (diffDays === -3) key = BILLING_TEMPLATE_KEYS.REMIND_3D;
      else if (diffDays === 0) key = BILLING_TEMPLATE_KEYS.DUE_TODAY;
      else key = BILLING_TEMPLATE_KEYS.OVERDUE;

      await this.notify(c.mentorId, c, lead, key, diffDays < 0 ? Math.abs(diffDays) : undefined);
      c.lastReminderAt = new Date();
      c.reminderCount = (c.reminderCount || 0) + 1;
      await this.charges.save(c);
    }
  }

  // ---------- Geração mensal de cobranças a partir de assinaturas ----------
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async generateRecurringCharges() {
    const today = new Date();
    const active = await this.subs.find({ where: { status: SubscriptionStatus.ACTIVE } });
    for (const s of active) {
      if (s.asaasSubscriptionId) continue;
      const shouldGen = this.shouldGenerateThisMonth(s, today);
      if (!shouldGen) continue;
      const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      const exists = await this.charges
        .createQueryBuilder('c')
        .where('c.subscriptionId = :id AND c.dueDate >= :ms', { id: s.id, ms: monthStart })
        .getCount();
      if (exists) continue;

      const dueDate = new Date(today.getFullYear(), today.getMonth(), s.dayOfMonth)
        .toISOString().slice(0, 10);
      const lead = await this.leads.findOne({ where: { id: s.leadId } });
      const c = await this.charges.save(this.charges.create({
        mentorId: s.mentorId,
        leadId: s.leadId,
        subscriptionId: s.id,
        description: s.productName,
        amount: s.amount,
        dueDate,
        status: ChargeStatus.PENDING,
        method: ChargeMethod.MANUAL,
      }));
      if (lead) {
        await this.notify(s.mentorId, c, lead, BILLING_TEMPLATE_KEYS.CREATED);
      }
    }
  }

  private shouldGenerateThisMonth(s: MentorSubscription, today: Date): boolean {
    if (s.cycle === BillingCycle.MONTHLY) return today.getDate() === 1 || today.getDate() === Math.max(1, s.dayOfMonth - 5);
    return today.getDate() === 1;
  }
}
