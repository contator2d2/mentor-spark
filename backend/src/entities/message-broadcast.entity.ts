import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { MessageChannel, MessageAttachment } from './message.entity';

export enum BroadcastStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  COMPLETED = 'completed',
  CANCELED = 'canceled',
  FAILED = 'failed',
}

export interface BroadcastSequenceStep {
  body: string;
  subject?: string;
  attachments?: MessageAttachment[];
  /** Delay em segundos APÓS a mensagem anterior dessa sequência. Ignorado no step 0. */
  delaySeconds?: number;
}

@Entity('message_broadcasts')
@Index(['mentorId', 'status'])
export class MessageBroadcast {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: MessageChannel })
  channel: MessageChannel;

  /** Sequência de mensagens (1+) com delays entre elas */
  @Column({ type: 'jsonb' })
  sequence: BroadcastSequenceStep[];

  /** Lista de leadIds destinatários */
  @Column({ type: 'jsonb' })
  leadIds: string[];

  /** Delay (segundos) entre destinatários para evitar bloqueio. Ex: 8 */
  @Column({ type: 'int', default: 8 })
  perRecipientDelaySeconds: number;

  /** Variação aleatória aplicada ao delay (0-1) — ex 0.3 = ±30% */
  @Column({ type: 'float', default: 0.3 })
  jitter: number;

  @Column({ type: 'enum', enum: BroadcastStatus, default: BroadcastStatus.DRAFT })
  status: BroadcastStatus;

  @Column({ type: 'timestamptz', nullable: true })
  scheduledAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt?: Date;

  @Column({ type: 'int', default: 0 })
  totalRecipients: number;

  @Column({ type: 'int', default: 0 })
  sentCount: number;

  @Column({ type: 'int', default: 0 })
  failedCount: number;

  @Column({ type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
