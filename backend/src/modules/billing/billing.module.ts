import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from '../../entities/subscription.entity';
import { Plan } from '../../entities/plan.entity';
import { User } from '../../entities/user.entity';
import { MentorSubscription } from '../../entities/mentor-subscription.entity';
import { Charge } from '../../entities/charge.entity';
import { Lead } from '../../entities/lead.entity';
import { MessageTemplate } from '../../entities/message-template.entity';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import {
  MentorBillingController,
  AsaasWebhookController,
  MentoradoFinanceiroController,
} from './mentor-billing.controller';
import { MentorBillingService } from './mentor-billing.service';
import { AsaasService } from './asaas.service';
import { AdminModule } from '../admin/admin.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TrailAccessModule } from '../trail-access/trail-access.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, Plan, User, MentorSubscription, Charge, Lead, MessageTemplate]),
    AdminModule,
    IntegrationsModule,
    NotificationsModule,
    TrailAccessModule,
  ],
  controllers: [
    BillingController,
    MentorBillingController,
    AsaasWebhookController,
    MentoradoFinanceiroController,
  ],
  providers: [BillingService, MentorBillingService, AsaasService],
  exports: [BillingService, MentorBillingService],
})
export class BillingModule {}
