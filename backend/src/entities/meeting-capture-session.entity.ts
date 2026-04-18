import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Meeting } from './meeting.entity';

export type CaptureStatus =
  | 'pending'
  | 'preparing'
  | 'recording'
  | 'paused'
  | 'stopped'
  | 'uploaded'
  | 'inspecting'
  | 'chunking'
  | 'transcribing'
  | 'merging'
  | 'transcript_ready'
  | 'summarizing'
  | 'summarized'
  | 'failed';

@Entity('meeting_capture_sessions')
@Index(['meetingId'])
@Index(['status'])
export class MeetingCaptureSession {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'uuid' }) meetingId: string;
  @ManyToOne(() => Meeting, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meetingId' })
  meeting: Meeting;

  @Column({ type: 'uuid' }) tenantId: string;
  @Column({ type: 'uuid' }) initiatedByUserId: string;

  /** mic | tab | screen | mixed */
  @Column({ default: 'mic' }) sourceType: string;

  @Column({ nullable: true }) browserName?: string;
  @Column({ nullable: true }) browserVersion?: string;
  @Column({ nullable: true }) osName?: string;

  @Column({ type: 'timestamptz', nullable: true }) startedAt?: Date;
  @Column({ type: 'timestamptz', nullable: true }) endedAt?: Date;
  @Column({ type: 'int', default: 0 }) durationSeconds: number;

  @Column({ default: 'pending' }) status: CaptureStatus;

  @Column({ type: 'timestamptz', nullable: true }) lastHeartbeatAt?: Date;
  @Column({ type: 'text', nullable: true }) errorMessage?: string;

  /** Texto consolidado da transcrição (mirror para leitura rápida no card) */
  @Column({ type: 'text', nullable: true }) consolidatedTranscript?: string;

  /** Quantos chunks no total / quantos prontos (para barra de progresso) */
  @Column({ type: 'int', default: 0 }) totalChunks: number;
  @Column({ type: 'int', default: 0 }) completedChunks: number;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
