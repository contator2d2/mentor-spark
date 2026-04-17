import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStage } from '../../entities/lead.entity';
import { Meeting } from '../../entities/meeting.entity';
import { TestResponse } from '../../entities/test-response.entity';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';

@Controller('dashboard')
export class DashboardController {
  constructor(
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectRepository(Meeting) private meetings: Repository<Meeting>,
    @InjectRepository(TestResponse) private responses: Repository<TestResponse>,
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
}
