import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Lead } from './lead.entity';
import { User } from './user.entity';

export enum MentoredStage {
  INITIAL = 'initial',
  DIAGNOSIS = 'diagnosis',
  STRUCTURING = 'structuring',
  EXECUTION = 'execution',
  EVOLUTION = 'evolution',
  AT_RISK = 'at_risk',
  PAUSED = 'paused',
  COMPLETED = 'completed',
}

export enum MentoredStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CHURNED = 'churned',
  COMPLETED = 'completed',
}

/**
 * Núcleo do Prontuário Inteligente — 1:1 com Lead.
 * Concentra dados específicos de acompanhamento (scores, resumo executivo, stage do prontuário).
 */
@Entity('mentored_records')
@Unique(['mentorId', 'leadId'])
@Index(['mentorId'])
export class MentoredRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column({ type: 'uuid' })
  leadId: string;

  @ManyToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'leadId' })
  lead?: Lead;

  /** Snapshot do contato — o Lead já guarda, mas duplicamos para flexibilizar customização do mentor */
  @Column({ nullable: true })
  companyName?: string;

  @Column({ nullable: true })
  roleName?: string;

  @Column({ nullable: true })
  segment?: string;

  @Column({ nullable: true })
  origin?: string;

  // ============ Estágio do prontuário (diferente do stage comercial do Lead) ============
  @Column({ type: 'enum', enum: MentoredStage, default: MentoredStage.INITIAL })
  currentStage: MentoredStage;

  @Column({ type: 'enum', enum: MentoredStatus, default: MentoredStatus.ACTIVE })
  status: MentoredStatus;

  // ============ Scores recalculados periodicamente ============
  @Column({ type: 'int', default: 0 })
  overallScore: number;

  @Column({ type: 'int', default: 0 })
  engagementScore: number;

  @Column({ type: 'int', default: 0 })
  executionScore: number;

  @Column({ type: 'int', default: 0 })
  riskScore: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastRecalculatedAt?: Date;

  // ============ Resumo executivo (vivos e editáveis) ============
  /** Resumo gerado por IA — substituível a qualquer momento */
  @Column({ type: 'text', nullable: true })
  currentSummary?: string;

  /** Resumo escrito manualmente pelo mentor */
  @Column({ type: 'text', nullable: true })
  mentorSummary?: string;

  @Column({ type: 'text', nullable: true })
  mainObjective?: string;

  @Column({ type: 'text', nullable: true })
  mainPain?: string;

  @Column({ type: 'text', nullable: true })
  mainBottleneck?: string;

  @Column({ type: 'text', nullable: true })
  currentFocus?: string;

  @Column({ type: 'text', nullable: true })
  hypotheses?: string;

  @Column({ type: 'text', nullable: true })
  priorities?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
