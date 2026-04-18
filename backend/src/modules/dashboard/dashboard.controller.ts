import { Controller, Get, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStage } from '../../entities/lead.entity';
import { Meeting } from '../../entities/meeting.entity';
import { TestResponse } from '../../entities/test-response.entity';
import { Charge, ChargeStatus } from '../../entities/charge.entity';
import { MentorSubscription, SubscriptionStatus } from '../../entities/mentor-subscription.entity';
import { Booking, BookingStatus } from '../../entities/booking.entity';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';

@Controller('dashboard')
export class DashboardController {
  constructor(
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectRepository(Meeting) private meetings: Repository<Meeting>,
    @InjectRepository(TestResponse) private responses: Repository<TestResponse>,
    @InjectRepository(Charge) private charges: Repository<Charge>,
    @InjectRepository(MentorSubscription) private subs: Repository<MentorSubscription>,
    @InjectRepository(Booking) private bookings: Repository<Booking>,
  ) {}

  @Auth('mentor', 'super_admin')
  @Get()
  async overview(@TenantId() mentorId: string) {
    const [totalLeads, clients, meetings, tests] = await Promise.all([
      this.leads.count({ where: { mentorId } }),
      this.leads.count({ where: { mentorId, stage: LeadStage.CLIENT } }),
      this.meetings.count({ where: { mentorId } }),
      this.responses.count({ where: { mentorId } }),
    ]);
    const conversion = totalLeads ? Math.round((clients / totalLeads) * 1000) / 10 : 0;

    const tempCounts = await this.leads
      .createQueryBuilder('l')
      .select('l.temperature', 'temperature')
      .addSelect('COUNT(*)', 'count')
      .where('l.mentorId = :mentorId AND l.temperature IS NOT NULL', { mentorId })
      .groupBy('l.temperature')
      .getRawMany();

    const temperature: Record<string, number> = { cold: 0, warm: 0, hot: 0 };
    tempCounts.forEach((r) => (temperature[r.temperature] = +r.count));

    return { totalLeads, clients, meetings, tests, conversion, temperature };
  }

  /**
   * Analytics avançado:
   * - Funil por estágio
   * - Evolução de leads/mentorados nos últimos N dias
   * - MRR, receita acumulada, inadimplência
   * - LTV médio (receita total / nº de mentorados ativos)
   * - Bookings por status
   */
  @Auth('mentor', 'super_admin')
  @Get('analytics')
  async analytics(@TenantId() mentorId: string, @Query('days') daysStr?: string) {
    const days = Math.min(Math.max(parseInt(daysStr || '30', 10) || 30, 7), 365);
    const since = new Date(Date.now() - days * 86_400_000);

    // Funil
    const funnelRaw = await this.leads
      .createQueryBuilder('l')
      .select('l.stage', 'stage')
      .addSelect('COUNT(*)', 'count')
      .where('l.mentorId = :m', { m: mentorId })
      .groupBy('l.stage')
      .getRawMany();
    const funnel: Record<string, number> = { new: 0, tested: 0, engaged: 0, negotiating: 0, client: 0, lost: 0 };
    funnelRaw.forEach((r) => (funnel[r.stage] = +r.count));

    // Evolução leads/mentorados por dia
    const leadsByDay = await this.leads
      .createQueryBuilder('l')
      .select(`TO_CHAR(l.createdAt, 'YYYY-MM-DD')`, 'day')
      .addSelect('COUNT(*)', 'count')
      .where('l.mentorId = :m AND l.createdAt >= :since', { m: mentorId, since })
      .groupBy('day')
      .orderBy('day', 'ASC')
      .getRawMany();

    const clientsByDay = await this.leads
      .createQueryBuilder('l')
      .select(`TO_CHAR(l.updatedAt, 'YYYY-MM-DD')`, 'day')
      .addSelect('COUNT(*)', 'count')
      .where('l.mentorId = :m AND l.stage = :s AND l.updatedAt >= :since', { m: mentorId, s: LeadStage.CLIENT, since })
      .groupBy('day')
      .orderBy('day', 'ASC')
      .getRawMany();

    // Receita
    const allCharges = await this.charges.find({ where: { mentorId } });
    const paidCharges = allCharges.filter((c) => c.status === ChargeStatus.PAID);
    const totalRevenue = paidCharges.reduce((a, b) => a + Number(b.amount), 0);
    const overdue = allCharges.filter((c) => c.status === ChargeStatus.OVERDUE).reduce((a, b) => a + Number(b.amount), 0);
    const pending = allCharges.filter((c) => c.status === ChargeStatus.PENDING).reduce((a, b) => a + Number(b.amount), 0);

    // Receita por mês (últimos 12)
    const revenueByMonth: Record<string, number> = {};
    const monthsBack = 12;
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      revenueByMonth[k] = 0;
    }
    paidCharges.forEach((c) => {
      const dt = c.paidAt || new Date(c.dueDate);
      const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      if (k in revenueByMonth) revenueByMonth[k] += Number(c.amount);
    });

    // MRR
    const activeSubs = await this.subs.find({ where: { mentorId, status: SubscriptionStatus.ACTIVE } });
    const mrr = activeSubs.reduce((a, b) => a + Number(b.amount), 0);

    // LTV
    const activeClientsCount = await this.leads.count({ where: { mentorId, stage: LeadStage.CLIENT } });
    const ltv = activeClientsCount > 0 ? Math.round((totalRevenue / activeClientsCount) * 100) / 100 : 0;

    // Bookings
    const bookingsByStatus = await this.bookings
      .createQueryBuilder('b')
      .select('b.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('b.mentorId = :m', { m: mentorId })
      .groupBy('b.status')
      .getRawMany();

    return {
      funnel,
      timeseries: {
        leads: leadsByDay.map((r) => ({ day: r.day, count: +r.count })),
        clients: clientsByDay.map((r) => ({ day: r.day, count: +r.count })),
      },
      revenue: {
        total: totalRevenue,
        mrr,
        overdue,
        pending,
        ltv,
        byMonth: Object.entries(revenueByMonth).map(([month, value]) => ({ month, value })),
      },
      bookings: bookingsByStatus.map((r) => ({ status: r.status, count: +r.count })),
      activeClients: activeClientsCount,
    };
  }
}
