import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

export enum TimelineEventType {
  RECORD_CREATED = 'record_created',
  STAGE_CHANGED = 'stage_changed',
  STATUS_CHANGED = 'status_changed',
  SUMMARY_UPDATED = 'summary_updated',
  OBJECTIVE_ADDED = 'objective_added',
  OBJECTIVE_COMPLETED = 'objective_completed',
  PAIN_ADDED = 'pain_added',
  METRIC_UPDATED = 'metric_updated',
  ALERT_RAISED = 'alert_raised',
  ALERT_RESOLVED = 'alert_resolved',
  PRIVATE_NOTE = 'private_note',
  MATERIAL_SHARED = 'material_shared',
  MENTOR_ACTION = 'mentor_action',
  CUSTOM = 'custom',
}

/**
 * Eventos persistidos do prontuário — diferentes do timeline agregado em runtime.
 * Aqui ficam ações do mentor + transições importantes.
 */
@Entity('mentored_timeline_events')
@Index(['recordId'])
@Index(['mentorId'])
@Index(['type'])
export class MentoredTimelineEvent {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) mentorId: string;
  @Column({ type: 'uuid' }) recordId: string;

  @Column({ type: 'enum', enum: TimelineEventType }) type: TimelineEventType;
  @Column() title: string;
  @Column({ type: 'text', nullable: true }) description?: string;

  @Column({ type: 'jsonb', nullable: true }) meta?: Record<string, any>;

  /** Origem: system | mentor | ai */
  @Column({ default: 'system' }) source: string;

  @CreateDateColumn() createdAt: Date;
}
