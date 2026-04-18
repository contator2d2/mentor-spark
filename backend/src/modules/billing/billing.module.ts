import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from '../../entities/subscription.entity';
import { Plan } from '../../entities/plan.entity';
import { User } from '../../entities/user.entity';
import { MentorSubscription } from '../../entities/mentor-subscription.entity';
import { Charge } from '../../entities/charge.entity';
import { Lead } from '../../entities/lead.entity';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { MentorBillingController, AsaasWebhookController } from './mentor-billing.controller';
import { MentorBillingService } from './mentor-billing.service';
import { AsaasService } from './asaas.service';
import { AdminModule } from '../admin/admin.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, Plan, User, MentorSubscription, Charge, Lead]),
    AdminModule,
    IntegrationsModule,
    NotificationsModule,
  ],
  controllers: [BillingController, MentorBillingController, AsaasWebhookController],
  providers: [BillingService, MentorBillingService, AsaasService],
  exports: [BillingService, MentorBillingService],
})
export class BillingModule {}
