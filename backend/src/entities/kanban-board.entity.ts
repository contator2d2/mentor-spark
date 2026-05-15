import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';
import { KanbanColumn } from './kanban-column.entity';

export enum BoardType {
  LEADS = 'leads',
  TASKS = 'tasks',
  DEMANDS = 'demands',
  CUSTOM = 'custom',
}

@Entity('kanban_boards')
@Index(['mentorId'])
export class KanbanBoard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: BoardType, default: BoardType.CUSTOM })
  type: BoardType;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ type: 'int', default: 0 })
  order: number;

  /** Cor de destaque do board */
  @Column({ nullable: true })
  color?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => KanbanColumn, (c) => c.board)
  columns?: KanbanColumn[];
}
