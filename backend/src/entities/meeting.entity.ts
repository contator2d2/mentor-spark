import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Lead } from './lead.entity';

@Entity('meetings')
@Index(['mentorId'])
export class Meeting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column({ type: 'uuid' })
  leadId: string;

  @ManyToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'leadId' })
  lead: Lead;

  @Column()
  title: string;

  @Column({ type: 'timestamptz' })
  scheduledAt: Date;

  @Column({ type: 'int', nullable: true })
  durationMinutes?: number;

  @Column({ nullable: true })
  meetingUrl?: string; // Meet/Zoom link

  @Column({ type: 'text', nullable: true })
  transcript?: string;

  @Column({ type: 'text', nullable: true })
  aiSummary?: string;

  @Column({ type: 'jsonb', nullable: true })
  aiInsights?: { keyPoints: string[]; decisions: string[]; nextActions: string[] };

  @Column({ default: 'scheduled' })
  status: string; // scheduled | done | cancelled

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
