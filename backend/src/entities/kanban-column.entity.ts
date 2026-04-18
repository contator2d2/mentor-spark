import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { KanbanBoard } from './kanban-board.entity';
import { KanbanCard } from './kanban-card.entity';

@Entity('kanban_columns')
@Index(['boardId', 'order'])
export class KanbanColumn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  boardId: string;

  @ManyToOne(() => KanbanBoard, (b) => b.columns, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'boardId' })
  board?: KanbanBoard;

  @Column()
  name: string;

  /** Cor (hex ou hsl) */
  @Column({ default: '#64748b' })
  color: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  /** Limite WIP — 0 = sem limite */
  @Column({ type: 'int', default: 0 })
  wipLimit: number;

  /** Identificador estável p/ mapear estágios legados (ex: 'new', 'client') */
  @Column({ nullable: true })
  slug?: string;

  /** Marca coluna como "ganho" (cliente) ou "perdido" para métricas */
  @Column({ nullable: true })
  outcome?: 'won' | 'lost' | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => KanbanCard, (c) => c.column)
  cards?: KanbanCard[];
}
