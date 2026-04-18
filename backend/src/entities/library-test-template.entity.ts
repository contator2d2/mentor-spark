import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum LibrarySegment {
  EMPRESARIAL = 'empresarial',
  RH = 'rh',
  FINANCEIRO = 'financeiro',
  JURIDICO = 'juridico',
  COMERCIAL = 'comercial',
  LIDERANCA = 'lideranca',
  PROCESSOS = 'processos',
  MARKETING = 'marketing',
  PRODUTIVIDADE = 'produtividade',
}

export enum LibraryTestKind {
  /** Rápido — eventos, palestras, captação */
  QUICK = 'quick',
  /** Diagnóstico — início da mentoria */
  DIAGNOSTIC = 'diagnostic',
  /** Comparativo — mede evolução ao longo do tempo */
  COMPARATIVE = 'comparative',
}

/** Categoria avaliada dentro do teste, com peso relativo no score por categoria */
export interface LibraryCategory {
  key: string;
  label: string;
  weight: number;
}

/** Pergunta no formato compatível com TestQuestion + categoryKey */
export interface LibraryQuestion {
  type: 'multiple_choice' | 'scale' | 'open_text';
  text: string;
  weight: number;
  categoryKey?: string;
  config?: any;
}

/** Faixa de interpretação do score */
export interface LibraryInterpretationRange {
  min: number; // %
  max: number; // %
  label: string;
  description: string;
}

@Entity('library_test_templates')
@Index(['segment'])
@Index(['kind'])
export class LibraryTestTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: LibrarySegment })
  segment: LibrarySegment;

  @Column({ type: 'enum', enum: LibraryTestKind })
  kind: LibraryTestKind;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text' })
  objective: string;

  @Column({ type: 'jsonb' })
  categories: LibraryCategory[];

  @Column({ type: 'jsonb' })
  questions: LibraryQuestion[];

  /** Faixas de score → interpretação textual */
  @Column({ type: 'jsonb' })
  baseInterpretation: LibraryInterpretationRange[];

  @Column({ type: 'text' })
  baseReport: string;

  @Column({ type: 'text' })
  baseRecommendation: string;

  /** Prompt sugerido para análise IA */
  @Column({ type: 'text', nullable: true })
  aiAnalysisPrompt?: string;

  /** Slug estável usado para idempotência do seed */
  @Column({ unique: true })
  seedKey: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
