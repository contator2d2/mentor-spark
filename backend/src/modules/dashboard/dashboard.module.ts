import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from '../../entities/lead.entity';
import { Meeting } from '../../entities/meeting.entity';
import { TestResponse } from '../../entities/test-response.entity';
import { Charge } from '../../entities/charge.entity';
import { MentorSubscription } from '../../entities/mentor-subscription.entity';
import { Booking } from '../../entities/booking.entity';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Lead, Meeting, TestResponse, Charge, MentorSubscription, Booking])],
  controllers: [DashboardController],
})
export class DashboardModule {}
