import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TestTemplate } from './test-template.entity';

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  SCALE = 'scale', // 1 a 10
  OPEN_TEXT = 'open_text',
}

@Entity('test_questions')
export class TestQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  templateId: string;

  @ManyToOne(() => TestTemplate, (t) => t.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'templateId' })
  template: TestTemplate;

  @Column({ type: 'int' })
  order: number;

  @Column({ type: 'enum', enum: QuestionType })
  type: QuestionType;

  @Column({ type: 'text' })
  text: string;

  /**
   * Para MULTIPLE_CHOICE: array de { label, score }
   * Para SCALE: { min: 1, max: 10 }
   * Para OPEN_TEXT: null
   */
  @Column({ type: 'jsonb', nullable: true })
  config?: any;

  @Column({ type: 'int', default: 1 })
  weight: number;
}
