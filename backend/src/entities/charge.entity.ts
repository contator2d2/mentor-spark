import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { MentorSubscription } from './mentor-subscription.entity';

export enum ChargeStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum ChargeMethod {
  PIX = 'pix',
  BOLETO = 'boleto',
  CREDIT_CARD = 'credit_card',
  MANUAL = 'manual',
}

@Entity('charges')
@Index(['mentorId', 'dueDate'])
@Index(['leadId'])
export class Charge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column({ type: 'uuid' })
  leadId: string;

  @Column({ type: 'uuid', nullable: true })
  subscriptionId?: string;

  @ManyToOne(() => MentorSubscription, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subscriptionId' })
  subscription?: MentorSubscription;

  @Column()
  description: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  dueDate: string;

  @Column({ type: 'enum', enum: ChargeStatus, default: ChargeStatus.PENDING })
  status: ChargeStatus;

  @Column({ type: 'enum', enum: ChargeMethod, default: ChargeMethod.PIX })
  method: ChargeMethod;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt?: Date;

  /** ID da cobrança no Asaas (pay_xxx) */
  @Column({ nullable: true })
  asaasChargeId?: string;

  @Column({ nullable: true })
  invoiceUrl?: string;

  @Column({ nullable: true })
  pixQrCode?: string;

  @Column({ nullable: true })
  pixCopyPaste?: string;

  @Column({ nullable: true })
  bankSlipUrl?: string;

  /** Última vez que dispararam lembrete WhatsApp */
  @Column({ type: 'timestamptz', nullable: true })
  lastReminderAt?: Date;

  @Column({ type: 'int', default: 0 })
  reminderCount: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
