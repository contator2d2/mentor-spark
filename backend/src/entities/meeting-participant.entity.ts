import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { Meeting } from './meeting.entity';

@Entity('meeting_participants')
@Index(['meetingId'])
export class MeetingParticipant {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'uuid' }) meetingId: string;
  @ManyToOne(() => Meeting, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meetingId' })
  meeting: Meeting;

  @Column() name: string;
  @Column({ nullable: true }) email?: string;
  @Column({ nullable: true }) company?: string;
  /** owner | mentor | lead | guest */
  @Column({ default: 'guest' }) roleType: string;
  /** expected | confirmed | absent | joined */
  @Column({ default: 'expected' }) attendanceStatus: string;
  @Column({ type: 'timestamptz', nullable: true }) joinedAt?: Date;
  @Column({ type: 'timestamptz', nullable: true }) leftAt?: Date;
  @Column({ type: 'text', nullable: true }) notes?: string;

  @CreateDateColumn() createdAt: Date;
}
