import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MentoredRecord } from '../../entities/mentored-record.entity';
import { MentoredAlert, AlertSeverity, AlertStatus, AlertType } from '../../entities/mentored-alert.entity';
import { MentoredTimelineEvent, TimelineEventType } from '../../entities/mentored-timeline-event.entity';
import { Meeting } from '../../entities/meeting.entity';
import { Task, TaskStatus } from '../../entities/task.entity';

/**
 * Avalia regras de risco e cria alertas determinísticos (idempotentes via signature).
 * Também grava eventos persistidos na timeline.
 */
@Injectable()
export class ProntuarioAlertsService {
  constructor(
    @InjectRepository(MentoredAlert) private alerts: Repository<MentoredAlert>,
    @InjectRepository(MentoredTimelineEvent) private events: Repository<MentoredTimelineEvent>,
    @InjectRepository(Meeting) private meetings: Repository<Meeting>,
    @InjectRepository(Task) private tasks: Repository<Task>,
  ) {}

  async logEvent(
    mentorId: string,
    recordId: string,
    type: TimelineEventType,
    title: string,
    opts: { description?: string; meta?: any; source?: string } = {},
  ) {
    return this.events.save(
      this.events.create({
        mentorId,
        recordId,
        type,
        title,
        description: opts.description,
        meta: opts.meta,
        source: opts.source || 'system',
      }),
    );
  }

  /** Cria/atualiza alerta com base na signature determinística */
  private async upsertAlert(
    mentorId: string,
    recordId: string,
    signature: string,
    payload: Partial<MentoredAlert>,
  ) {
    const existing = await this.alerts.findOne({ where: { mentorId, recordId, signature } });
    if (existing) {
      // Se foi resolvido manualmente, não reabre
      if (existing.status === AlertStatus.RESOLVED || existing.status === AlertStatus.DISMISSED) return existing;
      Object.assign(existing, payload);
      return this.alerts.save(existing);
    }
    const created = await this.alerts.save(
      this.alerts.create({ mentorId, recordId, signature, ...payload }),
    );
    await this.logEvent(mentorId, recordId, TimelineEventType.ALERT_RAISED, payload.title || 'Novo alerta', {
      meta: { type: payload.type, severity: payload.severity },
    });
    return created;
  }

  /** Roda regras automáticas a partir do snapshot de scores recém-calculado */
  async evaluate(rec: MentoredRecord) {
    const { mentorId, id: recordId } = rec;

    // Risco de churn — score geral baixo + risk alto
    if (rec.riskScore >= 60) {
      await this.upsertAlert(mentorId, recordId, 'risk_high', {
        type: AlertType.CHURN_RISK,
        severity: rec.riskScore >= 80 ? AlertSeverity.CRITICAL : AlertSeverity.WARN,
        status: AlertStatus.OPEN,
        title: 'Risco de churn elevado',
        description: `Score de risco em ${rec.riskScore}%. Combina baixa execução, baixa presença e/ou inatividade.`,
        meta: { riskScore: rec.riskScore },
      });
    }

    if (rec.executionScore < 40) {
      await this.upsertAlert(mentorId, recordId, 'low_execution', {
        type: AlertType.LOW_EXECUTION,
        severity: AlertSeverity.WARN,
        status: AlertStatus.OPEN,
        title: 'Baixa execução de tarefas',
        description: `Apenas ${rec.executionScore}% das tarefas estão concluídas.`,
        meta: { executionScore: rec.executionScore },
      });
    }

    if (rec.engagementScore < 40) {
      await this.upsertAlert(mentorId, recordId, 'low_engagement', {
        type: AlertType.LOW_ENGAGEMENT,
        severity: AlertSeverity.WARN,
        status: AlertStatus.OPEN,
        title: 'Engajamento baixo nas reuniões',
        description: `Apenas ${rec.engagementScore}% das reuniões agendadas foram realizadas.`,
        meta: { engagementScore: rec.engagementScore },
      });
    }

    // Inatividade > 14 dias
    const lastUpdate = new Date(rec.lastRecalculatedAt || rec.updatedAt).getTime();
    const meetings = await this.meetings.find({ where: { mentorId, leadId: rec.leadId } });
    const lastMeeting = meetings.length
      ? Math.max(...meetings.map((m) => new Date(m.updatedAt).getTime()))
      : 0;
    const last = Math.max(lastUpdate, lastMeeting);
    const daysIdle = Math.floor((Date.now() - last) / 86_400_000);
    if (daysIdle >= 14) {
      await this.upsertAlert(mentorId, recordId, 'idle_14d', {
        type: AlertType.IDLE,
        severity: daysIdle >= 30 ? AlertSeverity.CRITICAL : AlertSeverity.WARN,
        status: AlertStatus.OPEN,
        title: `Sem interação há ${daysIdle} dias`,
        description: 'Considere acionar o mentorado.',
        meta: { daysIdle },
      });
    }

    // Tarefas vencidas
    const overdue = await this.tasks.find({ where: { mentorId, leadId: rec.leadId } });
    const now = Date.now();
    const overdueCount = overdue.filter(
      (t) => t.dueDate && new Date(t.dueDate).getTime() < now && t.status !== TaskStatus.DONE,
    ).length;
    if (overdueCount > 0) {
      await this.upsertAlert(mentorId, recordId, 'overdue_tasks', {
        type: AlertType.OVERDUE_TASK,
        severity: overdueCount >= 3 ? AlertSeverity.CRITICAL : AlertSeverity.WARN,
        status: AlertStatus.OPEN,
        title: `${overdueCount} tarefa(s) vencida(s)`,
        description: 'Revise as tarefas atrasadas com o mentorado.',
        meta: { overdueCount },
      });
    }
  }
}
