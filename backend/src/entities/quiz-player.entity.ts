import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('quiz_players')
@Index(['sessionId'])
@Index(['sessionId', 'name'], { unique: true })
export class QuizPlayer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sessionId: string;

  @Column()
  name: string;

  /** ticketCode opcional, se entrou via inscrição do evento */
  @Column({ nullable: true })
  ticketCode?: string;

  /** userId opcional (mentorado logado) */
  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  /** Conexão socket atual */
  @Column({ nullable: true })
  socketId?: string;

  @Column({ type: 'int', default: 0 })
  score: number;

  @Column({ type: 'int', default: 0 })
  correctCount: number;

  @Column({ default: true })
  connected: boolean;

  @CreateDateColumn()
  joinedAt: Date;
}
