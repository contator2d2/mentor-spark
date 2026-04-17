import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { TestTemplate } from './test-template.entity';
import { Lead } from './lead.entity';

@Entity('test_responses')
@Index(['leadId'])
@Index(['mentorId'])
export class TestResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  templateId: string;

  @ManyToOne(() => TestTemplate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'templateId' })
  template: TestTemplate;

  @Column({ type: 'uuid' })
  leadId: string;

  @ManyToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'leadId' })
  lead: Lead;

  @Column({ type: 'uuid' })
  mentorId: string;

  /** Array of { questionId, answer, scoreEarned } */
  @Column({ type: 'jsonb' })
  answers: Array<{ questionId: string; answer: any; scoreEarned: number }>;

  @Column({ type: 'int' })
  totalScore: number;

  @Column({ type: 'int' })
  maxScore: number;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  scorePct: number;

  @Column({ type: 'text', nullable: true })
  aiAnalysis?: string;

  @Column({ nullable: true })
  classification?: string; // cold | warm | hot

  @CreateDateColumn()
  createdAt: Date;
}
