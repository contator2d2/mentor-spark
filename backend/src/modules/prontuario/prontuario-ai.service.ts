import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MentoredRecord } from '../../entities/mentored-record.entity';
import { MentoredAIInsight, InsightType } from '../../entities/mentored-ai-insight.entity';
import { MentorProntuarioConfig } from '../../entities/mentor-prontuario-config.entity';
import { MentoredObjective } from '../../entities/mentored-objective.entity';
import { MentoredPain } from '../../entities/mentored-pain.entity';
import { MentoredMetric } from '../../entities/mentored-metric.entity';
import { MentoredAlert, AlertStatus } from '../../entities/mentored-alert.entity';
import { MentoredPrivateNote } from '../../entities/mentored-private-note.entity';
import { Lead } from '../../entities/lead.entity';
import { Meeting } from '../../entities/meeting.entity';
import { Task, TaskStatus } from '../../entities/task.entity';
import { TestResponse } from '../../entities/test-response.entity';
import { AiService } from '../ai/ai.service';
import { ProntuarioAlertsService } from './prontuario-alerts.service';
import { TimelineEventType } from '../../entities/mentored-timeline-event.entity';

interface InsightOptions { includeNotes?: boolean }

@Injectable()
export class ProntuarioAiService {
  constructor(
    @InjectRepository(MentoredRecord) private records: Repository<MentoredRecord>,
    @InjectRepository(MentoredAIInsight) private insights: Repository<MentoredAIInsight>,
    @InjectRepository(MentorProntuarioConfig) private configs: Repository<MentorProntuarioConfig>,
    @InjectRepository(MentoredObjective) private objectives: Repository<MentoredObjective>,
    @InjectRepository(MentoredPain) private pains: Repository<MentoredPain>,
    @InjectRepository(MentoredMetric) private metrics: Repository<MentoredMetric>,
    @InjectRepository(MentoredAlert) private alerts: Repository<MentoredAlert>,
    @InjectRepository(MentoredPrivateNote) private notes: Repository<MentoredPrivateNote>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectRepository(Meeting) private meetings: Repository<Meeting>,
    @InjectRepository(Task) private tasks: Repository<Task>,
    @InjectRepository(TestResponse) private responses: Repository<TestResponse>,
    private ai: AiService,
    private alertsService: ProntuarioAlertsService,
  ) {}

  async getConfig(mentorId: string) {
    let cfg = await this.configs.findOne({ where: { mentorId } });
    if (!cfg) {
      cfg = await this.configs.save(this.configs.create({ mentorId }));
    }
    return cfg;
  }

  async updateConfig(mentorId: string, dto: Partial<MentorProntuarioConfig>) {
    const cfg = await this.getConfig(mentorId);
    const allow: (keyof MentorProntuarioConfig)[] = [
      'menteeLabel', 'prontuarioLabel', 'stageLabels', 'painCategories',
      'objectiveCategories', 'metricTemplates', 'scoreWeights',
      'prontuarioPromptAddon', 'insightTone', 'language',
    ];
    for (const k of allow) if (dto[k] !== undefined) (cfg as any)[k] = dto[k];
    return this.configs.save(cfg);
  }

  async listInsights(mentorId: string, recordId: string) {
    return this.insights.find({
      where: { mentorId, recordId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async deleteInsight(mentorId: string, recordId: string, id: string) {
    await this.insights.delete({ id, mentorId, recordId });
    return { ok: true };
  }

  /** Promove um insight para resumo oficial (currentSummary) do prontuário */
  async promoteInsight(mentorId: string, recordId: string, id: string) {
    const insight = await this.insights.findOne({ where: { id, mentorId, recordId } });
    if (!insight) throw new NotFoundException('Insight não encontrado');
    const rec = await this.records.findOne({ where: { id: recordId, mentorId } });
    if (!rec) throw new NotFoundException('Prontuário não encontrado');
    rec.currentSummary = insight.content;
    await this.records.save(rec);
    // Desmarca outros do mesmo tipo
    await this.insights.update({ mentorId, recordId, type: insight.type }, { promoted: false });
    insight.promoted = true;
    await this.insights.save(insight);
    await this.alertsService.logEvent(
      mentorId, recordId, TimelineEventType.SUMMARY_UPDATED,
      'Resumo executivo atualizado via IA',
      { source: 'ai', meta: { insightId: insight.id, type: insight.type } },
    );
    return insight;
  }

  /** Coleta contexto consolidado do prontuário para alimentar prompts */
  private async buildContext(mentorId: string, rec: MentoredRecord, includeNotes = false) {
    const [lead, objectives, pains, metrics, alerts, meetings, tasks, tests, notes] = await Promise.all([
      this.leads.findOne({ where: { id: rec.leadId, mentorId } }),
      this.objectives.find({ where: { mentorId, recordId: rec.id }, order: { createdAt: 'DESC' }, take: 20 }),
      this.pains.find({ where: { mentorId, recordId: rec.id }, order: { createdAt: 'DESC' }, take: 20 }),
      this.metrics.find({ where: { mentorId, recordId: rec.id }, order: { createdAt: 'DESC' }, take: 20 }),
      this.alerts.find({ where: { mentorId, recordId: rec.id }, order: { createdAt: 'DESC' }, take: 20 }),
      this.meetings.find({ where: { mentorId, leadId: rec.leadId }, order: { scheduledAt: 'DESC' }, take: 5 }),
      this.tasks.find({ where: { mentorId, leadId: rec.leadId }, order: { createdAt: 'DESC' }, take: 20 }),
      this.responses.find({ where: { mentorId, leadId: rec.leadId }, order: { createdAt: 'DESC' }, take: 5, relations: ['template'] }),
      includeNotes
        ? this.notes.find({ where: { mentorId, recordId: rec.id }, order: { createdAt: 'DESC' }, take: 20 })
        : Promise.resolve([] as MentoredPrivateNote[]),
    ]);

    const tasksDone = tasks.filter(t => t.status === TaskStatus.DONE).length;
    const activeAlerts = alerts.filter(a => a.status === AlertStatus.OPEN || a.status === AlertStatus.ACKNOWLEDGED);

    return {
      lead,
      summary: {
        scores: {
          overall: rec.overallScore, engagement: rec.engagementScore,
          execution: rec.executionScore, risk: rec.riskScore,
        },
        stage: rec.currentStage,
        status: rec.status,
        tasksDone, tasksTotal: tasks.length,
        activeAlerts: activeAlerts.length,
      },
      mainObjective: rec.mainObjective,
      mainPain: rec.mainPain,
      currentFocus: rec.currentFocus,
      objectives: objectives.map(o => ({ title: o.title, status: o.status, priority: o.priority, dueDate: o.dueDate })),
      pains: pains.map(p => ({ title: p.title, severity: p.severity, status: p.status, source: p.source })),
      metrics: metrics.map(m => ({
        name: m.name, current: m.currentValue, target: m.targetValue, unit: m.unit,
        trend: (m.history || []).slice(-5),
      })),
      alerts: activeAlerts.map(a => ({ type: a.type, severity: a.severity, title: a.title })),
      lastMeetings: meetings.map(m => ({ title: m.title, status: m.status, when: m.scheduledAt })),
      lastTests: tests.map(t => ({ template: t.template?.title, score: t.scorePct, classification: t.classification })),
      privateNotes: notes.map(n => ({ category: n.category, content: n.content })),
    };
  }

  private async buildSystemPrompt(mentorId: string) {
    const cfg = await this.getConfig(mentorId);
    const baseCfg = await this.ai.getMentorConfig(mentorId);
    return [
      baseCfg.systemPrompt || 'Você é um assistente de mentoria empresarial estratégico.',
      `Idioma: ${cfg.language}.`,
      `Tom: ${cfg.insightTone}.`,
      cfg.prontuarioPromptAddon ? `Diretrizes específicas do prontuário:\n${cfg.prontuarioPromptAddon}` : '',
      `Termo para mentorado: "${cfg.menteeLabel}".`,
      baseCfg.methodology ? `Metodologia: ${baseCfg.methodology}` : '',
    ].filter(Boolean).join('\n');
  }

  async generate(
    mentorId: string,
    recordId: string,
    type: InsightType,
    opts: InsightOptions = {},
  ): Promise<MentoredAIInsight> {
    const rec = await this.records.findOne({ where: { id: recordId, mentorId } });
    if (!rec) throw new NotFoundException('Prontuário não encontrado');

    const ctx = await this.buildContext(mentorId, rec, opts.includeNotes);
    const sys = await this.buildSystemPrompt(mentorId);

    const ctxJson = JSON.stringify(ctx, null, 2).slice(0, 8000);

    const PROMPTS: Record<InsightType, { title: string; prompt: string }> = {
      [InsightType.EXECUTIVE_SUMMARY]: {
        title: 'Resumo executivo gerado por IA',
        prompt: `Gere um RESUMO EXECUTIVO consolidado deste mentorado em 6-10 linhas: situação atual, principais dores, foco estratégico, riscos e próximos passos. Linguagem de mentor sênior.\n\nDados:\n${ctxJson}`,
      },
      [InsightType.AGENDA_SUGGESTION]: {
        title: 'Sugestão de pauta para próxima reunião',
        prompt: `Sugira uma PAUTA OBJETIVA para a próxima reunião com base no contexto. Estruture em: 1) Check-in (3 perguntas), 2) Tópicos prioritários (3-5), 3) Compromissos a fechar, 4) Tempo sugerido.\n\nDados:\n${ctxJson}`,
      },
      [InsightType.RISK_ANALYSIS]: {
        title: 'Análise de riscos e churn',
        prompt: `Faça uma ANÁLISE DE RISCO deste mentorado. Identifique sinais de churn, gargalos críticos, padrões preocupantes e recomende ações imediatas. Seja franco e prático.\n\nDados:\n${ctxJson}`,
      },
      [InsightType.PATTERN_DETECTION]: {
        title: 'Padrões recorrentes detectados',
        prompt: `Detecte PADRÕES RECORRENTES neste mentorado: comportamentos, gargalos repetidos, dependências, evolução das métricas. Liste cada padrão com evidência.\n\nDados:\n${ctxJson}`,
      },
      [InsightType.NEXT_STEPS]: {
        title: 'Próximos passos recomendados',
        prompt: `Liste 5 PRÓXIMOS PASSOS recomendados, priorizados (alta/média/baixa), com prazo sugerido e responsável (mentor ou mentorado).\n\nDados:\n${ctxJson}`,
      },
      [InsightType.PROGRESS_REPORT]: {
        title: 'Relatório de evolução',
        prompt: `Gere um RELATÓRIO DE EVOLUÇÃO mostrando: o que avançou, o que estagnou, o que regrediu, conquistas notáveis e atenção necessária. Use comparações com base no histórico de métricas e tarefas.\n\nDados:\n${ctxJson}`,
      },
      [InsightType.CUSTOM]: {
        title: 'Insight personalizado',
        prompt: `Analise os dados abaixo e produza um insight estratégico relevante.\n\nDados:\n${ctxJson}`,
      },
    };

    const { title, prompt } = PROMPTS[type];
    const content = await this.ai.chat(sys, prompt);

    const insight = await this.insights.save(
      this.insights.create({
        mentorId, recordId, type, title, content,
        sourceMeta: { snapshotAt: new Date().toISOString(), includeNotes: !!opts.includeNotes },
      }),
    );

    await this.alertsService.logEvent(
      mentorId, recordId, TimelineEventType.MENTOR_ACTION,
      `Insight de IA gerado: ${title}`,
      { source: 'ai', meta: { insightId: insight.id, type } },
    );

    return insight;
  }
}
