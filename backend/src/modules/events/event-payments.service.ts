import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MentorPaymentProvider,
  PaymentProviderType,
  PaymentProviderStatus,
} from '../../entities/mentor-payment-provider.entity';
import { CaptureEvent } from '../../entities/capture-event.entity';
import { EventTicketTier } from '../../entities/event-ticket-tier.entity';
import { EventRegistration, RegistrationPaymentStatus } from '../../entities/event-registration.entity';
import { EventPayment, EventPaymentStatus } from '../../entities/event-payment.entity';

/**
 * Serviço de pagamentos para eventos.
 * Encapsula adapters dos provedores: Asaas, Mercado Pago, Stripe (BYOK), Manual.
 *
 * Cada mentor pode ter 1 config por provedor; ao criar evento pago, escolhe qual usar.
 */
@Injectable()
export class EventPaymentsService {
  private readonly logger = new Logger(EventPaymentsService.name);

  constructor(
    @InjectRepository(MentorPaymentProvider) private providers: Repository<MentorPaymentProvider>,
    @InjectRepository(EventTicketTier) private tiers: Repository<EventTicketTier>,
    @InjectRepository(EventRegistration) private regs: Repository<EventRegistration>,
    @InjectRepository(EventPayment) private payments: Repository<EventPayment>,
    @InjectRepository(CaptureEvent) private events: Repository<CaptureEvent>,
  ) {}

  // ==================== Config (mentor) ====================
  async listProviders(mentorId: string) {
    const items = await this.providers
      .createQueryBuilder('p')
      .addSelect('p.apiKey')
      .where('p.mentorId = :mentorId', { mentorId })
      .getMany();
    // não vaza apiKey
    return items.map((p) => ({
      ...p,
      hasApiKey: !!p.apiKey,
      apiKey: undefined,
    }));
  }

  async upsertProvider(
    mentorId: string,
    dto: {
      type: PaymentProviderType;
      label?: string;
      apiKey?: string;
      environment?: string;
      manualInstructions?: string;
      manualCheckoutUrl?: string;
      status?: PaymentProviderStatus;
    },
  ) {
    let p = await this.providers.findOne({ where: { mentorId, type: dto.type } });
    if (!p) {
      p = this.providers.create({ mentorId, type: dto.type });
    }
    p.label = dto.label ?? p.label;
    if (dto.apiKey !== undefined && dto.apiKey !== '') p.apiKey = dto.apiKey;
    if (dto.environment) p.environment = dto.environment;
    if (dto.manualInstructions !== undefined) p.manualInstructions = dto.manualInstructions;
    if (dto.manualCheckoutUrl !== undefined) p.manualCheckoutUrl = dto.manualCheckoutUrl;
    if (dto.status) p.status = dto.status;
    await this.providers.save(p);
    const fresh = await this.providers.findOne({ where: { id: p.id } });
    return { ...fresh, apiKey: undefined, hasApiKey: !!fresh?.apiKey };
  }

  async deleteProvider(mentorId: string, id: string) {
    await this.providers.delete({ id, mentorId } as any);
    return { ok: true };
  }

  /** Carrega o provider com apiKey (uso interno). */
  private async loadFullProvider(id: string) {
    const p = await this.providers
      .createQueryBuilder('p')
      .addSelect('p.apiKey')
      .where('p.id = :id', { id })
      .getOne();
    if (!p) throw new NotFoundException('Provedor de pagamento não encontrado');
    return p;
  }

  // ==================== Lotes/tiers ====================
  async listTiers(eventId: string) {
    return this.tiers.find({ where: { eventId }, order: { position: 'ASC', createdAt: 'ASC' } });
  }

  async createTier(eventId: string, dto: Partial<EventTicketTier>) {
    const t = this.tiers.create({ ...dto, eventId });
    return this.tiers.save(t);
  }

  async updateTier(id: string, dto: Partial<EventTicketTier>) {
    await this.tiers.update(id, dto);
    return this.tiers.findOne({ where: { id } });
  }

  async deleteTier(id: string) {
    await this.tiers.delete(id);
    return { ok: true };
  }

  // ==================== Checkout ====================
  /**
   * Cria uma cobrança para uma inscrição de evento pago.
   * Escolhe o adapter conforme provider.type. Idempotente: se já houver pagamento PENDING ativo, retorna ele.
   */
  async createCheckout(opts: {
    registration: EventRegistration;
    event: CaptureEvent;
    tier: EventTicketTier;
    payerCpfCnpj?: string;
  }) {
    const { registration, event, tier } = opts;
    if (!event.paymentProviderId) {
      throw new BadRequestException('Este evento não tem provedor de pagamento configurado.');
    }
    if (tier.priceCents <= 0) {
      // grátis — marca como pago automaticamente
      await this.regs.update(registration.id, {
        paymentStatus: RegistrationPaymentStatus.PAID,
        amountPaidCents: 0,
        paidAt: new Date(),
      });
      return { free: true };
    }

    // tenta reaproveitar pagamento pendente recente (< 1h)
    const existing = await this.payments.findOne({
      where: { registrationId: registration.id, status: EventPaymentStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
    if (existing && Date.now() - new Date(existing.createdAt).getTime() < 3600 * 1000) {
      return existing;
    }

    const provider = await this.loadFullProvider(event.paymentProviderId);
    if (provider.status !== PaymentProviderStatus.ACTIVE) {
      throw new BadRequestException('Provedor de pagamento inativo.');
    }

    const payment = this.payments.create({
      registrationId: registration.id,
      eventId: event.id,
      mentorId: event.mentorId,
      tierId: tier.id,
      providerType: provider.type,
      amountCents: tier.priceCents,
      currency: tier.currency,
      status: EventPaymentStatus.PENDING,
    });

    try {
      switch (provider.type) {
        case PaymentProviderType.ASAAS:
          await this.checkoutAsaas(provider, payment, registration, event, tier, opts.payerCpfCnpj);
          break;
        case PaymentProviderType.MERCADO_PAGO:
          await this.checkoutMercadoPago(provider, payment, registration, event, tier);
          break;
        case PaymentProviderType.STRIPE:
          await this.checkoutStripe(provider, payment, registration, event, tier);
          break;
        case PaymentProviderType.MANUAL:
          payment.checkoutUrl = provider.manualCheckoutUrl || null;
          payment.rawPayload = { instructions: provider.manualInstructions };
          break;
      }
    } catch (e: any) {
      this.logger.warn(`Checkout falhou (${provider.type}): ${e.message}`);
      throw new BadRequestException(`Falha ao gerar cobrança: ${e.message}`);
    }

    await this.payments.save(payment);
    await this.regs.update(registration.id, {
      paymentStatus: RegistrationPaymentStatus.PENDING,
      currency: tier.currency,
    });
    return payment;
  }

  // ==================== Adapters ====================
  private webhookBase() {
    return (process.env.PUBLIC_API_URL || process.env.PUBLIC_APP_URL || 'http://localhost:3001').replace(/\/$/, '');
  }

  private successUrl(event: CaptureEvent, registration: EventRegistration) {
    const base = (process.env.PUBLIC_APP_URL || 'http://localhost:5173').replace(/\/$/, '');
    return `${base}/e/${event.slug}/ticket/${registration.ticketCode}?paid=1`;
  }

  // ----- ASAAS -----
  private async checkoutAsaas(
    provider: MentorPaymentProvider,
    payment: EventPayment,
    reg: EventRegistration,
    event: CaptureEvent,
    tier: EventTicketTier,
    cpfCnpj?: string,
  ) {
    const baseUrl = provider.environment === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://sandbox.asaas.com/api/v3';
    const headers = {
      access_token: provider.apiKey!,
      'Content-Type': 'application/json',
    };

    // 1. cria/recupera cliente
    const customer = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: reg.name,
        email: reg.email,
        phone: reg.phone,
        cpfCnpj: cpfCnpj || undefined,
        externalReference: reg.id,
      }),
    }).then((r) => r.json());

    if (!customer.id) throw new Error(customer?.errors?.[0]?.description || 'Falha cliente Asaas');

    // 2. cria cobrança PIX
    const dueDate = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const charge = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customer: customer.id,
        billingType: 'PIX',
        value: tier.priceCents / 100,
        dueDate,
        description: `${event.name} — ${tier.name}`,
        externalReference: payment.id,
      }),
    }).then((r) => r.json());

    if (!charge.id) throw new Error(charge?.errors?.[0]?.description || 'Falha cobrança Asaas');

    payment.externalId = charge.id;
    payment.checkoutUrl = charge.invoiceUrl || charge.bankSlipUrl;

    // 3. busca QR code Pix
    try {
      const pix = await fetch(`${baseUrl}/payments/${charge.id}/pixQrCode`, { headers })
        .then((r) => r.json());
      payment.pixPayload = pix.payload;
      payment.pixQrImage = pix.encodedImage ? `data:image/png;base64,${pix.encodedImage}` : null;
    } catch (e: any) {
      this.logger.warn(`Asaas pix qrcode falhou: ${e.message}`);
    }
  }

  // ----- MERCADO PAGO -----
  private async checkoutMercadoPago(
    provider: MentorPaymentProvider,
    payment: EventPayment,
    reg: EventRegistration,
    event: CaptureEvent,
    tier: EventTicketTier,
  ) {
    // Cria preference (Checkout Pro)
    const pref = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider.apiKey!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            title: `${event.name} — ${tier.name}`,
            quantity: 1,
            unit_price: tier.priceCents / 100,
            currency_id: tier.currency,
          },
        ],
        payer: { name: reg.name, email: reg.email },
        external_reference: payment.id,
        notification_url: `${this.webhookBase()}/api/public/event-payments/webhook/mercado_pago`,
        back_urls: {
          success: this.successUrl(event, reg),
          pending: this.successUrl(event, reg),
          failure: this.successUrl(event, reg),
        },
        auto_return: 'approved',
      }),
    }).then((r) => r.json());

    if (!pref.id) throw new Error(pref?.message || 'Falha MP preference');
    payment.externalId = pref.id;
    payment.checkoutUrl = provider.environment === 'production' ? pref.init_point : pref.sandbox_init_point;
  }

  // ----- STRIPE (BYOK) -----
  private async checkoutStripe(
    provider: MentorPaymentProvider,
    payment: EventPayment,
    reg: EventRegistration,
    event: CaptureEvent,
    tier: EventTicketTier,
  ) {
    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('success_url', this.successUrl(event, reg));
    params.append('cancel_url', `${(process.env.PUBLIC_APP_URL || '').replace(/\/$/, '')}/e/${event.slug}`);
    params.append('customer_email', reg.email);
    params.append('client_reference_id', payment.id);
    params.append('line_items[0][quantity]', '1');
    params.append('line_items[0][price_data][currency]', tier.currency.toLowerCase());
    params.append('line_items[0][price_data][unit_amount]', String(tier.priceCents));
    params.append('line_items[0][price_data][product_data][name]', `${event.name} — ${tier.name}`);
    params.append('metadata[paymentId]', payment.id);
    params.append('metadata[registrationId]', reg.id);

    const session = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider.apiKey!}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }).then((r) => r.json());

    if (!session.id) throw new Error(session?.error?.message || 'Falha Stripe session');
    payment.externalId = session.id;
    payment.checkoutUrl = session.url;
  }

  // ==================== Webhooks ====================
  async handleAsaasWebhook(body: any) {
    // Eventos: PAYMENT_CONFIRMED, PAYMENT_RECEIVED
    const eventType = body?.event;
    const ext = body?.payment?.id;
    if (!ext) return { ok: true, ignored: 'no payment id' };
    const payment = await this.payments.findOne({ where: { externalId: ext, providerType: PaymentProviderType.ASAAS } });
    if (!payment) return { ok: true, ignored: 'unknown payment' };
    if (['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(eventType)) {
      await this.markPaid(payment, body);
    } else if (['PAYMENT_REFUNDED', 'PAYMENT_DELETED'].includes(eventType)) {
      await this.markStatus(payment, EventPaymentStatus.REFUNDED, body);
    }
    return { ok: true };
  }

  async handleMercadoPagoWebhook(body: any, query: any) {
    const id = body?.data?.id || query?.['data.id'] || query?.id;
    const type = body?.type || query?.type;
    if (type !== 'payment' || !id) return { ok: true, ignored: true };
    // busca o pagamento real no MP para descobrir external_reference
    const payment = await this.payments
      .createQueryBuilder('p')
      .where('p.providerType = :t', { t: PaymentProviderType.MERCADO_PAGO })
      .orderBy('p.createdAt', 'DESC')
      .getMany();
    // tenta carregar via API MP
    try {
      // precisamos da apiKey do mentor; busca via algum payment
      const candidate = payment[0];
      if (!candidate) return { ok: true, ignored: 'no provider' };
      const provider = await this.loadFullProvider(
        (await this.events.findOne({ where: { id: candidate.eventId } }))!.paymentProviderId!,
      );
      const mp = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: { Authorization: `Bearer ${provider.apiKey!}` },
      }).then((r) => r.json());
      const extRef = mp?.external_reference;
      const status = mp?.status;
      if (!extRef) return { ok: true, ignored: 'no external_reference' };
      const target = await this.payments.findOne({ where: { id: extRef } });
      if (!target) return { ok: true, ignored: 'unknown' };
      target.externalId = String(id);
      if (status === 'approved') await this.markPaid(target, mp);
      else if (status === 'refunded') await this.markStatus(target, EventPaymentStatus.REFUNDED, mp);
      else target.rawPayload = mp;
      await this.payments.save(target);
    } catch (e: any) {
      this.logger.warn(`MP webhook erro: ${e.message}`);
    }
    return { ok: true };
  }

  async handleStripeWebhook(body: any) {
    const type = body?.type;
    const obj = body?.data?.object;
    if (!obj) return { ok: true };
    if (type === 'checkout.session.completed' || type === 'checkout.session.async_payment_succeeded') {
      const refId = obj.client_reference_id || obj.metadata?.paymentId;
      if (refId) {
        const payment = await this.payments.findOne({ where: { id: refId } });
        if (payment) await this.markPaid(payment, body);
      }
    } else if (type === 'charge.refunded') {
      const payment = await this.payments.findOne({ where: { externalId: obj.payment_intent, providerType: PaymentProviderType.STRIPE } });
      if (payment) await this.markStatus(payment, EventPaymentStatus.REFUNDED, body);
    }
    return { ok: true };
  }

  /** Marca manualmente um pagamento como pago (usado pelo mentor para manual). */
  async markPaymentManually(mentorId: string, paymentId: string) {
    const p = await this.payments.findOne({ where: { id: paymentId, mentorId } });
    if (!p) throw new NotFoundException('Pagamento não encontrado');
    await this.markPaid(p, { manualBy: mentorId, at: new Date() });
    return { ok: true };
  }

  private async markPaid(payment: EventPayment, raw: any) {
    payment.status = EventPaymentStatus.PAID;
    payment.paidAt = new Date();
    payment.rawPayload = raw;
    await this.payments.save(payment);
    await this.regs.update(payment.registrationId, {
      paymentStatus: RegistrationPaymentStatus.PAID,
      amountPaidCents: payment.amountCents,
      paidAt: payment.paidAt,
    });
    if (payment.tierId) {
      await this.tiers.increment({ id: payment.tierId } as any, 'sold', 1);
    }
  }

  private async markStatus(payment: EventPayment, status: EventPaymentStatus, raw: any) {
    payment.status = status;
    payment.rawPayload = raw;
    await this.payments.save(payment);
    if (status === EventPaymentStatus.REFUNDED) {
      await this.regs.update(payment.registrationId, { paymentStatus: RegistrationPaymentStatus.REFUNDED });
    }
  }

  // ==================== Helpers para o módulo de eventos ====================
  async getPaymentsForRegistration(registrationId: string) {
    return this.payments.find({ where: { registrationId }, order: { createdAt: 'DESC' } });
  }

  async getEventPayments(eventId: string) {
    return this.payments.find({ where: { eventId }, order: { createdAt: 'DESC' } });
  }
}
