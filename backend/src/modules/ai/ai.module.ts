import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MentorAiConfig } from '../../entities/mentor-ai-config.entity';
import { Prompt } from '../../entities/prompt.entity';
import { Lead } from '../../entities/lead.entity';
import { Meeting } from '../../entities/meeting.entity';
import { TestResponse } from '../../entities/test-response.entity';
import { AiProvider } from '../../entities/ai-provider.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MentorAiConfig, Prompt, Lead, Meeting, TestResponse, AiProvider])],
  providers: [AiService],
  controllers: [AiController],
  exports: [AiService],
})
export class AiModule {}
