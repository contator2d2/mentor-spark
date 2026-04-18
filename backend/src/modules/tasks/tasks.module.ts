import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '../../entities/task.entity';
import { User } from '../../entities/user.entity';
import { Lead } from '../../entities/lead.entity';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [TypeOrmModule.forFeature([Task, User, Lead]), IntegrationsModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
