import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { User } from './user.entity';

export enum LeadStage {
  NEW = 'new',
  TESTED = 'tested',
  ENGAGED = 'engaged',
  NEGOTIATING = 'negotiating',
  CLIENT = 'client',
  LOST = 'lost',
}

export enum LeadTemperature {
  COLD = 'cold',
  WARM = 'warm',
  HOT = 'hot',
}

@Entity('leads')
@Index(['mentorId', 'stage'])
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @ManyToOne(() => User, (u) => u.leads, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mentorId' })
  mentor: User;

  /** Usuário criado para o prospect (com senha enviada por email) */
  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  company?: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  revenue?: number;

  @Column({ nullable: true })
  source?: string; // evento, qr, link

  @Column({ type: 'enum', enum: LeadStage, default: LeadStage.NEW })
  stage: LeadStage;

  @Column({ type: 'enum', enum: LeadTemperature, nullable: true })
  temperature?: LeadTemperature;

  @Column({ type: 'int', nullable: true })
  score?: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
