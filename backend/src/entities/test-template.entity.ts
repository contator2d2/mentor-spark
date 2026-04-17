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

  @OneToMany(() => TestQuestion, (q) => q.template, { cascade: true })
  questions: TestQuestion[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
