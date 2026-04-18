import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Availability } from './availability.entity';

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
}

@Entity('bookings')
@Index(['mentorId', 'startsAt'])
@Index(['availabilityId', 'startsAt'])
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column({ type: 'uuid' })
  availabilityId: string;

  @ManyToOne(() => Availability, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'availabilityId' })
  availability?: Availability;

  /** Lead criado a partir do agendamento (se aplicável) */
  @Column({ type: 'uuid', nullable: true })
  leadId?: string;

  @Column()
  guestName: string;

  @Column()
  guestEmail: string;

  @Column({ nullable: true })
  guestPhone?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'timestamptz' })
  endsAt: Date;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.CONFIRMED })
  status: BookingStatus;

  /** Link da reunião gerado (Google Meet ou outro) */
  @Column({ nullable: true })
  meetingUrl?: string;

  /** Google Calendar event ID (para sincronização/exclusão) */
  @Column({ nullable: true })
  googleEventId?: string;

  /** Token único para cancelamento via link público */
  @Column({ unique: true })
  cancelToken: string;

  @Column({ type: 'timestamptz', nullable: true })
  reminderSentAt?: Date;

  /** Lembrete de 1h antes (canal extra) */
  @Column({ type: 'timestamptz', nullable: true })
  reminder1hSentAt?: Date;

  @CreateDateColumn()
  createdAt: Date;
}
