import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn } from 'typeorm';
import { MeetingCaptureSession } from './meeting-capture-session.entity';

@Entity('meeting_capture_heartbeats')
@Index(['captureSessionId', 'timestamp'])
export class MeetingCaptureHeartbeat {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'uuid' }) captureSessionId: string;
  @ManyToOne(() => MeetingCaptureSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'captureSessionId' })
  session: MeetingCaptureSession;

  @Column({ type: 'timestamptz' }) timestamp: Date;
  @Column({ type: 'float', default: 0 }) audioLevel: number;
  @Column({ default: 'ok' }) streamStatus: string;
  @Column({ default: 'mic' }) sourceType: string;
  @Column({ type: 'text', nullable: true }) notes?: string;

  @CreateDateColumn() createdAt: Date;
}
