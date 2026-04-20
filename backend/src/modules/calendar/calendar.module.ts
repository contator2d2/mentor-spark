import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Meeting } from '../../entities/meeting.entity';
import { Task } from '../../entities/task.entity';
import { Booking } from '../../entities/booking.entity';
import { CaptureEvent } from '../../entities/capture-event.entity';
import { Lead } from '../../entities/lead.entity';
import { CalendarController } from './calendar.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Meeting, Task, Booking, CaptureEvent, Lead])],
  controllers: [CalendarController],
})
export class CalendarModule {}
