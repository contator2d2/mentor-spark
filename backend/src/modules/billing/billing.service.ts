import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, SubscriptionStatus } from '../../entities/subscription.entity';
import { Plan } from '../../entities/plan.entity';
import { User } from '../../entities/user.entity';

/**
 * Integração Stripe (modelo plataforma única).
 * Lê STRIPE_SECRET_KEY e STRIPE_WEBHOOK_SECRET das envs.
 * Usa REST direto (sem SDK pra manter dependências enxutas).
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(Subscription) private subs: Repository<Subscription>,
    @InjectRepository(Plan) private plans: Repository<Plan>,
    @InjectRepository(User) private users: Repository<User>,
  ) {}

  private get apiKey() {
    const k = process.env.STRIPE_SECRET_KEY;
    if (!k) throw new BadRequestException('STRIPE_SECRET_KEY não configurada');
    return k;
  }

  private async stripeReq(path: string, method: 'GET' | 'POST' | 'DELETE' = 'POST', body?: Record<string, any>) {
    const url = `https://api.stripe.com/v1${path}`;
    const init: any = { method, headers: { Authorization: `Bearer ${this.apiKey}` } };
    if (body) {
      const params = new URLSearchParams();
      const flatten = (obj: any, prefix = '') => {
        for (const [k, v] of Object.entries(obj)) {
          if (v === undefined || v === null) continue;
          const key = prefix ? `${prefix}[${k}]` : k;
          if (typeof v === 'object' && !Array.isArray(v)) flatten(v, key);
          else params.append(key, String(v));
        }
      };
      flatten(body);
      init.body = params.toString();
      init.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    const r = await fetch(url, init);
    const json: any = await r.json();
    if (!r.ok) throw new Error(json?.error?.message || `Stripe ${r.status}`);
    return json;
  }

  /** Garante customer Stripe pro mentor */
  async ensureCustomer(mentorId: string): Promise<string> {
    const u = await this.users.findOne({ where: { id: mentorId } });
    if (!u) throw new BadRequestException('Mentor não encontrado');
    if (u.stripeCustomerId) return u.stripeCustomerId;
    const c = await this.stripeReq('/customers', 'POST', {
      email: u.email,
      name: u.name,
      metadata: { mentorId },
    });
    await this.users.update(mentorId, { stripeCustomerId: c.id });
    return c.id;
  }

  /** Cria sessão de checkout pro plano escolhido */
  async createCheckoutSession(mentorId: string, planId: string, successUrl: string, cancelUrl: string) {
    const plan = await this.plans.findOne({ where: { id: planId } });
    if (!plan) throw new BadRequestException('Plano não encontrado');
    if (!plan.stripePriceId) throw new BadRequestException('Plano sem stripePriceId configurado');
    const customer = await this.ensureCustomer(mentorId);
    const session = await this.stripeReq('/checkout/sessions', 'POST', {
      customer,
      mode: 'subscription',
      'line_items[0][price]': plan.stripePriceId,
      'line_items[0][quantity]': 1,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { mentorId, planId },
      'subscription_data[metadata][mentorId]': mentorId,
      'subscription_data[metadata][planId]': planId,
    });
    return { url: session.url, sessionId: session.id };
  }

  /** Sessão do customer portal pra gerenciar assinatura */
  async createPortalSession(mentorId: string, returnUrl: string) {
    const customer = await this.ensureCustomer(mentorId);
    const session = await this.stripeReq('/billing_portal/sessions', 'POST', {
      customer,
      return_url: returnUrl,
    });
    return { url: session.url };
  }

  /** Processa eventos do webhook Stripe */
  async handleWebhook(event: any) {
    const type = event.type;
    const obj = event.data?.object || {};
    this.logger.log(`Stripe webhook: ${type}`);

    if (type === 'checkout.session.completed') {
      const mentorId = obj.metadata?.mentorId;
      const planId = obj.metadata?.planId;
      const subId = obj.subscription;
      if (mentorId && planId && subId) {
        const sub = await this.stripeReq(`/subscriptions/${subId}`, 'GET');
        await this.upsertSubscription({
          mentorId,
          planId,
          stripeCustomerId: obj.customer,
          stripeSubscriptionId: subId,
          stripePriceId: sub.items?.data?.[0]?.price?.id,
          status: this.mapStatus(sub.status),
          currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : undefined,
          cancelAtPeriodEnd: !!sub.cancel_at_period_end,
        });
        await this.users.update(mentorId, { planId, planExpiresAt: sub.current_period_end ? new Date(sub.current_period_end * 1000) : undefined });
      }
    }

    if (type === 'customer.subscription.updated' || type === 'customer.subscription.deleted') {
      const subId = obj.id;
      const local = await this.subs.findOne({ where: { stripeSubscriptionId: subId } });
      if (local) {
        local.status = this.mapStatus(obj.status);
        local.currentPeriodEnd = obj.current_period_end ? new Date(obj.current_period_end * 1000) : undefined;
        local.cancelAtPeriodEnd = !!obj.cancel_at_period_end;
        await this.subs.save(local);
        await this.users.update(local.mentorId, {
          planExpiresAt: local.currentPeriodEnd,
          // se cancelada de fato, libera o planId? mantém até expiração
        });
      }
    }
    return { received: true };
  }

  private mapStatus(s: string): SubscriptionStatus {
    const m: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      trialing: SubscriptionStatus.TRIALING,
      past_due: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELED,
      incomplete: SubscriptionStatus.INCOMPLETE,
    };
    return m[s] || SubscriptionStatus.INCOMPLETE;
  }

  private async upsertSubscription(dto: Partial<Subscription>) {
    let sub = dto.stripeSubscriptionId
      ? await this.subs.findOne({ where: { stripeSubscriptionId: dto.stripeSubscriptionId } })
      : null;
    if (!sub) sub = this.subs.create();
    Object.assign(sub, dto);
    return this.subs.save(sub);
  }

  /** Status atual de assinatura do mentor */
  async getMentorSubscription(mentorId: string) {
    const sub = await this.subs.findOne({ where: { mentorId }, order: { createdAt: 'DESC' } });
    return sub;
  }
}
