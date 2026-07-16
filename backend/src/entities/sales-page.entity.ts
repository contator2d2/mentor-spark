import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum SalesPageProductType {
  ACADEMY_COURSE = 'academy_course',
  MENTORSHIP = 'mentorship',
  EBOOK = 'ebook',
  EVENT = 'event',
  OTHER = 'other',
}

export enum SalesPagePaymentMode {
  ONE_TIME = 'one_time',
  SUBSCRIPTION = 'subscription',
}

export interface SalesPageFeature {
  icon?: string;
  title: string;
  text?: string;
}
export interface SalesPageFaq {
  q: string;
  a: string;
}
export interface SalesPageTestimonial {
  name: string;
  role?: string;
  quote: string;
  avatarUrl?: string;
}

/**
 * Página de vendas 1 produto = 1 página, publicada em /p/:mentorSlug/:pageSlug.
 * Checkout transparente Asaas usa o MentorPaymentProvider vinculado.
 */
@Entity('sales_pages')
@Index(['mentorId'])
@Index(['mentorId', 'slug'], { unique: true })
export class SalesPage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column({ length: 80 })
  slug: string;

  // ---- Produto ----
  @Column({ type: 'enum', enum: SalesPageProductType, default: SalesPageProductType.OTHER })
  productType: SalesPageProductType;

  /** ID opcional do curso Academy / mentoria / evento vinculado (para liberar acesso via webhook). */
  @Column({ type: 'uuid', nullable: true })
  productRefId?: string;

  // ---- Conteúdo ----
  @Column()
  title: string;

  @Column({ nullable: true })
  headline?: string;

  @Column({ type: 'text', nullable: true })
  subheadline?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  heroImageUrl?: string;

  @Column({ nullable: true })
  videoUrl?: string;

  @Column({ type: 'jsonb', default: '[]' })
  features: SalesPageFeature[];

  @Column({ type: 'jsonb', default: '[]' })
  faqs: SalesPageFaq[];

  @Column({ type: 'jsonb', default: '[]' })
  testimonials: SalesPageTestimonial[];

  @Column({ type: 'jsonb', default: '[]' })
  badges: string[];

  @Column({ nullable: true })
  guaranteeText?: string;

  @Column({ default: 'Quero garantir agora' })
  ctaText: string;

  // ---- Preço ----
  @Column({ type: 'int', default: 0 })
  priceCents: number;

  @Column({ length: 3, default: 'BRL' })
  currency: string;

  @Column({ type: 'int', nullable: true })
  originalPriceCents?: number;

  @Column({ type: 'int', default: 1 })
  maxInstallments: number;

  @Column({ type: 'enum', enum: SalesPagePaymentMode, default: SalesPagePaymentMode.ONE_TIME })
  paymentMode: SalesPagePaymentMode;

  /** Se subscription: MONTHLY | QUARTERLY | SEMIANNUALLY | YEARLY */
  @Column({ nullable: true })
  subscriptionCycle?: string;

  // ---- Provider Asaas por mentor ----
  @Column({ type: 'uuid', nullable: true })
  paymentProviderId?: string;

  // ---- Publicação ----
  @Column({ default: false })
  published: boolean;

  @Column({ type: 'jsonb', nullable: true })
  theme?: { primaryColor?: string; accentColor?: string; bgColor?: string };

  @Column({ type: 'jsonb', nullable: true })
  seo?: { title?: string; description?: string; ogImage?: string };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}