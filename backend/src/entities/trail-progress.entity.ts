import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';

@Entity('trail_progress')
@Unique(['userId', 'lessonId'])
@Index(['userId', 'trailId'])
export class TrailProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  trailId: string;

  @Column({ type: 'uuid' })
  moduleId: string;

  @Column({ type: 'uuid' })
  lessonId: string;

  @Column({ default: false })
  completed: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date;

  /** % de visualização do vídeo (0-100) */
  @Column({ type: 'int', default: 0 })
  progressPercent: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
