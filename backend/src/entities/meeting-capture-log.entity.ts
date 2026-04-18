import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { MeetingCaptureSession } from './meeting-capture-session.entity';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

@Entity('meeting_capture_logs')
@Index(['captureSessionId', 'createdAt'])
export class MeetingCaptureLog {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'uuid' }) captureSessionId: string;
  @ManyToOne(() => MeetingCaptureSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'captureSessionId' })
  session: MeetingCaptureSession;

  @Column({ default: 'info' }) level: LogLevel;
  @Column() eventType: string; // mic_permission_denied, upload_complete, chunk_failed...
  @Column({ type: 'text' }) message: string;
  @Column({ type: 'jsonb', nullable: true }) metadata?: Record<string, any>;

  @CreateDateColumn() createdAt: Date;
}
