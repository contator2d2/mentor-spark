import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

/** Token de onboarding enviado ao lead para preencher dados completos antes do contrato. */
@Entity('lead_onboarding_tokens')
@Index(['leadId'])
export class LeadOnboardingToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column({ type: 'uuid' })
  leadId: string;

  @Column({ unique: true })
  token: string;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
