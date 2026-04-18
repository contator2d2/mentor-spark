import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { CaptureEvent } from './capture-event.entity';

export enum RegistrationStatus {
  REGISTERED = 'registered',
  CONFIRMED = 'confirmed',
  CHECKED_IN = 'checked_in',
  NO_SHOW = 'no_show',
  CANCELLED = 'cancelled',
}

export enum RegistrationPaymentStatus {
  NOT_REQUIRED = 'not_required',
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

/** Inscrição de uma pessoa em um evento (lista de presença + check-in via QR). */
@Entity('event_registrations')
@Index(['eventId'])
@Index(['eventId', 'email'], { unique: true })
@Index(['ticketCode'], { unique: true })
export class EventRegistration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => CaptureEvent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: CaptureEvent;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  company?: string;

  @Column({ nullable: true })
  role?: string;

  /** Código curto único usado no QR pessoal de check-in */
  @Column()
  ticketCode: string;

  @Column({ type: 'enum', enum: RegistrationStatus, default: RegistrationStatus.REGISTERED })
  status: RegistrationStatus;

  @Column({ type: 'timestamptz', nullable: true })
  checkedInAt?: Date;

  /** Snapshot dos canais por onde foi notificado (email, whatsapp, push) */
  @Column({ type: 'jsonb', nullable: true })
  notificationsSent?: Record<string, string>;

  /** FK para o lead criado a partir desta inscrição (quando convertido) */
  @Column({ type: 'uuid', nullable: true })
  leadId?: string;

  /** Marca quando o NPS foi enviado */
  @Column({ type: 'timestamptz', nullable: true })
  npsSentAt?: Date;

  /** Score NPS 0-10 */
  @Column({ type: 'int', nullable: true })
  npsScore?: number;

  /** Comentário do NPS */
  @Column({ type: 'text', nullable: true })
  npsComment?: string;

  @Column({ type: 'timestamptz', nullable: true })
  npsAnsweredAt?: Date;

  // ==================== Pagamento ====================
  @Column({ type: 'uuid', nullable: true })
  tierId?: string;

  @Column({ type: 'enum', enum: RegistrationPaymentStatus, default: RegistrationPaymentStatus.NOT_REQUIRED })
  paymentStatus: RegistrationPaymentStatus;

  /** Total pago em centavos (consolidado a partir de event_payments). */
  @Column({ type: 'int', default: 0 })
  amountPaidCents: number;

  @Column({ default: 'BRL' })
  currency: string;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
