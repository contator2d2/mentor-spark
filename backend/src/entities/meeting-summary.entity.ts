import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { Meeting } from './meeting.entity';
import { MeetingCaptureSession } from './meeting-capture-session.entity';

@Entity('meeting_summaries')
@Index(['meetingId'])
export class MeetingSummary {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'uuid' }) meetingId: string;
  @ManyToOne(() => Meeting, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meetingId' })
  meeting: Meeting;

  @Column({ type: 'uuid', nullable: true }) captureSessionId?: string;
  @ManyToOne(() => MeetingCaptureSession, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'captureSessionId' })
  session?: MeetingCaptureSession;

  @Column({ type: 'text' }) summaryText: string;
  @Column({ type: 'text', nullable: true }) decisionsText?: string;
  @Column({ type: 'text', nullable: true }) nextStepsText?: string;
  @Column({ nullable: true }) classification?: string;
  @Column({ nullable: true }) aiProvider?: string;

  @CreateDateColumn() createdAt: Date;
}
