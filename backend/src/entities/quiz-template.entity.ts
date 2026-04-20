import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum QuizSegment {
  EMPRESARIAL = 'empresarial',
  RH = 'rh',
  FINANCEIRO = 'financeiro',
  JURIDICO = 'juridico',
  COMERCIAL = 'comercial',
  LIDERANCA = 'lideranca',
  PROCESSOS = 'processos',
  MARKETING = 'marketing',
  PRODUTIVIDADE = 'produtividade',
  EDUCACAO = 'educacao',
  GERAL = 'geral',
}

export interface QuizQuestionOption {
  label: string;
  correct: boolean;
}

export interface QuizQuestion {
  text: string;
  options: QuizQuestionOption[];
}

/**
 * Template de quiz salvo do mentor — usado para iniciar sessões PVP.
 * Diferente de TestTemplate (mais complexo, com pesos/categorias/IA), o QuizTemplate
 * é leve e específico para o jogo competitivo estilo Kahoot.
 */
@Entity('quiz_templates')
@Index(['mentorId'])
@Index(['segment'])
export class QuizTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: QuizSegment, default: QuizSegment.GERAL })
  segment: QuizSegment;

  @Column({ type: 'jsonb' })
  questions: QuizQuestion[];

  /** Tempo padrão por pergunta (segundos) ao iniciar PVP a partir deste template */
  @Column({ type: 'int', default: 20 })
  defaultTimeLimit: number;

  /** Origem na biblioteca, se foi clonado de lá */
  @Column({ type: 'uuid', nullable: true })
  sourceLibraryId?: string;

  /** Indica se foi gerado por IA (badge no UI) */
  @Column({ default: false })
  aiGenerated: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * Modelos de quiz prontos da biblioteca pública (seed). Mentor pode clonar para "Meus Quizzes".
 */
@Entity('quiz_library_templates')
@Index(['segment'])
export class QuizLibraryTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: QuizSegment })
  segment: QuizSegment;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb' })
  questions: QuizQuestion[];

  @Column({ type: 'int', default: 20 })
  defaultTimeLimit: number;

  /** Slug estável para idempotência do seed */
  @Column({ unique: true })
  seedKey: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}