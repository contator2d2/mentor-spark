import { Controller, Get, Param, Patch, Post, Body, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User, UserRole, UserStatus } from '../../entities/user.entity';
import { Lead } from '../../entities/lead.entity';
import { TestResponse } from '../../entities/test-response.entity';
import { Meeting } from '../../entities/meeting.entity';
import { Plan } from '../../entities/plan.entity';
import { Subscription, SubscriptionStatus } from '../../entities/subscription.entity';
import { Charge, ChargeStatus, ChargeMethod } from '../../entities/charge.entity';
import { Auth } from '../auth/auth.decorators';
import { AuthService } from '../auth/auth.service';
import { AsaasService } from '../billing/asaas.service';

@Controller('admin')
export class AdminController {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectRepository(TestResponse) private responses: Repository<TestResponse>,
    @InjectRepository(Meeting) private meetings: Repository<Meeting>,
    @InjectRepository(Plan) private plans: Repository<Plan>,
    @InjectRepository(Subscription) private subs: Repository<Subscription>,
    @InjectRepository(Charge) private charges: Repository<Charge>,
    @Inject(forwardRef(() => AuthService)) private authService: AuthService,
    private asaas: AsaasService,
  ) {}

  /** Lista mentores com plano resolvido e métricas básicas para a tela de aprovação. */
  @Auth('super_admin')
  @Get('mentors')
  async list() {
    const mentors = await this.users.find({
      where: { role: UserRole.MENTOR },
      order: { createdAt: 'DESC' },
    });
    if (mentors.length === 0) return [];

    const planIds = Array.from(new Set(mentors.map((m) => m.planId).filter(Boolean))) as string[];
    const plansList = planIds.length
      ? await this.plans.find({ where: { id: In(planIds) } })
      : [];
    const planMap = new Map(plansList.map((p) => [p.id, p]));

    return mentors.map((m) => {
      const plan = m.planId ? planMap.get(m.planId) : null;
      const isExpired = !!m.planExpiresAt && new Date(m.planExpiresAt) < new Date();
      return {
        id: m.id,
        name: m.name,
        email: m.email,
        phone: m.phone,
        brandName: m.brandName,
        brandLogoUrl: m.brandLogoUrl,
        slug: m.slug,
        status: m.status,
        createdAt: m.createdAt,
        planId: m.planId || null,
        planName: plan?.name || null,
        planPriceMonthly: plan ? Number(plan.priceMonthly) : 0,
        planExpiresAt: m.planExpiresAt || null,
        planBillingType: m.planBillingType || null,
        planPaymentMethods: m.planPaymentMethods || [],
        planDueDay: m.planDueDay || null,
        planAmount: m.planAmount != null ? Number(m.planAmount) : null,
        planNotes: m.planNotes || null,
        isExpired,
      };
    });
  }

  /** View multi-tenant: lista todos os mentores com métricas agregadas */
  @Auth('super_admin')
  @Get('tenants')
  async tenants() {
    const mentors = await this.users.find({
      where: { role: UserRole.MENTOR },
      order: { createdAt: 'DESC' },
    });

    const result = await Promise.all(
      mentors.map(async (m) => {
        const [leadsCount, mentoradosCount, testsCount, meetingsCount] = await Promise.all([
          this.leads.count({ where: { mentorId: m.id } }),
          this.users.count({ where: { mentorId: m.id, role: UserRole.MENTORADO } }),
          this.responses.count({ where: { mentorId: m.id } }),
          this.meetings.count({ where: { mentorId: m.id } }),
        ]);
        return {
          id: m.id,
          name: m.name,
          email: m.email,
          slug: m.slug,
          brandName: m.brandName,
          brandLogoUrl: m.brandLogoUrl,
          brandBannerUrl: m.brandBannerUrl,
          brandMobileBannerUrl: m.brandMobileBannerUrl,
          brandPrimaryColor: m.brandPrimaryColor,
          brandAccentColor: m.brandAccentColor,
          customDomain: m.customDomain,
          status: m.status,
          createdAt: m.createdAt,
          metrics: { leads: leadsCount, mentorados: mentoradosCount, tests: testsCount, meetings: meetingsCount },
        };
      }),
    );
    return result;
  }

  @Auth('super_admin')
  @Patch('mentors/:id/status')
  async setStatus(@Param('id') id: string, @Body() body: { status: UserStatus }) {
    await this.users.update(id, { status: body.status });
    return this.users.findOne({ where: { id } });
  }

  /** Atualiza o mentor: plano, expiração e/ou status numa única chamada. */
  @Auth('super_admin')
  @Patch('mentors/:id')
  async updateMentor(
    @Param('id') id: string,
    @Body()
    body: {
      planId?: string | null;
      planExpiresAt?: string | null;
      status?: UserStatus;
      planBillingType?: 'monthly' | 'upfront' | null;
      planPaymentMethods?: string[];
      planDueDay?: number | null;
      planAmount?: number | null;
      planNotes?: string | null;
      customDomain?: string | null;
      slug?: string | null;
    },
  ) {
    const patch: any = {};
    if (body.planId !== undefined) patch.planId = body.planId || null;
    if (body.planExpiresAt !== undefined) {
      patch.planExpiresAt = body.planExpiresAt ? new Date(body.planExpiresAt) : null;
    }
    if (body.status) patch.status = body.status;
    if (body.planBillingType !== undefined) patch.planBillingType = body.planBillingType || null;
    if (body.planPaymentMethods !== undefined) patch.planPaymentMethods = body.planPaymentMethods || [];
    if (body.planDueDay !== undefined) {
      patch.planDueDay = body.planDueDay ? Math.max(1, Math.min(28, Number(body.planDueDay))) : null;
    }
    if (body.planAmount !== undefined) patch.planAmount = body.planAmount != null ? Number(body.planAmount) : null;
    if (body.planNotes !== undefined) patch.planNotes = body.planNotes || null;
    if (body.customDomain !== undefined) {
      const normalized = (body.customDomain || '')
        .toLowerCase()
        .trim()
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '');
      if (normalized) {
        const existing = await this.users.findOne({ where: { customDomain: normalized } });
        if (existing && existing.id !== id) {
          throw new BadRequestException(
            `Domínio já vinculado à conta "${existing.email}". Remova de lá primeiro.`,
          );
        }
        patch.customDomain = normalized;
      } else {
        patch.customDomain = null;
      }
    }
    if (body.slug !== undefined) {
      const normalized = (body.slug || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);
      if (normalized) {
        const existing = await this.users.findOne({ where: { slug: normalized } });
        if (existing && existing.id !== id) {
          throw new BadRequestException(`Slug "${normalized}" já em uso por outra conta.`);
        }
        patch.slug = normalized;
      } else {
        patch.slug = null;
      }
    }
    await this.users.update(id, patch);
    return this.users.findOne({ where: { id } });
  }

  /** Resumo completo de um tenant (mentor) para a tela de gestão. */
  @Auth('super_admin')
  @Get('tenants/:id')
  async tenantDetail(@Param('id') id: string) {
    const m = await this.users.findOne({ where: { id } });
    if (!m) throw new NotFoundException('Mentor não encontrado');
    const [leadsCount, mentoradosCount, testsCount, meetingsCount, teamCount, recentCharges] = await Promise.all([
      this.leads.count({ where: { mentorId: m.id } }),
      this.users.count({ where: { mentorId: m.id, role: UserRole.MENTORADO } }),
      this.responses.count({ where: { mentorId: m.id } }),
      this.meetings.count({ where: { mentorId: m.id } }),
      this.users.count({ where: { parentMentorId: m.id, role: UserRole.MENTOR_TEAM } }),
      this.charges.find({ where: { mentorId: m.id }, order: { createdAt: 'DESC' }, take: 10 }),
    ]);
    const plan = m.planId ? await this.plans.findOne({ where: { id: m.planId } }) : null;
    return {
      id: m.id,
      name: m.name,
      email: m.email,
      phone: m.phone,
      role: m.role,
      status: m.status,
      slug: m.slug,
      brandName: m.brandName,
      brandLogoUrl: m.brandLogoUrl,
      brandBannerUrl: m.brandBannerUrl,
      brandMobileBannerUrl: m.brandMobileBannerUrl,
      brandPrimaryColor: m.brandPrimaryColor,
      brandAccentColor: m.brandAccentColor,
      customDomain: m.customDomain,
      mustChangePassword: m.mustChangePassword,
      credentialsSentAt: m.credentialsSentAt,
      onboardingCompleted: m.onboardingCompleted,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      planId: m.planId || null,
      planName: plan?.name || null,
      planPriceMonthly: plan ? Number(plan.priceMonthly) : 0,
      planExpiresAt: m.planExpiresAt || null,
      planBillingType: m.planBillingType || null,
      planAmount: m.planAmount != null ? Number(m.planAmount) : null,
      planDueDay: m.planDueDay || null,
      planNotes: m.planNotes || null,
      metrics: { leads: leadsCount, mentorados: mentoradosCount, tests: testsCount, meetings: meetingsCount, team: teamCount },
      recentCharges: recentCharges.map((c) => ({
        id: c.id, description: c.description, amount: Number(c.amount),
        status: c.status, method: c.method, dueDate: c.dueDate, paidAt: c.paidAt,
        invoiceUrl: c.invoiceUrl,
      })),
    };
  }

  /** Reseta a senha do mentor: gera nova temp e envia por email/WhatsApp. */
  @Auth('super_admin')
  @Post('users/:id/reset-password')
  async resetPassword(@Param('id') id: string) {
    return this.authService.adminResetPassword(id);
  }

  /** Login impersonate: super admin recebe um JWT do usuário-alvo. */
  @Auth('super_admin')
  @Post('users/:id/impersonate')
  async impersonate(@Param('id') id: string) {
    return this.authService.adminImpersonate(id);
  }

  /** Muda role do usuário (corrige casos onde mentorado virou super_admin por engano). */
  @Auth('super_admin')
  @Patch('users/:id/role')
  async changeRole(@Param('id') id: string, @Body() body: { role: UserRole; mentorId?: string | null }) {
    const validRoles: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.MENTOR, UserRole.MENTOR_TEAM, UserRole.MENTORADO, UserRole.PROSPECT];
    if (!validRoles.includes(body.role)) throw new BadRequestException('Role inválida');
    const patch: any = { role: body.role };
    if (body.mentorId !== undefined) patch.mentorId = body.mentorId || null;
    // Limpa parentMentorId se não for team
    if (body.role !== UserRole.MENTOR_TEAM) patch.parentMentorId = null;
    await this.users.update(id, patch);
    return this.users.findOne({ where: { id } });
  }

  /** Dispara cobrança da mensalidade do plano SaaS para um mentor específico. */
  @Auth('super_admin')
  @Post('mentors/:id/charge-plan')
  async chargePlan(
    @Param('id') id: string,
    @Body() body: { method?: 'pix' | 'boleto' | 'credit_card'; dueDate?: string; amount?: number; description?: string; createInAsaas?: boolean },
  ) {
    const mentor = await this.users.findOne({ where: { id } });
    if (!mentor) throw new NotFoundException('Mentor não encontrado');
    const plan = mentor.planId ? await this.plans.findOne({ where: { id: mentor.planId } }) : null;
    const amount = body.amount ?? (mentor.planAmount != null ? Number(mentor.planAmount) : (plan ? Number(plan.priceMonthly) : 0));
    if (!amount || amount <= 0) throw new BadRequestException('Valor inválido — defina planAmount ou amount no body.');
    const dueDate = body.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const description = body.description || `Mensalidade ${plan?.name || 'Plano'} — ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;
    const method = (body.method || 'pix') as ChargeMethod;

    let asaasData: any = null;
    if (body.createInAsaas) {
      try {
        const customer = await this.asaas.upsertCustomer({
          name: mentor.name,
          email: mentor.email,
          phone: mentor.phone,
          externalReference: `mentor:${mentor.id}`,
        });
        const billingMap: any = { pix: 'PIX', boleto: 'BOLETO', credit_card: 'CREDIT_CARD' };
        asaasData = await this.asaas.createCharge({
          customer: customer.id,
          billingType: billingMap[method] || 'PIX',
          value: amount,
          dueDate,
          description,
          externalReference: `platform:mentor:${mentor.id}`,
        });
      } catch (e: any) {
        // segue mesmo se falhar — cria a charge interna
      }
    }

    const charge = this.charges.create({
      mentorId: mentor.id,
      leadId: null as any,
      description,
      amount,
      dueDate,
      method,
      status: ChargeStatus.PENDING,
      asaasChargeId: asaasData?.id,
      invoiceUrl: asaasData?.invoiceUrl,
      bankSlipUrl: asaasData?.bankSlipUrl,
      metadata: { type: 'platform_subscription', planId: mentor.planId },
    });
    const saved = await this.charges.save(charge);

    if (asaasData?.id && method === ChargeMethod.PIX) {
      try {
        const qr = await this.asaas.getPixQrCode(asaasData.id);
        saved.pixQrCode = qr.encodedImage;
        saved.pixCopyPaste = qr.payload;
        await this.charges.save(saved);
      } catch {}
    }

    return saved;
  }

  /** Dashboard financeiro consolidado da plataforma. */
  @Auth('super_admin')
  @Get('finance')
  async finance() {
    const mentors = await this.users.find({ where: { role: UserRole.MENTOR } });
    const allPlans = await this.plans.find();
    const planMap = new Map(allPlans.map((p) => [p.id, p]));

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    let mrr = 0;
    let activePaying = 0;
    let trialing = 0;
    let suspended = 0;
    let pending = 0;
    const byPlan: Record<string, { planId: string; name: string; price: number; count: number; mrr: number }> = {};
    const upcoming: Array<{
      mentorId: string;
      mentorName: string;
      mentorEmail: string;
      planName: string;
      amount: number;
      dueAt: string;
      daysUntil: number;
    }> = [];

    for (const m of mentors) {
      if (m.status === UserStatus.SUSPENDED) suspended++;
      if (m.status === UserStatus.PENDING) pending++;

      const plan = m.planId ? planMap.get(m.planId) : null;
      const isExpired = !!m.planExpiresAt && new Date(m.planExpiresAt) < now;

      if (plan && !isExpired && m.status === UserStatus.ACTIVE) {
        const price = Number(plan.priceMonthly) || 0;
        if (price > 0) {
          mrr += price;
          activePaying++;
        } else {
          trialing++;
        }
        const key = plan.id;
        if (!byPlan[key]) {
          byPlan[key] = { planId: plan.id, name: plan.name, price, count: 0, mrr: 0 };
        }
        byPlan[key].count++;
        byPlan[key].mrr += price;

        // Próximas cobranças: usa planExpiresAt como data da próxima renovação
        if (m.planExpiresAt && price > 0) {
          const due = new Date(m.planExpiresAt);
          const daysUntil = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntil >= -7 && daysUntil <= 60) {
            upcoming.push({
              mentorId: m.id,
              mentorName: m.name,
              mentorEmail: m.email,
              planName: plan.name,
              amount: price,
              dueAt: due.toISOString(),
              daysUntil,
            });
          }
        }
      }
    }

    upcoming.sort((a, b) => a.daysUntil - b.daysUntil);

    // Novos mentores no mês (proxy de growth)
    const newThisMonth = mentors.filter(
      (m) => new Date(m.createdAt) >= startOfMonth && new Date(m.createdAt) <= endOfMonth,
    ).length;

    // Receita projetada do mês baseada em renovações dentro do período + MRR atual
    const expectedThisMonth = upcoming
      .filter((u) => {
        const d = new Date(u.dueAt);
        return d >= startOfMonth && d <= endOfMonth;
      })
      .reduce((s, u) => s + u.amount, 0);

    return {
      summary: {
        mrr,
        arr: mrr * 12,
        activePaying,
        trialing,
        pending,
        suspended,
        totalMentors: mentors.length,
        newThisMonth,
        expectedThisMonth,
        avgRevenuePerMentor: activePaying > 0 ? mrr / activePaying : 0,
      },
      byPlan: Object.values(byPlan).sort((a, b) => b.mrr - a.mrr),
      upcoming: upcoming.slice(0, 50),
      generatedAt: now.toISOString(),
    };
  }
}
