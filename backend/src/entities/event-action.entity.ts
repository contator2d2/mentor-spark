import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

export enum EventActionType {
  CONFIRMATION = 'confirmation',
  REMINDER = 'reminder',
  CHECKIN = 'checkin',
  NPS_SENT = 'nps_sent',
  TEST_SENT = 'test_sent',
  MEETING_LINK_SENT = 'meeting_link_sent',
  COMPANY_ANALYSIS_SENT = 'company_analysis_sent',
  CUSTOM = 'custom',
}

/** Log de ações executadas em massa ou individuais sobre inscritos do evento. */
@Entity('event_actions')
@Index(['eventId'])
export class EventAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @Column({ type: 'uuid', nullable: true })
  registrationId?: string;

  @Column({ type: 'enum', enum: EventActionType })
  type: EventActionType;

  /** email | whatsapp | push */
  @Column({ nullable: true })
  channel?: string;

  /** ok | failed */
  @Column({ default: 'ok' })
  status: string;

  @Column({ type: 'text', nullable: true })
  message?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any;

  @CreateDateColumn()
  createdAt: Date;
}
