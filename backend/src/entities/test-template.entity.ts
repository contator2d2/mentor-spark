import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { TestQuestion } from './test-question.entity';

export enum TestCategory {
  FINANCIAL = 'financial',
  SALES = 'sales',
  LEADERSHIP = 'leadership',
  OPERATIONS = 'operations',
  CUSTOM = 'custom',
}

@Entity('test_templates')
export class TestTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @ManyToOne(() => User, (u) => u.testTemplates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mentorId' })
  mentor: User;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: TestCategory, default: TestCategory.CUSTOM })
  category: TestCategory;

  @Column({ default: true })
  active: boolean;

  /** Prompt customizado de IA usado para analisar respostas deste teste */
  @Column({ type: 'text', nullable: true })
  aiAnalysisPrompt?: string;

  /** Categorias avaliadas: [{ key, label, weight }] — quando presente, habilita score por categoria */
  @Column({ type: 'jsonb', nullable: true })
  categories?: Array<{ key: string; label: string; weight: number }>;

  /** Faixas de interpretação por score % */
  @Column({ type: 'jsonb', nullable: true })
  interpretation?: Array<{ min: number; max: number; label: string; description: string }>;

  /** Relatório base (template editável pelo mentor) */
  @Column({ type: 'text', nullable: true })
  baseReport?: string;

  /** Recomendação inicial (template editável pelo mentor) */
  @Column({ type: 'text', nullable: true })
  baseRecommendation?: string;

  /** Origem na biblioteca, se foi clonado de lá */
  @Column({ type: 'uuid', nullable: true })
  sourceLibraryId?: string;

  @OneToMany(() => TestQuestion, (q) => q.template, { cascade: true })
  questions: TestQuestion[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
