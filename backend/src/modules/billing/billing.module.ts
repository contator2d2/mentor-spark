import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from '../../entities/subscription.entity';
import { Plan } from '../../entities/plan.entity';
import { User } from '../../entities/user.entity';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription, Plan, User])],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
