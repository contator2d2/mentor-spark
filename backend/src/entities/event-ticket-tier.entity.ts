import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { CaptureEvent } from './capture-event.entity';

/**
 * Lote/categoria de ingresso de um evento (1º lote, 2º lote, VIP, Estudante, etc.).
 * Mentor define o preço, qtd disponível, validade e visibilidade.
 */
@Entity('event_ticket_tiers')
@Index(['eventId'])
export class EventTicketTier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => CaptureEvent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: CaptureEvent;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  /** Preço em centavos (ex: 4990 = R$ 49,90). 0 = grátis. */
  @Column({ type: 'int', default: 0 })
  priceCents: number;

  /** Moeda ISO 4217 (BRL/USD/EUR). Default BRL. */
  @Column({ default: 'BRL' })
  currency: string;

  /** Quantidade total disponível (null = ilimitado). */
  @Column({ type: 'int', nullable: true })
  quantity?: number;

  /** Quantidade já vendida/reservada — atualizado pelo backend. */
  @Column({ type: 'int', default: 0 })
  sold: number;

  /** Visível ao público? */
  @Column({ default: true })
  isActive: boolean;

  /** Disponível até esta data (null = sempre). */
  @Column({ type: 'timestamptz', nullable: true })
  availableUntil?: Date;

  /** Ordem de exibição. */
  @Column({ type: 'int', default: 0 })
  position: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
