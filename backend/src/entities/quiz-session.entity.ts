import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum QuizSessionStatus {
  LOBBY = 'lobby',         // jogadores entrando
  QUESTION = 'question',   // pergunta ativa
  REVEAL = 'reveal',       // mostrando resposta correta
  LEADERBOARD = 'leaderboard', // entre perguntas
  FINISHED = 'finished',
  CANCELED = 'canceled',
}

@Entity('quiz_sessions')
@Index(['pin'], { unique: true })
@Index(['mentorId'])
export class QuizSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  /** Template de teste usado como base */
  @Column({ type: 'uuid' })
  templateId: string;

  /** Evento opcional ao qual o quiz está vinculado */
  @Column({ type: 'uuid', nullable: true })
  eventId?: string;

  /** PIN público de 6 dígitos */
  @Column({ length: 6 })
  pin: string;

  @Column()
  title: string;

  @Column({ type: 'enum', enum: QuizSessionStatus, default: QuizSessionStatus.LOBBY })
  status: QuizSessionStatus;

  /** Index da pergunta atual (0-based) */
  @Column({ type: 'int', default: -1 })
  currentQuestionIndex: number;

  /** Quando a pergunta atual começou (para calcular velocidade) */
  @Column({ type: 'timestamptz', nullable: true })
  questionStartedAt?: Date;

  /** Tempo limite por pergunta em segundos (default 20) */
  @Column({ type: 'int', default: 20 })
  questionTimeLimit: number;

  /** Snapshot das perguntas (texto + opções com flag correct) — congelado ao iniciar */
  @Column({ type: 'jsonb', nullable: true })
  questionsSnapshot?: Array<{
    id: string;
    text: string;
    options: Array<{ index: number; label: string; correct: boolean }>;
  }>;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
