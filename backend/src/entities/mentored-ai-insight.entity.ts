import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

export enum InsightType {
  EXECUTIVE_SUMMARY = 'executive_summary',
  AGENDA_SUGGESTION = 'agenda_suggestion',
  RISK_ANALYSIS = 'risk_analysis',
  PATTERN_DETECTION = 'pattern_detection',
  NEXT_STEPS = 'next_steps',
  PROGRESS_REPORT = 'progress_report',
  CUSTOM = 'custom',
}

/**
 * Insights gerados pela IA — históricos preservados para acompanhamento de evolução.
 */
@Entity('mentored_ai_insights')
@Index(['recordId'])
@Index(['mentorId'])
@Index(['type'])
export class MentoredAIInsight {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) mentorId: string;
  @Column({ type: 'uuid' }) recordId: string;

  @Column({ type: 'enum', enum: InsightType }) type: InsightType;
  @Column() title: string;
  @Column({ type: 'text' }) content: string;

  /** Snapshot dos dados que alimentaram a geração — permite auditoria */
  @Column({ type: 'jsonb', nullable: true }) sourceMeta?: Record<string, any>;

  /** Modelo/provider usado */
  @Column({ nullable: true }) model?: string;

  /** Promovido para "resumo oficial" do prontuário (currentSummary) */
  @Column({ type: 'boolean', default: false }) promoted: boolean;

  @CreateDateColumn() createdAt: Date;
}
