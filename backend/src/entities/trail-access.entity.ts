import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Unique,
} from 'typeorm';

export enum TrailAccessSource {
  /** Liberado manualmente pelo mentor para esse lead. */
  MANUAL = 'manual',
  /** Veio do pagamento de uma cobrança (charge.id em sourceRef). */
  PAYMENT = 'payment',
  /** Aprovação de uma TrailAccessRequest (request.id em sourceRef). */
  REQUEST = 'request',
}

/**
 * Override individual: garante que um lead específico tenha acesso a uma trilha,
 * independentemente de grupos / pré-requisitos / drip.
 * Quando `expiresAt` é nulo, o acesso é vitalício.
 */
@Entity('trail_accesses')
@Unique(['trailId', 'leadId'])
@Index(['leadId'])
@Index(['mentorId'])
export class TrailAccess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column({ type: 'uuid' })
  trailId: string;

  @Column({ type: 'uuid' })
  leadId: string;

  @Column({ type: 'enum', enum: TrailAccessSource, default: TrailAccessSource.MANUAL })
  source: TrailAccessSource;

  @Column({ nullable: true })
  sourceRef?: string;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  @CreateDateColumn()
  createdAt: Date;
}