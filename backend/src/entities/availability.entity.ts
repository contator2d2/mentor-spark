import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Configuração de disponibilidade pública do mentor para agendamento.
 * Cada registro representa um "tipo de evento" (ex: Diagnóstico 30min, Mentoria 1h).
 */
@Entity('availabilities')
@Index(['mentorId'])
export class Availability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column()
  title: string; // Ex: "Sessão de Diagnóstico"

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'int', default: 30 })
  durationMinutes: number;

  /** Tempo de buffer antes/depois (minutos) */
  @Column({ type: 'int', default: 0 })
  bufferMinutes: number;

  /** Antecedência mínima para agendar (em horas) */
  @Column({ type: 'int', default: 2 })
  minNoticeHours: number;

  /** Janela máxima de agendamento futuro (em dias) */
  @Column({ type: 'int', default: 30 })
  maxAdvanceDays: number;

  /**
   * Janelas de disponibilidade por dia da semana (0=Dom..6=Sáb).
   * Ex: { "1": [["09:00","12:00"],["14:00","18:00"]], "2": [...] }
   */
  @Column({ type: 'jsonb', default: '{}' })
  weeklyHours: Record<string, [string, string][]>;

  /** Datas específicas bloqueadas (YYYY-MM-DD) */
  @Column({ type: 'jsonb', default: '[]' })
  blockedDates: string[];

  /** Cor para identificação visual */
  @Column({ default: '#6366f1' })
  color: string;

  /** Slug público (opcional, default = id curto) */
  @Column({ unique: true, nullable: true })
  slug?: string;

  /** Se gera link de Google Meet automaticamente */
  @Column({ default: true })
  autoMeetLink: boolean;

  /** Confirmação requerida (se true, fica como "pending" até mentor aceitar) */
  @Column({ default: false })
  requireApproval: boolean;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
