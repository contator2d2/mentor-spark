import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { KanbanColumn } from './kanban-column.entity';
import { KanbanBoard } from './kanban-board.entity';

export enum CardEntityType {
  LEAD = 'lead',
  TASK = 'task',
  CUSTOM = 'custom',
}

@Entity('kanban_cards')
@Index(['boardId', 'columnId'])
@Index(['mentorId'])
export class KanbanCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column({ type: 'uuid' })
  boardId: string;

  @ManyToOne(() => KanbanBoard, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'boardId' })
  board?: KanbanBoard;

  @Column({ type: 'uuid' })
  columnId: string;

  @ManyToOne(() => KanbanColumn, (c) => c.cards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'columnId' })
  column?: KanbanColumn;

  @Column({ type: 'enum', enum: CardEntityType, default: CardEntityType.CUSTOM })
  entityType: CardEntityType;

  /** id do lead/task se entityType !== custom */
  @Column({ type: 'uuid', nullable: true })
  entityId?: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  /** Campos arbitrários (tags, due, attendees, etc.) */
  @Column({ type: 'jsonb', nullable: true })
  customFields?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
