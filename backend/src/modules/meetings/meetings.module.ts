import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Meeting } from '../../entities/meeting.entity';
import { MeetingsController } from './meetings.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Meeting]), AiModule],
  controllers: [MeetingsController],
})
export class MeetingsModule {}
