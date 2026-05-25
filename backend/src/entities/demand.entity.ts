import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';

export enum DemandStatus {
  NEW = 'new',
  ANALYSIS = 'analysis',
  PLANNED = 'planned',
  PRODUCTION = 'production',
  WAITING_FEEDBACK = 'waiting_feedback',
  REVIEW = 'review',
  ADJUSTMENTS = 'adjustments',
  APPROVED = 'approved',
  FINISHED = 'finished',
  CANCELED = 'canceled',
}

export enum DemandPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('demands')
@Index(['mentorId'])
@Index(['responsibleId'])
@Index(['agencyId'])
export class Demand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  department?: string; // Marketing, Administrativo, Financeiro, Vendas, etc.

  @Column()
  type: string; // post, video, copy, etc.

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  objective?: string;

  @Column({ nullable: true })
  targetAudience?: string;

  @Column({ type: 'enum', enum: DemandPriority, default: DemandPriority.MEDIUM })
  priority: DemandPriority;

  @Column({ type: 'enum', enum: DemandStatus, default: DemandStatus.NEW })
  status: DemandStatus;

  @Column({ type: 'timestamptz', nullable: true })
  desiredDeadline?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  definedDeadline?: Date;

  @Column({ type: 'uuid', nullable: true })
  responsibleId?: string;

  @Column({ type: 'jsonb', nullable: true })
  responsibleIds?: string[];

  @ManyToOne(() => User)
  @JoinColumn({ name: 'responsibleId' })
  responsible?: User;

  @Column({ type: 'uuid', nullable: true })
  agencyId?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'agencyId' })
  agency?: User;

  @Column({ type: 'jsonb', nullable: true })
  briefing?: any;

  @Column({ type: 'jsonb', nullable: true })
  checklist?: string[];

   @Column({ type: 'jsonb', nullable: true })
   links?: string[];
 
    @Column({ type: 'jsonb', nullable: true })
    references?: { url: string; description?: string }[];

  @Column({ default: true })
  notificationsEnabled: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  deliveredAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
