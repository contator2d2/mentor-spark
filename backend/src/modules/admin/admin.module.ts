import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { AiProvider } from '../../entities/ai-provider.entity';
import { Lead } from '../../entities/lead.entity';
import { TestResponse } from '../../entities/test-response.entity';
import { Meeting } from '../../entities/meeting.entity';
import { Plan } from '../../entities/plan.entity';
import { Subscription } from '../../entities/subscription.entity';
import { AppSetting } from '../../entities/app-setting.entity';
import { MentorAiConfig } from '../../entities/mentor-ai-config.entity';
import { AdminController } from './admin.controller';
import { AiProvidersController } from './ai-providers.controller';
import { AppSettingsController } from './app-settings.controller';
import { AiUsageAdminController } from './ai-usage-admin.controller';
import { AppSettingsService } from './app-settings.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AiProvider, Lead, TestResponse, Meeting, Plan, Subscription, AppSetting, MentorAiConfig]),
    AiModule,
  ],
  controllers: [AdminController, AiProvidersController, AppSettingsController, AiUsageAdminController],
  providers: [AppSettingsService],
  exports: [AppSettingsService],
})
export class AdminModule {}
