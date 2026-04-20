import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum TrailAccessRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DENIED = 'denied',
  PAID = 'paid',
  CANCELED = 'canceled',
}

/**
 * Solicitação do mentorado para desbloquear uma trilha — manual (mentor aprova)
 * ou via cobrança (chargeId vinculado).
 */
@Entity('trail_access_requests')
@Index(['mentorId', 'status'])
@Index(['leadId'])
@Index(['trailId'])
export class TrailAccessRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column({ type: 'uuid' })
  trailId: string;

  @Column({ type: 'uuid' })
  leadId: string;

  @Column({ type: 'enum', enum: TrailAccessRequestStatus, default: TrailAccessRequestStatus.PENDING })
  status: TrailAccessRequestStatus;

  @Column({ type: 'text', nullable: true })
  message?: string;

  /** Quando a trilha é paga, guardamos a cobrança gerada. */
  @Column({ type: 'uuid', nullable: true })
  chargeId?: string;

  @Column({ type: 'int', nullable: true })
  amountCents?: number;

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}