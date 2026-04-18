import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum SubscriptionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
  PAUSED = 'paused',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  SEMIANNUAL = 'semiannual',
  ANNUAL = 'annual',
}

/**
 * Assinatura/mensalidade que o MENTOR cobra do MENTORADO/LEAD.
 * Independente da assinatura SaaS (que está em users.planId).
 */
@Entity('mentor_subscriptions')
@Index(['mentorId'])
@Index(['leadId'])
export class MentorSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  /** Lead/Mentorado pagador */
  @Column({ type: 'uuid' })
  leadId: string;

  @Column()
  productName: string; // Ex: "Mentoria Premium"

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: BillingCycle, default: BillingCycle.MONTHLY })
  cycle: BillingCycle;

  @Column({ type: 'int', default: 1 })
  dayOfMonth: number; // dia do vencimento (1-28)

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date', nullable: true })
  endDate?: string; // null = indefinido

  @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.PENDING })
  status: SubscriptionStatus;

  /** ID do customer no Asaas (cus_xxx) */
  @Column({ nullable: true })
  asaasCustomerId?: string;

  /** ID da assinatura no Asaas (sub_xxx) */
  @Column({ nullable: true })
  asaasSubscriptionId?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
