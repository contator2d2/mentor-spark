import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * Log de uso de IA por tenant (mentor). Cada chamada ao provider gera 1 registro.
 * Permite ao super_admin monitorar consumo de tokens e cobrar/monetizar depois.
 */
@Entity('ai_usage_logs')
@Index(['mentorId', 'createdAt'])
@Index(['providerId'])
export class AiUsageLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column({ type: 'uuid', nullable: true })
  providerId?: string;

  @Column({ nullable: true })
  providerName?: string;

  @Column({ nullable: true })
  model?: string;

  /** Caso de uso: chat, summarize_meeting, analyze_test, etc. */
  @Column({ default: 'chat' })
  useCase: string;

  @Column({ type: 'int', default: 0 })
  promptTokens: number;

  @Column({ type: 'int', default: 0 })
  completionTokens: number;

  @Column({ type: 'int', default: 0 })
  totalTokens: number;

  /** Custo estimado em centavos (USD ou BRL — definido pelo super_admin). */
  @Column({ type: 'int', default: 0 })
  costCents: number;

  /** Latência da requisição em ms */
  @Column({ type: 'int', nullable: true })
  latencyMs?: number;

  @Column({ default: true })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  createdAt: Date;
}
