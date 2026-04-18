import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Availability } from '../../entities/availability.entity';
import { Booking } from '../../entities/booking.entity';
import { User } from '../../entities/user.entity';
import { SchedulingService } from './scheduling.service';
import { SchedulingController, PublicSchedulingController } from './scheduling.controller';
import { IntegrationsModule } from '../integrations/integrations.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Availability, Booking, User]),
    IntegrationsModule,
    NotificationsModule,
  ],
  controllers: [SchedulingController, PublicSchedulingController],
  providers: [SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
