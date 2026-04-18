import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KanbanBoard } from '../../entities/kanban-board.entity';
import { KanbanColumn } from '../../entities/kanban-column.entity';
import { KanbanCard } from '../../entities/kanban-card.entity';
import { Lead } from '../../entities/lead.entity';
import { KanbanController } from './kanban.controller';

@Module({
  imports: [TypeOrmModule.forFeature([KanbanBoard, KanbanColumn, KanbanCard, Lead])],
  controllers: [KanbanController],
})
export class KanbanModule {}
