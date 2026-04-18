import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum TaskStatus {
  TODO = 'todo',
  DOING = 'doing',
  DONE = 'done',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('tasks')
@Index(['mentorId', 'leadId'])
@Index(['mentorId', 'assignedUserId'])
@Index(['nextReminderAt'])
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  /** Lead associado (contexto). Pode ser null para tarefas internas do mentor. */
  @Column({ type: 'uuid', nullable: true })
  leadId?: string;

  /** Usuário responsável pela execução (mentorado/lead/membro do time). */
  @Column({ type: 'uuid', nullable: true })
  assignedUserId?: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'timestamptz', nullable: true })
  dueDate?: Date;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.TODO })
  status: TaskStatus;

  @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  /** Enviar lembrete por WhatsApp ao responsável. */
  @Column({ type: 'boolean', default: true })
  remindWhatsapp: boolean;

  /** Notificar imediatamente o responsável quando a tarefa for criada/atribuída. */
  @Column({ type: 'boolean', default: true })
  notifyOnAssign: boolean;

  /** Próximo disparo de lembrete (calculado a partir de dueDate / política). */
  @Column({ type: 'timestamptz', nullable: true })
  nextReminderAt?: Date;

  /** Quantidade de lembretes já enviados. */
  @Column({ type: 'int', default: 0 })
  remindersSent: number;

  /** Último envio de lembrete WhatsApp. */
  @Column({ type: 'timestamptz', nullable: true })
  lastReminderAt?: Date;

  /** Data marcada como concluída. */
  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
