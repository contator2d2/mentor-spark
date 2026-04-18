import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique,
} from 'typeorm';

/**
 * Configuração de personalização do Prontuário por mentor.
 * Permite renomear estágios, categorias, métricas e ajustar prompts da IA específicos do prontuário.
 */
@Entity('mentor_prontuario_configs')
@Unique(['mentorId'])
export class MentorProntuarioConfig {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'uuid' }) mentorId: string;

  /** Nome customizado para "mentorado" (ex: cliente, aluno, paciente, discípulo) */
  @Column({ default: 'Mentorado' }) menteeLabel: string;
  @Column({ default: 'Prontuário' }) prontuarioLabel: string;

  /**
   * Mapeamento de labels customizadas por estágio.
   * Ex: { initial: "Recém-chegado", diagnosis: "Em sondagem", ... }
   */
  @Column({ type: 'jsonb', nullable: true }) stageLabels?: Record<string, string>;

  /** Categorias customizadas para dores (ex: "espiritual", "operacional") */
  @Column({ type: 'simple-array', nullable: true }) painCategories?: string[];

  /** Categorias customizadas para objetivos */
  @Column({ type: 'simple-array', nullable: true }) objectiveCategories?: string[];

  /** Templates de métricas favoritas do mentor */
  @Column({ type: 'jsonb', nullable: true }) metricTemplates?: Array<{ name: string; unit?: string; category?: string }>;

  /**
   * Pesos da fórmula de score geral.
   * Default: execution 0.4, engagement 0.3, tests 0.3
   */
  @Column({ type: 'jsonb', nullable: true })
  scoreWeights?: { execution?: number; engagement?: number; tests?: number };

  /** Prompt complementar específico do prontuário (some-se ao prompt geral do mentor) */
  @Column({ type: 'text', nullable: true }) prontuarioPromptAddon?: string;

  /** Tom dos insights gerados (ex: consultivo, direto, didático) */
  @Column({ default: 'consultivo' }) insightTone: string;

  /** Idioma dos insights */
  @Column({ default: 'pt-BR' }) language: string;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
