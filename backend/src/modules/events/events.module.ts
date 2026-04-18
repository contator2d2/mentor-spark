import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CaptureEvent } from '../../entities/capture-event.entity';
import { Lead } from '../../entities/lead.entity';
import { EventsController } from './events.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CaptureEvent, Lead])],
  controllers: [EventsController],
})
export class EventsModule {}
