import { Controller, Get, Param, Patch, Body } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User, UserRole, UserStatus } from '../../entities/user.entity';
import { Lead } from '../../entities/lead.entity';
import { TestResponse } from '../../entities/test-response.entity';
import { Meeting } from '../../entities/meeting.entity';
import { Plan } from '../../entities/plan.entity';
import { Subscription, SubscriptionStatus } from '../../entities/subscription.entity';
import { Auth } from '../auth/auth.decorators';

@Controller('admin')
export class AdminController {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectRepository(TestResponse) private responses: Repository<TestResponse>,
    @InjectRepository(Meeting) private meetings: Repository<Meeting>,
    @InjectRepository(Plan) private plans: Repository<Plan>,
    @InjectRepository(Subscription) private subs: Repository<Subscription>,
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
          brandPrimaryColor: m.brandPrimaryColor,
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
    },
  ) {
    const patch: any = {};
    if (body.planId !== undefined) patch.planId = body.planId || null;
    if (body.planExpiresAt !== undefined) {
      patch.planExpiresAt = body.planExpiresAt ? new Date(body.planExpiresAt) : null;
    }
    if (body.status) patch.status = body.status;
    await this.users.update(id, patch);
    return this.users.findOne({ where: { id } });
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
