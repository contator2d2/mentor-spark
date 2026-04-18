import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum AlertSeverity { INFO = 'info', WARN = 'warn', CRITICAL = 'critical' }
export enum AlertStatus { OPEN = 'open', ACKNOWLEDGED = 'acknowledged', RESOLVED = 'resolved', DISMISSED = 'dismissed' }
export enum AlertType {
  CHURN_RISK = 'churn_risk',
  LOW_EXECUTION = 'low_execution',
  LOW_ENGAGEMENT = 'low_engagement',
  IDLE = 'idle',
  METRIC_DROP = 'metric_drop',
  MISSED_MEETING = 'missed_meeting',
  OVERDUE_TASK = 'overdue_task',
  CUSTOM = 'custom',
}

@Entity('mentored_alerts')
@Index(['recordId'])
@Index(['mentorId'])
@Index(['status'])
export class MentoredAlert {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) mentorId: string;
  @Column({ type: 'uuid' }) recordId: string;

  @Column({ type: 'enum', enum: AlertType }) type: AlertType;
  @Column({ type: 'enum', enum: AlertSeverity, default: AlertSeverity.WARN }) severity: AlertSeverity;
  @Column({ type: 'enum', enum: AlertStatus, default: AlertStatus.OPEN }) status: AlertStatus;

  @Column() title: string;
  @Column({ type: 'text', nullable: true }) description?: string;

  /** Identificador determinístico para evitar duplicação de alertas automáticos */
  @Column({ nullable: true }) signature?: string;

  @Column({ type: 'jsonb', nullable: true }) meta?: Record<string, any>;

  @Column({ type: 'timestamptz', nullable: true }) acknowledgedAt?: Date;
  @Column({ type: 'timestamptz', nullable: true }) resolvedAt?: Date;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
