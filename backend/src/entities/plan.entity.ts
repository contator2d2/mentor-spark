import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Planos definidos pelo Super Admin.
 * Limites e features por plano são consumidos pelo backend para gating
 * (criação de mentorados, integrações, IA, etc).
 */
@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string; // ex: 'free', 'starter', 'pro', 'enterprise'

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  priceMonthly: number;

  /** Stripe Price ID (price_xxx) — se não informado, plano não é cobrável online */
  @Column({ nullable: true })
  stripePriceId?: string;

  /** -1 = ilimitado */
  @Column({ type: 'int', default: 10 })
  maxMentorados: number;

  @Column({ type: 'int', default: 100 })
  maxLeads: number;

  @Column({ type: 'int', default: 100 })
  maxAiMessagesMonth: number;

  @Column({ default: false })
  allowWhatsapp: boolean;

  @Column({ default: true })
  allowAi: boolean;

  @Column({ default: false })
  allowCustomDomain: boolean;

  @Column({ default: false })
  allowMeetings: boolean;

  @Column({ default: false })
  allowAutomations: boolean;

  @Column({ default: false })
  allowLandingBuilder: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
