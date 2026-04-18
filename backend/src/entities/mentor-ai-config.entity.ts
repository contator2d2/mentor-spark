import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('mentor_ai_configs')
export class MentorAiConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  mentorId: string;

  @OneToOne(() => User, (u) => u.aiConfig, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mentorId' })
  mentor: User;

  /** Ativa ou desativa todas as funcionalidades de IA para este mentor. */
  @Column({ type: 'boolean', default: true })
  aiEnabled: boolean;

  /** Limite mensal de tokens (0 ou null = ilimitado). Usado para monetização futura. */
  @Column({ type: 'int', nullable: true })
  monthlyTokenLimit?: number;

  @Column({ type: 'text', nullable: true })
  systemPrompt?: string;

  @Column({ type: 'text', nullable: true })
  methodology?: string;

  @Column({ type: 'text', nullable: true })
  responseStyle?: string;

  @Column({ type: 'text', nullable: true })
  focusAreas?: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
