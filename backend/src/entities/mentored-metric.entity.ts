import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum MetricFrequency { DAILY = 'daily', WEEKLY = 'weekly', MONTHLY = 'monthly', QUARTERLY = 'quarterly' }
export enum MetricTrend { UP = 'up', DOWN = 'down', FLAT = 'flat' }

/**
 * Indicador customizável por mentor/mentorado.
 * Histórico de pontos é salvo em `history` (JSON) para gráficos de tendência simples.
 */
@Entity('mentored_metrics')
@Index(['recordId'])
@Index(['mentorId'])
export class MentoredMetric {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) mentorId: string;
  @Column({ type: 'uuid' }) recordId: string;

  @Column() name: string;
  @Column({ nullable: true }) category?: string;
  @Column({ nullable: true }) unit?: string;

  @Column({ type: 'numeric', precision: 18, scale: 4, nullable: true })
  currentValue?: number;

  @Column({ type: 'numeric', precision: 18, scale: 4, nullable: true })
  previousValue?: number;

  @Column({ type: 'numeric', precision: 18, scale: 4, nullable: true })
  targetValue?: number;

  @Column({ type: 'enum', enum: MetricTrend, nullable: true })
  trend?: MetricTrend;

  @Column({ type: 'enum', enum: MetricFrequency, default: MetricFrequency.MONTHLY })
  frequency: MetricFrequency;

  @Column({ type: 'date', nullable: true })
  referenceDate?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  /** Pontos históricos { date: ISO, value: number } — máx 24 últimos */
  @Column({ type: 'jsonb', nullable: true })
  history?: Array<{ date: string; value: number }>;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
