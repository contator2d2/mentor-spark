import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { TrailModule } from './trail-module.entity';

export enum LessonType {
  VIDEO = 'video',
  ARTICLE = 'article',
  PDF = 'pdf',
  AUDIO = 'audio',
  QUIZ = 'quiz',
  TASK = 'task',
}

@Entity('trail_lessons')
@Index(['moduleId', 'order'])
export class TrailLesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  moduleId: string;

  @ManyToOne(() => TrailModule, (m) => m.lessons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'moduleId' })
  module?: TrailModule;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: LessonType, default: LessonType.VIDEO })
  type: LessonType;

  /** URL principal (vídeo, PDF, etc) */
  @Column({ nullable: true })
  contentUrl?: string;

  /** Conteúdo HTML/markdown para articles */
  @Column({ type: 'text', nullable: true })
  body?: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({ type: 'int', default: 0 })
  durationMinutes: number;

  @CreateDateColumn()
  createdAt: Date;
}
