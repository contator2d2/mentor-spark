import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MentoredRecord, MentoredStage } from '../../entities/mentored-record.entity';
import { Lead, LeadStage } from '../../entities/lead.entity';
import { User, UserRole } from '../../entities/user.entity';
import { TestResponse } from '../../entities/test-response.entity';
import { Meeting } from '../../entities/meeting.entity';
import { Task, TaskStatus } from '../../entities/task.entity';
import { ProntuarioAlertsService } from './prontuario-alerts.service';

@Injectable()
export class ProntuarioService {
  constructor(
    @InjectRepository(MentoredRecord) private records: Repository<MentoredRecord>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(TestResponse) private responses: Repository<TestResponse>,
    @InjectRepository(Meeting) private meetings: Repository<Meeting>,
    @InjectRepository(Task) private tasks: Repository<Task>,
    private alertsService: ProntuarioAlertsService,
  ) {}

  /**
   * Resolve um identificador (que pode ser leadId OU userId) para um Lead do mentor.
   * Se não houver Lead mas existir um User vinculado, cria o Lead automaticamente.
   */
  private async resolveLead(mentorId: string, idOrUserId: string): Promise<Lead> {
    let lead = await this.leads.findOne({ where: { id: idOrUserId, mentorId } });
    if (lead) return lead;

    const user = await this.users.findOne({ where: { id: idOrUserId, mentorId } });
    if (!user) throw new NotFoundException('Lead não encontrado');

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
      lead = await this.leads.save(lead);
    }
    return lead;
  }

  /** Garante existência de MentoredRecord para o lead */
  async ensureRecord(mentorId: string, lead: Lead): Promise<MentoredRecord> {
    let rec = await this.records.findOne({ where: { mentorId, leadId: lead.id } });
    if (rec) return rec;

    rec = this.records.create({
      mentorId,
      leadId: lead.id,
      companyName: lead.company || lead.companyLegalName,
      segment: lead.segment,
      origin: lead.source,
      currentStage:
        lead.stage === LeadStage.CLIENT ? MentoredStage.STRUCTURING : MentoredStage.INITIAL,
    });
    rec = await this.records.save(rec);
    // Recalcula scores na primeira criação
    await this.recalculate(rec);
    return rec;
  }

  async getFull(mentorId: string, leadIdOrUserId: string) {
    const lead = await this.resolveLead(mentorId, leadIdOrUserId);
    const record = await this.ensureRecord(mentorId, lead);

    const [tests, meetings, tasks, account] = await Promise.all([
      this.responses.find({
        where: { leadId: lead.id, mentorId },
        order: { createdAt: 'DESC' },
        relations: ['template'],
      }),
      this.meetings.find({
        where: { leadId: lead.id, mentorId },
        order: { scheduledAt: 'DESC' },
      }),
      this.tasks.find({
        where: { leadId: lead.id, mentorId },
        order: { createdAt: 'DESC' },
      }),
      lead.userId ? this.users.findOne({ where: { id: lead.userId } }) : Promise.resolve(null),
    ]);

    const timeline: Array<{ type: string; at: Date; title: string; ref: string; meta?: any }> = [];
    timeline.push({
      type: 'lead_created',
      at: lead.createdAt,
      title: 'Lead capturado',
      ref: lead.id,
      meta: { source: lead.source },
    });
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
      timeline.push({
        type: 'meeting',
        at: m.scheduledAt,
        title: `Reunião: ${m.title}`,
        ref: m.id,
        meta: { status: m.status },
      }),
    );
    tasks.forEach((t) =>
      timeline.push({
        type: 'task',
        at: t.createdAt,
        title: `Tarefa: ${t.title}`,
        ref: t.id,
        meta: { status: t.status },
      }),
    );
    timeline.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    // Próxima reunião agendada
    const upcomingMeeting = [...meetings]
      .filter((m) => new Date(m.scheduledAt).getTime() > Date.now() && m.status !== 'cancelled')
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];

    return {
      record,
      lead,
      account: account
        ? { id: account.id, email: account.email, status: account.status, role: account.role }
        : null,
      stats: {
        testsCount: tests.length,
        meetingsCount: meetings.length,
        tasksCount: tasks.length,
        avgScore: tests.length
          ? Math.round(tests.reduce((s, t) => s + Number(t.scorePct), 0) / tests.length)
          : null,
        upcomingMeetingAt: upcomingMeeting?.scheduledAt ?? null,
        lastInteractionAt: timeline[0]?.at ?? lead.createdAt,
      },
      tests,
      meetings,
      tasks,
      timeline,
    };
  }

  async patch(mentorId: string, recordId: string, dto: Partial<MentoredRecord>) {
    const rec = await this.records.findOne({ where: { id: recordId, mentorId } });
    if (!rec) throw new NotFoundException('Prontuário não encontrado');
    const allow: (keyof MentoredRecord)[] = [
      'mentorSummary',
      'currentSummary',
      'mainObjective',
      'mainPain',
      'mainBottleneck',
      'currentFocus',
      'hypotheses',
      'priorities',
      'currentStage',
      'status',
      'companyName',
      'roleName',
      'segment',
    ];
    for (const k of allow) {
      if (dto[k] !== undefined) (rec as any)[k] = dto[k];
    }
    return this.records.save(rec);
  }

  /**
   * Recalcula os 4 scores do prontuário.
   * Engajamento → presença em reuniões realizadas / agendadas.
   * Execução → tarefas concluídas / total.
   * Risco → inverso dos demais + sinais de inatividade.
   * Geral → média ponderada.
   */
  async recalculate(rec: MentoredRecord): Promise<MentoredRecord> {
    const { mentorId, leadId } = rec;

    const meetings = await this.meetings.find({ where: { leadId, mentorId } });
    const tasks = await this.tasks.find({ where: { leadId, mentorId } });
    const tests = await this.responses.find({ where: { leadId, mentorId } });

    // Engajamento: % de reuniões finalizadas/realizadas vs agendadas (excluindo futuras)
    const pastMeetings = meetings.filter((m) => new Date(m.scheduledAt).getTime() < Date.now());
    const completedMeetings = pastMeetings.filter((m) =>
      ['completed', 'ended', 'processing'].includes(m.status),
    );
    const engagement = pastMeetings.length
      ? Math.round((completedMeetings.length / pastMeetings.length) * 100)
      : tests.length
        ? 50
        : 0;

    // Execução: % de tarefas concluídas
    const doneTasks = tasks.filter((t) => t.status === TaskStatus.DONE);
    const execution = tasks.length ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

    // Score médio dos testes
    const avgTest = tests.length
      ? Math.round(tests.reduce((s, t) => s + Number(t.scorePct), 0) / tests.length)
      : 0;

    // Inatividade (dias desde última atividade conhecida)
    const lastActivity = Math.max(
      ...meetings.map((m) => new Date(m.updatedAt).getTime()),
      ...tasks.map((t) => new Date(t.updatedAt).getTime()),
      ...tests.map((t) => new Date(t.createdAt).getTime()),
      new Date(rec.updatedAt || rec.createdAt).getTime(),
    );
    const daysIdle = Math.floor((Date.now() - lastActivity) / 86_400_000);

    // Risco: combina baixa execução, baixa presença e inatividade
    let risk = 0;
    if (execution < 50) risk += 30;
    if (engagement < 50) risk += 30;
    if (daysIdle > 14) risk += Math.min(40, (daysIdle - 14) * 2);
    risk = Math.min(100, risk);

    // Geral: média ponderada
    const overall = Math.round(execution * 0.4 + engagement * 0.3 + avgTest * 0.3);

    rec.engagementScore = engagement;
    rec.executionScore = execution;
    rec.riskScore = risk;
    rec.overallScore = overall;
    rec.lastRecalculatedAt = new Date();

    const saved = await this.records.save(rec);
    // Após recalcular, dispara avaliação de alertas automáticos
    try { await this.alertsService.evaluate(saved); } catch { /* não bloqueia */ }
    return saved;
  }

  async recalculateById(mentorId: string, recordId: string) {
    const rec = await this.records.findOne({ where: { id: recordId, mentorId } });
    if (!rec) throw new NotFoundException('Prontuário não encontrado');
    return this.recalculate(rec);
  }
}
