import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Meeting } from '../../entities/meeting.entity';
import { MeetingParticipant } from '../../entities/meeting-participant.entity';
import { MeetingCaptureSession } from '../../entities/meeting-capture-session.entity';
import { MeetingCaptureHeartbeat } from '../../entities/meeting-capture-heartbeat.entity';
import { MeetingAudioAsset } from '../../entities/meeting-audio-asset.entity';
import { MeetingAudioChunk } from '../../entities/meeting-audio-chunk.entity';
import { MeetingCaptureLog } from '../../entities/meeting-capture-log.entity';
import { MeetingSummary } from '../../entities/meeting-summary.entity';
import { User } from '../../entities/user.entity';

import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';
import { MeetingParticipantsController } from './meeting-participants.controller';
import { CaptureSessionsController } from './capture-sessions.controller';
import { CapturePipelineService } from './capture-pipeline.service';
import { AudioChunkerService } from './audio-chunker.service';

import { AiModule } from '../ai/ai.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Meeting,
      MeetingParticipant,
      MeetingCaptureSession,
      MeetingCaptureHeartbeat,
      MeetingAudioAsset,
      MeetingAudioChunk,
      MeetingCaptureLog,
      MeetingSummary,
      User,
    ]),
    AiModule,
    IntegrationsModule,
  ],
  controllers: [MeetingsController, MeetingParticipantsController, CaptureSessionsController],
  providers: [MeetingsService, CapturePipelineService, AudioChunkerService],
  exports: [MeetingsService, CapturePipelineService],
})
export class MeetingsModule {}
