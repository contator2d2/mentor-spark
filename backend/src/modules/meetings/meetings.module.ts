import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Meeting } from '../../entities/meeting.entity';
import { User } from '../../entities/user.entity';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';
import { AiModule } from '../ai/ai.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [TypeOrmModule.forFeature([Meeting, User]), AiModule, IntegrationsModule],
  controllers: [MeetingsController],
  providers: [MeetingsService],
  exports: [MeetingsService],
})
export class MeetingsModule {}
