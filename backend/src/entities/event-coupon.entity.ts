import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum CouponDiscountType {
  PERCENT = 'percent',
  FIXED = 'fixed',
}

/**
 * Cupom de desconto para inscrições em evento pago.
 * Escopo por evento — o mentor cria dentro do próprio evento.
 */
@Entity('event_coupons')
@Index(['eventId'])
@Index(['eventId', 'code'], { unique: true })
export class EventCoupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  /** Código digitado pelo usuário (armazenado em maiúsculas). */
  @Column()
  code: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: CouponDiscountType, default: CouponDiscountType.PERCENT })
  discountType: CouponDiscountType;

  /**
   * Se PERCENT: 1..100.
   * Se FIXED: valor em centavos abatido do total.
   */
  @Column({ type: 'int', default: 0 })
  discountValue: number;

  /** Máx. de usos totais (null = ilimitado). */
  @Column({ type: 'int', nullable: true })
  maxUses?: number;

  /** Usos já confirmados (incrementado no markPaid). */
  @Column({ type: 'int', default: 0 })
  usedCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  startsAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endsAt?: Date;

  /** Se preenchido, cupom só vale para estes tiers. Null/vazio = todos. */
  @Column({ type: 'jsonb', nullable: true })
  applicableTierIds?: string[];

  /** 1 uso por email/CPF (unicidade em event_coupon_redemptions). */
  @Column({ default: true })
  oneUsePerPerson: boolean;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}