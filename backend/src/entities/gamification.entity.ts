import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/** XP/nível/badges do mentorado. 1 row por user (mentorado). */
@Entity('gamification_profiles')
@Index(['userId'], { unique: true })
export class GamificationProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  mentorId?: string;

  @Column({ type: 'int', default: 0 })
  xp: number;

  @Column({ type: 'int', default: 1 })
  level: number;

  /** Badges conquistadas: ['first_test', 'streak_7', 'top_score', ...] */
  @Column({ type: 'jsonb', default: '[]' })
  badges: string[];

  /** Streak diário de atividade */
  @Column({ type: 'int', default: 0 })
  streakDays: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastActivityAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
