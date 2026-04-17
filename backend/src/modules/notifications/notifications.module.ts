import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from '../../entities/notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { MailService } from '../../shared/mail.service';
import { PushModule } from '../push/push.module';

@Module({
  imports: [TypeOrmModule.forFeature([Notification]), PushModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, MailService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
