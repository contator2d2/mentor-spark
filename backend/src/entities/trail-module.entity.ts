import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { Trail } from './trail.entity';
import { TrailLesson } from './trail-lesson.entity';

@Entity('trail_modules')
@Index(['trailId', 'order'])
export class TrailModule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  trailId: string;

  @ManyToOne(() => Trail, (t) => t.modules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trailId' })
  trail?: Trail;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @OneToMany(() => TrailLesson, (l) => l.module)
  lessons?: TrailLesson[];

  @CreateDateColumn()
  createdAt: Date;
}
