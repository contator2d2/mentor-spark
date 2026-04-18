import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStage } from '../../entities/lead.entity';
import { TestResponse } from '../../entities/test-response.entity';
import { Meeting } from '../../entities/meeting.entity';
import { Task } from '../../entities/task.entity';
import { User, UserRole } from '../../entities/user.entity';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';

/** Prontuário unificado do mentorado: lead + testes + reuniões + tarefas + linha do tempo */
@Controller('dossier')
export class DossierController {
  constructor(
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectRepository(TestResponse) private responses: Repository<TestResponse>,
    @InjectRepository(Meeting) private meetings: Repository<Meeting>,
    @InjectRepository(Task) private tasks: Repository<Task>,
    @InjectRepository(User) private users: Repository<User>,
  ) {}

  @Auth('mentor', 'super_admin')
  @Get('lead/:id')
  async byLead(@TenantId() mentorId: string, @Param('id') leadIdOrUserId: string) {
    let lead = await this.leads.findOne({ where: { id: leadIdOrUserId, mentorId } });

    if (!lead) {
      const user = await this.users.findOne({ where: { id: leadIdOrUserId, mentorId } });
      if (user) {
        lead = await this.leads.findOne({
          where: [
            { mentorId, userId: user.id },
            { mentorId, email: user.email.toLowerCase() },
          ],
        });

        if (!lead) {
          lead = await this.leads.save(
            this.leads.create({
              mentorId,
              userId: user.id,
              name: user.name,
              email: user.email.toLowerCase(),
              phone: user.phone,
              company: user.company,
              source: 'manual',
              stage: user.role === UserRole.MENTORADO ? LeadStage.CLIENT : LeadStage.NEW,
            }),
          );
        } else if (!lead.userId) {
          lead.userId = user.id;
          await this.leads.save(lead);
        }
      }
    }

    if (!lead) throw new NotFoundException('Lead não encontrado');

    const leadId = lead.id;
    const [tests, meetings, tasks, account] = await Promise.all([
      this.responses.find({ where: { leadId, mentorId }, order: { createdAt: 'DESC' }, relations: ['template'] }),
      this.meetings.find({ where: { leadId, mentorId }, order: { scheduledAt: 'DESC' } }),
      this.tasks.find({ where: { leadId, mentorId }, order: { createdAt: 'DESC' } }),
      lead.userId ? this.users.findOne({ where: { id: lead.userId } }) : Promise.resolve(null),
    ]);

    const timeline: Array<{ type: string; at: Date; title: string; ref: string; meta?: any }> = [];
    timeline.push({ type: 'lead_created', at: lead.createdAt, title: 'Lead capturado', ref: lead.id, meta: { source: lead.source } });
    tests.forEach((t) =>
      timeline.push({
        type: 'test_response',
        at: t.createdAt,
        title: `Teste: ${t.template?.title || 'Sem título'} — ${t.scorePct}%`,
        ref: t.id,
        meta: { classification: t.classification, scorePct: Number(t.scorePct) },
      }),
    );
    meetings.forEach((m) =>
      timeline.push({ type: 'meeting', at: m.scheduledAt, title: `Reunião: ${m.title}`, ref: m.id, meta: { status: m.status } }),
    );
    tasks.forEach((t) =>
      timeline.push({ type: 'task', at: t.createdAt, title: `Tarefa: ${t.title}`, ref: t.id, meta: { status: t.status } }),
    );
    timeline.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return {
      lead,
      account: account ? { id: account.id, email: account.email, status: account.status, role: account.role } : null,
      stats: {
        testsCount: tests.length,
        meetingsCount: meetings.length,
        tasksCount: tasks.length,
        avgScore: tests.length ? Math.round(tests.reduce((s, t) => s + Number(t.scorePct), 0) / tests.length) : null,
      },
      tests,
      meetings,
      tasks,
      timeline,
    };
  }
}
