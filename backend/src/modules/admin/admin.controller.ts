import { Controller, Get, Param, Patch, Body } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from '../../entities/user.entity';
import { Lead } from '../../entities/lead.entity';
import { TestResponse } from '../../entities/test-response.entity';
import { Meeting } from '../../entities/meeting.entity';
import { Auth } from '../auth/auth.decorators';

@Controller('admin')
export class AdminController {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectRepository(TestResponse) private responses: Repository<TestResponse>,
    @InjectRepository(Meeting) private meetings: Repository<Meeting>,
  ) {}

  @Auth('super_admin')
  @Get('mentors')
  list() {
    return this.users.find({ where: { role: UserRole.MENTOR }, order: { createdAt: 'DESC' } });
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
}
