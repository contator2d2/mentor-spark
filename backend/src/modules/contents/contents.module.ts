import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Content } from '../../entities/content.entity';
import { Lead } from '../../entities/lead.entity';
import { User } from '../../entities/user.entity';
import { ContentsController } from './contents.controller';
import { ContentDispatcher } from './content-dispatcher.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Content, Lead, User]),
    NotificationsModule,
    IntegrationsModule,
    PlansModule,
  ],
  controllers: [ContentsController],
  providers: [ContentDispatcher],
})
export class ContentsModule {}
