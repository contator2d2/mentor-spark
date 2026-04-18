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
import { AiUsageLog } from '../../entities/ai-usage-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MentorAiConfig, Prompt, Lead, Meeting, TestResponse, AiProvider, AiUsageLog])],
  providers: [AiService],
  controllers: [AiController],
  exports: [AiService, TypeOrmModule],
})
export class AiModule {}
