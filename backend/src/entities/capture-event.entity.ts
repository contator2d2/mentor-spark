import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum EventModality {
  PHYSICAL = 'physical',
  VIRTUAL = 'virtual',
  HYBRID = 'hybrid',
}

export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  LIVE = 'live',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
}

/** Evento de captação (workshop, palestra, feira) — base para origem de leads. */
@Entity('events')
@Index(['mentorId'])
export class CaptureEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  location?: string;

  /** URL da sala virtual (Meet, Zoom, etc.) — usado quando virtual/hybrid */
  @Column({ nullable: true })
  virtualUrl?: string;

  @Column({ type: 'enum', enum: EventModality, default: EventModality.PHYSICAL })
  modality: EventModality;

  @Column({ type: 'enum', enum: EventStatus, default: EventStatus.PUBLISHED })
  status: EventStatus;

  @Column({ type: 'timestamptz', nullable: true })
  startsAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endsAt?: Date;

  /** Slug curto único usado no QR/link público (/c/:mentorSlug?event=xyz) */
  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  /** Capacidade máxima (null = ilimitado) */
  @Column({ type: 'int', nullable: true })
  capacity?: number;

  /** Pergunta NPS customizada (default: padrão) */
  @Column({ type: 'text', nullable: true })
  npsQuestion?: string;

  /** Habilita envio automático de NPS após o evento */
  @Column({ default: true })
  npsEnabled: boolean;

  /** Horas após endsAt para disparar NPS automaticamente */
  @Column({ type: 'int', default: 2 })
  npsDelayHours: number;

  /** ID do test_template a oferecer aos inscritos pós-evento */
  @Column({ type: 'uuid', nullable: true })
  defaultTestTemplateId?: string;

  /** Imagem de capa (URL) */
  @Column({ nullable: true })
  coverImageUrl?: string;

  @Column({ default: true })
  isActive: boolean;

  // ==================== Pagamento ====================
  /** Evento cobra pelo ingresso? Se false → tudo grátis (compatibilidade retro). */
  @Column({ default: false })
  isPaid: boolean;

  /**
   * Modo de pagamento:
   *  - free: sempre grátis
   *  - optional: ticket sempre liberado, pagamento é uma contribuição opcional
   *  - required: ticket só fica `confirmed` após pagamento
   */
  @Column({ default: 'optional' })
  paymentMode: string;

  /** Provedor de pagamento escolhido pelo mentor para este evento (FK MentorPaymentProvider). */
  @Column({ type: 'uuid', nullable: true })
  paymentProviderId?: string;

  /** Moeda padrão do evento (lotes podem sobrescrever). */
  @Column({ default: 'BRL' })
  currency: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
