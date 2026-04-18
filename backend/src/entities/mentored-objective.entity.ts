import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum ObjectivePriority { LOW = 'low', MEDIUM = 'medium', HIGH = 'high' }
export enum ObjectiveStatus {
  PLANNED = 'planned', IN_PROGRESS = 'in_progress', DONE = 'done', PAUSED = 'paused', CANCELLED = 'cancelled',
}

@Entity('mentored_objectives')
@Index(['recordId'])
@Index(['mentorId'])
export class MentoredObjective {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) mentorId: string;
  @Column({ type: 'uuid' }) recordId: string;

  @Column() title: string;
  @Column({ type: 'text', nullable: true }) description?: string;
  @Column({ nullable: true }) category?: string;

  @Column({ type: 'enum', enum: ObjectivePriority, default: ObjectivePriority.MEDIUM })
  priority: ObjectivePriority;

  @Column({ type: 'enum', enum: ObjectiveStatus, default: ObjectiveStatus.PLANNED })
  status: ObjectiveStatus;

  @Column({ type: 'date', nullable: true }) dueDate?: string;
  @Column({ type: 'date', nullable: true }) reviewDate?: string;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
