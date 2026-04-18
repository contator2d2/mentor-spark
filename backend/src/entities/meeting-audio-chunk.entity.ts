import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { MeetingCaptureSession } from './meeting-capture-session.entity';

export type ChunkStatus = 'pending' | 'queued' | 'transcribing' | 'transcribed' | 'failed';

@Entity('meeting_audio_chunks')
@Index(['captureSessionId', 'orderIndex'])
export class MeetingAudioChunk {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'uuid' }) captureSessionId: string;
  @ManyToOne(() => MeetingCaptureSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'captureSessionId' })
  session: MeetingCaptureSession;

  @Column({ type: 'uuid', nullable: true }) originalAssetId?: string;
  @Column({ type: 'uuid', nullable: true }) chunkAssetId?: string;
  @Column() storageUrl: string;

  @Column({ type: 'int' }) orderIndex: number;
  @Column({ type: 'float', default: 0 }) startSecond: number;
  @Column({ type: 'float', default: 0 }) endSecond: number;
  @Column({ type: 'float', default: 0 }) durationSeconds: number;
  @Column({ type: 'bigint', nullable: true }) sizeBytes?: number;

  @Column({ default: 'pending' }) transcriptionStatus: ChunkStatus;
  @Column({ type: 'int', default: 0 }) retryCount: number;
  @Column({ type: 'text', nullable: true }) transcript?: string;
  @Column({ type: 'text', nullable: true }) errorMessage?: string;

  @CreateDateColumn() createdAt: Date;
}
