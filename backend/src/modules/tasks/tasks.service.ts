import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, IsNull, Not } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Task, TaskStatus, TaskPriority } from '../../entities/task.entity';
import { User } from '../../entities/user.entity';
import { Lead } from '../../entities/lead.entity';
import { WhatsappService } from '../integrations/whatsapp.service';

interface CreateTaskDto {
  title: string;
  description?: string;
  leadId?: string;
  assignedUserId?: string;
  dueDate?: string | Date;
  priority?: TaskPriority;
  remindWhatsapp?: boolean;
  notifyOnAssign?: boolean;
  status?: TaskStatus;
}

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Task) private tasks: Repository<Task>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
    private whatsapp: WhatsappService,
  ) {}

  /**
   * Calcula o próximo lembrete a partir do dueDate.
   * Política: 24h antes do prazo (ou imediatamente se prazo <24h).
   * Se já tiver enviado N, escala para 1h antes / no horário.
   */
  private computeNextReminder(task: Pick<Task, 'dueDate' | 'remindersSent'>): Date | null {
    if (!task.dueDate) return null;
    const due = new Date(task.dueDate).getTime();
    const now = Date.now();
    const sent = task.remindersSent || 0;
    
    // Se a tarefa já venceu, não agendamos mais lembretes automáticos
    // (evita spam em tarefas esquecidas)
    if (due < now && sent > 0) return null;

    if (sent === 0) {
      const t24 = due - 24 * 3600 * 1000;
      // Se já passou das 24h, agendamos para daqui a 5 min para não disparar em loop
      return new Date(Math.max(now + 5 * 60 * 1000, t24));
    }
    if (sent === 1) {
      const t1 = due - 60 * 60 * 1000;
      return new Date(Math.max(now + 15 * 60 * 1000, t1));
    }
    // Após 2 lembretes, só dispara no vencimento exato (se for no futuro)
    if (sent === 2 && due > now) return new Date(due);
    return null;
  }

  list(mentorId: string, filter: { leadId?: string; assignedUserId?: string; status?: TaskStatus; mineUserId?: string }) {
    const qb = this.tasks.createQueryBuilder('t').where('t.mentorId = :mentorId', { mentorId });
    if (filter.leadId) qb.andWhere('t.leadId = :leadId', { leadId: filter.leadId });
    if (filter.assignedUserId) qb.andWhere('t.assignedUserId = :uid', { uid: filter.assignedUserId });
    if (filter.status) qb.andWhere('t.status = :status', { status: filter.status });
    if (filter.mineUserId) qb.andWhere('t.assignedUserId = :mine', { mine: filter.mineUserId });
    qb.orderBy('t.dueDate', 'ASC', 'NULLS LAST').addOrderBy('t.priority', 'DESC');
    return qb.getMany();
  }

  async create(mentorId: string, dto: CreateTaskDto, createdByUserId?: string) {
    const task = this.tasks.create({
      mentorId,
      title: dto.title,
      description: dto.description,
      leadId: dto.leadId || undefined,
      assignedUserId: dto.assignedUserId || undefined,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      priority: dto.priority || TaskPriority.MEDIUM,
      remindWhatsapp: dto.remindWhatsapp ?? true,
      notifyOnAssign: dto.notifyOnAssign ?? true,
      status: dto.status || TaskStatus.TODO,
      remindersSent: 0,
    });
    task.nextReminderAt = this.computeNextReminder(task) || undefined;
    const saved = await this.tasks.save(task);

    if (saved.notifyOnAssign && saved.remindWhatsapp && saved.assignedUserId) {
      await this.notifyAssignment(saved).catch((e) => this.logger.warn(`notifyAssignment falhou: ${e.message}`));
    }
    return saved;
  }

  async update(mentorId: string, id: string, dto: Partial<CreateTaskDto>) {
    const task = await this.tasks.findOne({ where: { id, mentorId } });
    if (!task) throw new NotFoundException('Tarefa não encontrada');

    const wasDone = task.status === TaskStatus.DONE;
    Object.assign(task, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.leadId !== undefined && { leadId: dto.leadId || undefined }),
      ...(dto.assignedUserId !== undefined && { assignedUserId: dto.assignedUserId || undefined }),
      ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined }),
      ...(dto.priority !== undefined && { priority: dto.priority }),
      ...(dto.remindWhatsapp !== undefined && { remindWhatsapp: dto.remindWhatsapp }),
      ...(dto.notifyOnAssign !== undefined && { notifyOnAssign: dto.notifyOnAssign }),
      ...(dto.status !== undefined && { status: dto.status }),
    });

    if (dto.status === TaskStatus.DONE && !wasDone) {
      task.completedAt = new Date();
      task.nextReminderAt = undefined;
    } else if (dto.status && dto.status !== TaskStatus.DONE) {
      task.completedAt = undefined;
    }

    if (dto.dueDate !== undefined && task.status !== TaskStatus.DONE) {
      task.remindersSent = 0;
      task.nextReminderAt = this.computeNextReminder(task) || undefined;
    }

    return this.tasks.save(task);
  }

  async remove(mentorId: string, id: string) {
    await this.tasks.delete({ id, mentorId } as any);
    return { ok: true };
  }

  /** Permite ao próprio responsável (mentorado) marcar como feita. */
  async markDone(mentorId: string, id: string, byUserId: string) {
    const task = await this.tasks.findOne({ where: { id, mentorId } });
    if (!task) throw new NotFoundException('Tarefa não encontrada');
    const isMentor = byUserId === mentorId;
    if (!isMentor && task.assignedUserId && task.assignedUserId !== byUserId) {
      throw new ForbiddenException('Sem permissão');
    }
    task.status = TaskStatus.DONE;
    task.completedAt = new Date();
    task.nextReminderAt = undefined;
    return this.tasks.save(task);
  }

  /** Reenvia o lembrete agora (mentor force-send). */
  async sendReminderNow(mentorId: string, id: string) {
    const task = await this.tasks.findOne({ where: { id, mentorId } });
    if (!task) throw new NotFoundException('Tarefa não encontrada');
    return this.dispatchReminder(task, 'manual');
  }

  /** ----- Mensageria WhatsApp ----- */

  private async resolveRecipient(task: Task): Promise<{ phone?: string; name?: string }> {
    if (task.assignedUserId) {
      const u = await this.users.findOne({ where: { id: task.assignedUserId } });
      if (u?.phone) return { phone: u.phone, name: u.name };
    }
    if (task.leadId) {
      const l = await this.leads.findOne({ where: { id: task.leadId } });
      if (l?.phone) return { phone: l.phone, name: l.name };
    }
    return {};
  }

  private formatDue(d?: Date): string {
    if (!d) return 'sem prazo';
    return new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  private priorityEmoji(p: TaskPriority): string {
    return ({ low: '🟢', medium: '🟡', high: '🟠', urgent: '🔴' } as any)[p] || '🟡';
  }

  async notifyAssignment(task: Task) {
    if (!task.remindWhatsapp) return { ok: false, error: 'reminder_disabled' };
    const { phone, name } = await this.resolveRecipient(task);
    if (!phone) return { ok: false, error: 'no_phone' };
    const text =
      `📌 *Nova tarefa atribuída a você*\n\n` +
      `*${task.title}*\n` +
      (task.description ? `${task.description}\n` : '') +
      `\n${this.priorityEmoji(task.priority)} Prioridade: *${task.priority.toUpperCase()}*\n` +
      `📅 Prazo: ${this.formatDue(task.dueDate)}\n\n` +
      `_Você receberá lembretes automáticos antes do prazo._`;
    return this.whatsapp.sendText(task.mentorId, phone, text);
  }

  private async dispatchReminder(task: Task, reason: 'cron' | 'manual') {
    if (!task.remindWhatsapp) return { ok: false, error: 'reminder_disabled' };

    // Busca configurações do mentor
    const mentor = await this.users.findOne({ where: { id: task.mentorId } });
    const settings = mentor?.demandNotificationSettings || { notifyVia: 'whatsapp', reminderMinutes: 60 };
    
    // Se as notificações globais estiverem desativadas, não envia
    if (settings.notifyVia === 'none') return { ok: false, error: 'mentor_notifications_disabled' };

    const { phone } = await this.resolveRecipient(task);
    if (!phone) return { ok: false, error: 'no_phone' };

    const overdue = task.dueDate && new Date(task.dueDate).getTime() < Date.now();
    const header = overdue ? '⚠️ *Tarefa em atraso*' : '⏰ *Lembrete de tarefa*';
    const text =
      `${header}\n\n` +
      `*${task.title}*\n` +
      (task.description ? `${task.description}\n` : '') +
      `\n${this.priorityEmoji(task.priority)} Prioridade: *${task.priority.toUpperCase()}*\n` +
      `📅 Prazo: ${this.formatDue(task.dueDate)}\n\n` +
      `_Marque como concluída na plataforma quando finalizar._`;
    const r = await this.whatsapp.sendText(task.mentorId, phone, text);

    task.remindersSent = (task.remindersSent || 0) + 1;
    task.lastReminderAt = new Date();
    task.nextReminderAt = this.computeNextReminder(task) || undefined;
    await this.tasks.save(task);
    return { ...r, reason };
  }

  /** Cron a cada minuto: dispara lembretes pendentes. */
  @Cron(CronExpression.EVERY_MINUTE)
  async runReminderCron() {
    const now = new Date();
    const due = await this.tasks.find({
      where: {
        nextReminderAt: LessThanOrEqual(now),
        status: Not(TaskStatus.DONE) as any,
        remindWhatsapp: true,
      },
      take: 50,
    });
    if (due.length === 0) return;
    this.logger.log(`Disparando ${due.length} lembrete(s) de tarefa`);
    for (const t of due) {
      try {
        await this.dispatchReminder(t, 'cron');
      } catch (e: any) {
        this.logger.warn(`Lembrete falhou (${t.id}): ${e.message}`);
      }
    }
  }
}
