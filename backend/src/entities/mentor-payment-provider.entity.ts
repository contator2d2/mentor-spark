import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum PaymentProviderType {
  ASAAS = 'asaas',
  MERCADO_PAGO = 'mercado_pago',
  STRIPE = 'stripe',
  MANUAL = 'manual',
}

export enum PaymentProviderStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
}

/**
 * Provedor de pagamento configurado por mentor.
 * Cada mentor pode ter múltiplos provedores (1 por tipo) e escolher qual usar por evento.
 *
 * - asaas: usa apiKey do mentor (pode coexistir com chave global do super admin)
 * - mercado_pago: accessToken do mentor (TEST- ou APP_USR-)
 * - stripe: secretKey (sk_test_/sk_live_) — BYOK
 * - manual: link externo de pagamento (Pix copia-cola, Hotmart, etc.) — sem cobrança automática
 */
@Entity('mentor_payment_providers')
@Index(['mentorId'])
@Index(['mentorId', 'type'], { unique: true })
export class MentorPaymentProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column({ type: 'enum', enum: PaymentProviderType })
  type: PaymentProviderType;

  /** Rótulo amigável escolhido pelo mentor (ex: "Asaas Empresa X") */
  @Column({ nullable: true })
  label?: string;

  /** API key / access token / secret key — armazenado server-side */
  @Column({ nullable: true, select: false })
  apiKey?: string;

  /** sandbox | production (default sandbox) */
  @Column({ default: 'sandbox' })
  environment: string;

  /**
   * Para `manual`: instruções estáticas de pagamento (Pix copia-cola, dados bancários,
   * link Hotmart/Sympla, etc.) exibidas ao participante.
   */
  @Column({ type: 'text', nullable: true })
  manualInstructions?: string;

  /** URL externa para o participante (Hotmart, Sympla, Stripe Payment Link). */
  @Column({ nullable: true })
  manualCheckoutUrl?: string;

  @Column({ type: 'enum', enum: PaymentProviderStatus, default: PaymentProviderStatus.ACTIVE })
  status: PaymentProviderStatus;

  /** Metadata específica do provedor (ex: webhook signing secret) */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
