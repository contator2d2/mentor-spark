import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum MessageChannel {
  IN_APP = 'in_app',
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
}

export enum MessageDirection {
  OUT = 'out',
  IN = 'in',
}

export enum MessageStatus {
  QUEUED = 'queued',
  SCHEDULED = 'scheduled',
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

@Entity('messages')
@Index(['mentorId', 'leadId'])
@Index(['mentorId', 'status'])
@Index(['scheduledAt'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  /** Lead destinatário (pode ser nulo se for broadcast interno futuro) */
  @Column({ type: 'uuid', nullable: true })
  leadId?: string;

  /** userId (mentorado) — usado para in_app */
  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column({ type: 'enum', enum: MessageChannel })
  channel: MessageChannel;

  @Column({ type: 'enum', enum: MessageDirection, default: MessageDirection.OUT })
  direction: MessageDirection;

  @Column({ nullable: true })
  subject?: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'enum', enum: MessageStatus, default: MessageStatus.QUEUED })
  status: MessageStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'timestamptz', nullable: true })
  scheduledAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  templateId?: string;

  @Column({ type: 'uuid', nullable: true })
  automationId?: string;

  /** Quem enviou (mentor ou membro da equipe) */
  @Column({ type: 'uuid', nullable: true })
  senderId?: string;

  /** Telefone/email destinatário renderizado */
  @Column({ nullable: true })
  recipientAddress?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
