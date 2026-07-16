import { Module, forwardRef } from '@nestjs/common';
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
import { EventTicketTier } from '../../entities/event-ticket-tier.entity';
import { EventPayment } from '../../entities/event-payment.entity';
import { MentorPaymentProvider } from '../../entities/mentor-payment-provider.entity';
import { EventCoupon } from '../../entities/event-coupon.entity';
import { EventCouponRedemption } from '../../entities/event-coupon-redemption.entity';
import { EventsController } from './events.controller';
import { PublicEventsController } from './public-events.controller';
import { EventsService } from './events.service';
import { EventPaymentsService } from './event-payments.service';
import { EventCouponsService } from './event-coupons.service';
import { EventPaymentsController, PublicEventPaymentsController } from './event-payments.controller';
import { MailService } from '../../shared/mail.service';
import { PushService } from '../push/push.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { LeadsModule } from '../leads/leads.module';
import { AiModule } from '../ai/ai.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CaptureEvent, EventRegistration, EventAction, Lead, TestTemplate, TestAssignment,
      User, Company, MentorIntegration, PushSubscription, Notification,
      EventTicketTier, EventPayment, MentorPaymentProvider,
      EventCoupon, EventCouponRedemption,
    ]),
    NotificationsModule,
    LeadsModule,
    AiModule,
    IntegrationsModule,
  ],
  controllers: [EventsController, PublicEventsController, EventPaymentsController, PublicEventPaymentsController],
  providers: [EventsService, EventPaymentsService, EventCouponsService, MailService, PushService],
  exports: [EventsService, EventPaymentsService, EventCouponsService],
})
export class EventsModule {}
