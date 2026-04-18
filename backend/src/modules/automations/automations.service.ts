import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Automation, AutomationNode } from '../../entities/automation.entity';
import { Lead } from '../../entities/lead.entity';
import { Task, TaskStatus } from '../../entities/task.entity';
import { MessagesService } from '../messages/messages.service';
import { MessageChannel } from '../../entities/message.entity';
import { NotificationsService } from '../notifications/notifications.service';

interface TriggerContext {
  type: 'lead_created' | 'lead_stage_changed' | 'card_moved' | 'meeting_scheduled' | 'test_submitted';
  mentorId: string;
  leadId?: string;
  data?: Record<string, any>;
}

@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);

  constructor(
    @InjectRepository(Automation) private repo: Repository<Automation>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectRepository(Task) private tasks: Repository<Task>,
    private messages: MessagesService,
    private notifications: NotificationsService,
  ) {}

  /** Chamado por outros módulos quando um evento acontece */
  async fire(ctx: TriggerContext) {
    const automations = await this.repo.find({ where: { mentorId: ctx.mentorId, enabled: true } });
    for (const a of automations) {
      const triggerNode = a.nodes?.find((n) => n.kind === 'trigger' && this.matchTrigger(n, ctx));
      if (!triggerNode) continue;
      this.logger.log(`Disparando automação "${a.name}" (trigger=${triggerNode.type})`);
      await this.executeFromNode(a, triggerNode, ctx);
      await this.repo.update(a.id, { runCount: (a.runCount || 0) + 1, lastRunAt: new Date() });
    }
  }

  private matchTrigger(node: AutomationNode, ctx: TriggerContext): boolean {
    if (node.type === 'lead_created' && ctx.type === 'lead_created') return true;
    if (node.type === 'lead_stage_changed' && ctx.type === 'lead_stage_changed') {
      const cfg = node.config || {};
      if (cfg.stage && cfg.stage !== ctx.data?.newStage) return false;
      return true;
    }
    if (node.type === 'test_submitted' && ctx.type === 'test_submitted') return true;
    if (node.type === 'test_classification' && ctx.type === 'test_submitted') {
      const cfg = node.config || {};
      return !cfg.temperature || cfg.temperature === ctx.data?.temperature;
    }
    return false;
  }

  private async executeFromNode(automation: Automation, node: AutomationNode, ctx: TriggerContext) {
    const nextIds = node.next || [];
    for (const nextId of nextIds) {
      const action = automation.nodes.find((n) => n.id === nextId);
      if (!action || action.kind !== 'action') continue;
      try {
        await this.executeAction(action, ctx);
      } catch (e: any) {
        this.logger.error(`Ação ${action.type} falhou: ${e.message}`);
      }
      await this.executeFromNode(automation, action, ctx);
    }
  }

  private async executeAction(node: AutomationNode, ctx: TriggerContext) {
    const cfg = node.config || {};
    if (node.type === 'send_whatsapp' || node.type === 'send_email' || node.type === 'send_in_app') {
      const channel = node.type === 'send_whatsapp' ? MessageChannel.WHATSAPP
        : node.type === 'send_email' ? MessageChannel.EMAIL
        : MessageChannel.IN_APP;
      await this.messages.send({
        mentorId: ctx.mentorId,
        leadId: ctx.leadId,
        channel,
        subject: cfg.subject,
        body: cfg.body || cfg.message || '',
        automationId: node.id,
        scheduledAt: cfg.delayMinutes ? new Date(Date.now() + cfg.delayMinutes * 60_000) : null,
      });
    } else if (node.type === 'create_task') {
      if (!ctx.leadId) return;
      await this.tasks.save(this.tasks.create({
        mentorId: ctx.mentorId,
        leadId: ctx.leadId,
        title: cfg.title || 'Nova tarefa automática',
        description: cfg.description,
        status: TaskStatus.TODO,
        dueDate: cfg.dueInDays ? new Date(Date.now() + cfg.dueInDays * 86_400_000) : null,
      }));
    } else if (node.type === 'change_lead_stage') {
      if (!ctx.leadId || !cfg.stage) return;
      await this.leads.update({ id: ctx.leadId, mentorId: ctx.mentorId } as any, { stage: cfg.stage });
    } else if (node.type === 'notify_mentor') {
      await this.notifications.create({
        userId: ctx.mentorId,
        type: 'automation',
        title: cfg.title || 'Automação executada',
        body: cfg.body,
      });
    }
  }

  /** Cron diário: lead_no_activity_days */
  @Cron(CronExpression.EVERY_HOUR)
  async checkInactiveLeads() {
    const automations = await this.repo.find({ where: { enabled: true } });
    for (const a of automations) {
      const trig = a.nodes?.find((n) => n.kind === 'trigger' && n.type === 'lead_no_activity_days');
      if (!trig) continue;
      const days = trig.config?.days || 7;
      const cutoff = new Date(Date.now() - days * 86_400_000);
      const stuck = await this.leads.createQueryBuilder('l')
        .where('l.mentorId = :m AND l.updatedAt < :cutoff AND l.stage NOT IN (:...skip)',
          { m: a.mentorId, cutoff, skip: ['client', 'lost'] })
        .getMany();
      for (const lead of stuck) {
        await this.executeFromNode(a, trig, { type: 'lead_stage_changed', mentorId: a.mentorId, leadId: lead.id });
      }
    }
  }
}
