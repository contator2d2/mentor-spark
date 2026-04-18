import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Unique } from 'typeorm';

@Entity('quiz_answers')
@Index(['sessionId', 'questionIndex'])
@Unique(['playerId', 'questionIndex'])
export class QuizAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sessionId: string;

  @Column({ type: 'uuid' })
  playerId: string;

  @Column({ type: 'int' })
  questionIndex: number;

  @Column({ type: 'int' })
  optionIndex: number;

  @Column({ default: false })
  correct: boolean;

  /** Tempo de resposta em ms desde questionStartedAt */
  @Column({ type: 'int' })
  timeMs: number;

  @Column({ type: 'int', default: 0 })
  pointsEarned: number;

  @CreateDateColumn()
  createdAt: Date;
}
