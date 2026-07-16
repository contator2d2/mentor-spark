import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

/**
 * Registro de utilização de cupom por uma inscrição.
 * Garante 1 uso por (couponId, email) e/ou (couponId, cpfCnpj).
 */
@Entity('event_coupon_redemptions')
@Index(['couponId'])
@Index(['registrationId'])
@Index(['couponId', 'email'], { unique: true })
export class EventCouponRedemption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  couponId: string;

  @Column({ type: 'uuid' })
  registrationId: string;

  @Column({ type: 'uuid', nullable: true })
  paymentId?: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  cpfCnpj?: string;

  /** Valor descontado (centavos). */
  @Column({ type: 'int', default: 0 })
  discountCents: number;

  @CreateDateColumn()
  createdAt: Date;
}