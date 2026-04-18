import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Lead } from './lead.entity';

export type MeetingStatus =
  | 'scheduled'
  | 'confirmed'
  | 'ready'
  | 'in_progress'
  | 'ended'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type MeetingPlatform = 'google_meet' | 'zoom' | 'teams' | 'external' | 'in_person';

@Entity('meetings')
@Index(['mentorId'])
@Index(['mentorId', 'scheduledAt'])
export class Meeting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column({ type: 'uuid', nullable: true })
  leadId?: string;

  @ManyToOne(() => Lead, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'leadId' })
  lead?: Lead;

  @Column()
  title: string;

  /** Tipo livre: discovery, follow-up, mentoria, fechamento... */
  @Column({ nullable: true })
  meetingType?: string;

  @Column({ type: 'timestamptz' })
  scheduledAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  scheduledEnd?: Date;

  @Column({ type: 'int', nullable: true })
  durationMinutes?: number;

  @Column({ default: 'external' })
  platform: MeetingPlatform;

  @Column({ nullable: true })
  meetingUrl?: string;

  @Column({ nullable: true })
  audioUrl?: string;

  @Column({ type: 'text', nullable: true })
  transcript?: string;

  @Column({ type: 'text', nullable: true })
  aiSummary?: string;

  @Column({ type: 'jsonb', nullable: true })
  aiInsights?: { keyPoints: string[]; decisions: string[]; nextActions: string[] };

  @Column({ default: 'scheduled' })
  status: MeetingStatus;

  /** Se a reunião deve ter captura de áudio */
  @Column({ default: true })
  captureEnabled: boolean;

  /** Se está previsto compartilhamento de tela com áudio */
  @Column({ default: false })
  screenShareExpected: boolean;

  @Column({ type: 'text', nullable: true })
  preMeetingNotes?: string;

  @Column({ type: 'text', nullable: true })
  postMeetingNotes?: string;

  /** ID do evento criado no Google Calendar do mentor */
  @Column({ nullable: true })
  googleCalendarEventId?: string;

  /** Anexos da reunião (PDFs, slides, materiais de apoio, áudios externos). */
  @Column({ type: 'jsonb', nullable: true })
  attachments?: Array<{ url: string; name: string; kind: string; mimetype: string; size: number; uploadedAt: string }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
