import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Automation } from '../../entities/automation.entity';
import { Lead } from '../../entities/lead.entity';
import { Task } from '../../entities/task.entity';
import { AutomationsController } from './automations.controller';
import { AutomationsService } from './automations.service';
import { MessagesModule } from '../messages/messages.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Automation, Lead, Task]),
    MessagesModule,
    NotificationsModule,
  ],
  controllers: [AutomationsController],
  providers: [AutomationsService],
  exports: [AutomationsService],
})
export class AutomationsModule {}
