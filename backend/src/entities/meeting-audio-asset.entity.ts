import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { MeetingCaptureSession } from './meeting-capture-session.entity';

export type AssetType = 'original' | 'chunk' | 'merged';

@Entity('meeting_audio_assets')
@Index(['captureSessionId'])
export class MeetingAudioAsset {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'uuid' }) captureSessionId: string;
  @ManyToOne(() => MeetingCaptureSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'captureSessionId' })
  session: MeetingCaptureSession;

  @Column({ default: 'original' }) assetType: AssetType;
  @Column() storageUrl: string; // /uploads/meetings/...
  @Column({ nullable: true }) mimeType?: string;
  @Column({ nullable: true }) codec?: string;
  @Column({ type: 'float', nullable: true }) durationSeconds?: number;
  @Column({ type: 'bigint', nullable: true }) sizeBytes?: number;
  @Column({ nullable: true }) checksum?: string;

  /** pending | inspected | chunked | failed | done */
  @Column({ default: 'pending' }) processingStatus: string;

  @CreateDateColumn() createdAt: Date;
}
