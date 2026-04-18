import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MentorSubscription, SubscriptionStatus, BillingCycle } from '../../entities/mentor-subscription.entity';
import { Charge, ChargeStatus, ChargeMethod } from '../../entities/charge.entity';
import { Lead } from '../../entities/lead.entity';
import { AsaasService } from './asaas.service';
import { WhatsappService } from '../integrations/whatsapp.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MentorBillingService {
  private readonly logger = new Logger(MentorBillingService.name);

  constructor(
    @InjectRepository(MentorSubscription) private subs: Repository<MentorSubscription>,
    @InjectRepository(Charge) private charges: Repository<Charge>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
    private asaas: AsaasService,
    private whatsapp: WhatsappService,
    private notifications: NotificationsService,
  ) {}

  // ---------- Subscriptions ----------
  async listSubscriptions(mentorId: string) {
    return this.subs.find({ where: { mentorId }, order: { createdAt: 'DESC' } });
  }

  async createSubscription(mentorId: string, dto: Partial<MentorSubscription> & { createInAsaas?: boolean; billingType?: 'PIX' | 'BOLETO' | 'CREDIT_CARD' }) {
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
    const qb = this.charges.createQueryBuilder('c').where('c.mentorId = :m', { m: mentorId });
    if (filter?.status) qb.andWhere('c.status = :s', { s: filter.status });
    if (filter?.leadId) qb.andWhere('c.leadId = :l', { l: filter.leadId });
    return qb.orderBy('c.dueDate', 'DESC').getMany();
  }

  async createCharge(mentorId: string, dto: Partial<Charge> & { createInAsaas?: boolean }) {
    const lead = await this.leads.findOne({ where: { id: dto.leadId, mentorId } as any });
    if (!lead) throw new NotFoundException('Lead não encontrado');

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

    // Pega QR Pix se for o caso
    if (asaasData?.id && dto.method === ChargeMethod.PIX) {
      try {
        const qr = await this.asaas.getPixQrCode(asaasData.id);
        saved.pixQrCode = qr.encodedImage;
        saved.pixCopyPaste = qr.payload;
        await this.charges.save(saved);
      } catch {}
    }

    // Envia link por WhatsApp
    if (lead.phone && (saved.invoiceUrl || saved.pixCopyPaste)) {
      const msg = `💰 Olá ${lead.name.split(' ')[0]}!\n\nNova cobrança: ${saved.description}\nValor: R$ ${Number(saved.amount).toFixed(2)}\nVencimento: ${new Date(saved.dueDate).toLocaleDateString('pt-BR')}\n\n${saved.invoiceUrl ? `Link: ${saved.invoiceUrl}` : ''}${saved.pixCopyPaste ? `\n\nPix copia-e-cola:\n${saved.pixCopyPaste}` : ''}`;
      await this.whatsapp.sendText(mentorId, lead.phone, msg).catch(() => null);
    }

    return saved;
  }

  async markPaid(mentorId: string, id: string) {
    const c = await this.charges.findOne({ where: { id, mentorId } });
    if (!c) throw new NotFoundException();
    c.status = ChargeStatus.PAID;
    c.paidAt = new Date();
    return this.charges.save(c);
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

  // ---------- Webhook Asaas ----------
  async handleAsaasWebhook(payload: any) {
    const event = payload?.event;
    const payment = payload?.payment;
    if (!payment?.id) return { ok: true };
    const charge = await this.charges.findOne({ where: { asaasChargeId: payment.id } });
    if (!charge) return { ok: true };
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
    await this.charges.save(charge);
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
      // Marca como overdue automaticamente
      if (diffDays < 0 && c.status === ChargeStatus.PENDING) {
        c.status = ChargeStatus.OVERDUE;
        await this.charges.save(c);
      }
      // Pontos de envio: -3, 0, +1, +3, +7
      const reminderDays = [-3, 0, 1, 3, 7];
      if (!reminderDays.includes(diffDays)) continue;
      // Não enviar mais que 1x/dia
      if (c.lastReminderAt && c.lastReminderAt.toISOString().slice(0, 10) === today) continue;

      const lead = await this.leads.findOne({ where: { id: c.leadId } });
      if (!lead?.phone) continue;

      let msg = '';
      if (diffDays === -3) msg = `📅 Olá ${lead.name.split(' ')[0]}! Lembrete: sua cobrança "${c.description}" vence em 3 dias (${due.toLocaleDateString('pt-BR')}).`;
      else if (diffDays === 0) msg = `⏰ Olá ${lead.name.split(' ')[0]}! Sua cobrança "${c.description}" vence HOJE.`;
      else msg = `⚠️ Olá ${lead.name.split(' ')[0]}! Sua cobrança "${c.description}" está em atraso (${diffDays} dia${diffDays > 1 ? 's' : ''}).`;

      if (c.invoiceUrl) msg += `\n\nLink: ${c.invoiceUrl}`;
      if (c.pixCopyPaste) msg += `\n\nPix copia-e-cola:\n${c.pixCopyPaste}`;

      await this.whatsapp.sendText(c.mentorId, lead.phone, msg).catch(() => null);
      c.lastReminderAt = new Date();
      c.reminderCount = (c.reminderCount || 0) + 1;
      await this.charges.save(c);
    }
  }

  // ---------- Geração mensal de cobranças a partir de assinaturas ----------
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async generateRecurringCharges() {
    const today = new Date();
    const todayDay = today.getDate();
    const active = await this.subs.find({ where: { status: SubscriptionStatus.ACTIVE } });
    for (const s of active) {
      // só gera se ainda não criou cobrança esse mês manualmente (via Asaas elas vêm pelo webhook)
      if (s.asaasSubscriptionId) continue;
      // Verifica ciclo
      const shouldGen = this.shouldGenerateThisMonth(s, today);
      if (!shouldGen) continue;
      // Verifica se já existe
      const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      const exists = await this.charges
        .createQueryBuilder('c')
        .where('c.subscriptionId = :id AND c.dueDate >= :ms', { id: s.id, ms: monthStart })
        .getCount();
      if (exists) continue;

      const dueDate = new Date(today.getFullYear(), today.getMonth(), s.dayOfMonth)
        .toISOString().slice(0, 10);
      await this.charges.save(this.charges.create({
        mentorId: s.mentorId,
        leadId: s.leadId,
        subscriptionId: s.id,
        description: s.productName,
        amount: s.amount,
        dueDate,
        status: ChargeStatus.PENDING,
        method: ChargeMethod.MANUAL,
      }));
    }
  }

  private shouldGenerateThisMonth(s: MentorSubscription, today: Date): boolean {
    if (s.cycle === BillingCycle.MONTHLY) return today.getDate() === 1 || today.getDate() === s.dayOfMonth - 5;
    // simplificado
    return today.getDate() === 1;
  }
}
