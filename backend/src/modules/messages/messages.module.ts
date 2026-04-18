import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from '../../entities/message.entity';
import { MessageTemplate } from '../../entities/message-template.entity';
import { Lead } from '../../entities/lead.entity';
import { User } from '../../entities/user.entity';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { MailService } from '../../shared/mail.service';
import { IntegrationsModule } from '../integrations/integrations.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, MessageTemplate, Lead, User]),
    IntegrationsModule,
    NotificationsModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService, MailService],
  exports: [MessagesService],
})
export class MessagesModule {}
