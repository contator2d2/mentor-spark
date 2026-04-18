import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CaptureEvent } from '../../entities/capture-event.entity';
import { EventRegistration } from '../../entities/event-registration.entity';
import { EventAction } from '../../entities/event-action.entity';
import { Lead } from '../../entities/lead.entity';
import { TestTemplate } from '../../entities/test-template.entity';
import { TestAssignment } from '../../entities/test-assignment.entity';
import { User } from '../../entities/user.entity';
import { Company } from '../../entities/company.entity';
import { MentorIntegration } from '../../entities/mentor-integration.entity';
import { PushSubscription } from '../../entities/push-subscription.entity';
import { Notification } from '../../entities/notification.entity';
import { EventsController } from './events.controller';
import { PublicEventsController } from './public-events.controller';
import { EventsService } from './events.service';
import { MailService } from '../../shared/mail.service';
import { WhatsappService } from '../integrations/whatsapp.service';
import { PushService } from '../push/push.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { LeadsModule } from '../leads/leads.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CaptureEvent, EventRegistration, EventAction, Lead, TestTemplate, TestAssignment,
      User, Company, MentorIntegration, PushSubscription, Notification,
    ]),
    NotificationsModule,
    LeadsModule,
    AiModule,
  ],
  controllers: [EventsController, PublicEventsController],
  providers: [EventsService, MailService, WhatsappService, PushService],
  exports: [EventsService],
})
export class EventsModule {}
