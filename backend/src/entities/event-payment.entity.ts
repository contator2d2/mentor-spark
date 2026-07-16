import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { PaymentProviderType } from './mentor-payment-provider.entity';

export enum EventPaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

/**
 * Cobrança gerada para uma inscrição em evento pago.
 * 1 inscrição → 0..N pagamentos (em caso de tentativa repetida).
 */
@Entity('event_payments')
@Index(['registrationId'])
@Index(['eventId'])
@Index(['mentorId'])
@Index(['providerType', 'externalId'])
export class EventPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  registrationId: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column({ type: 'uuid', nullable: true })
  tierId?: string;

  @Column({ type: 'enum', enum: PaymentProviderType })
  providerType: PaymentProviderType;

  /** ID da cobrança no provedor externo (Asaas paymentId, MP preference_id, Stripe checkout session id). */
  @Column({ nullable: true })
  externalId?: string;

  /** URL para o participante pagar (checkout / pix qrcode page). */
  @Column({ type: 'text', nullable: true })
  checkoutUrl?: string;

  /** PIX copia e cola (quando aplicável). */
  @Column({ type: 'text', nullable: true })
  pixPayload?: string;

  /** Imagem base64 do QR Pix (quando aplicável). */
  @Column({ type: 'text', nullable: true })
  pixQrImage?: string;

  @Column({ type: 'int' })
  amountCents: number;

  /** Valor original (antes de cupom), em centavos. Se sem cupom = amountCents. */
  @Column({ type: 'int', nullable: true })
  originalAmountCents?: number;

  /** Cupom aplicado (opcional). */
  @Column({ type: 'uuid', nullable: true })
  couponId?: string;

  /** Valor descontado por cupom (centavos). */
  @Column({ type: 'int', default: 0 })
  discountCents: number;

  @Column({ default: 'BRL' })
  currency: string;

  @Column({ type: 'enum', enum: EventPaymentStatus, default: EventPaymentStatus.PENDING })
  status: EventPaymentStatus;

  /** Quando foi confirmado (webhook). */
  @Column({ type: 'timestamptz', nullable: true })
  paidAt?: Date;

  /** Payload bruto do webhook para auditoria. */
  @Column({ type: 'jsonb', nullable: true })
  rawPayload?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
