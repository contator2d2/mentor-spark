import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { AiProvider } from '../../entities/ai-provider.entity';
import { Lead } from '../../entities/lead.entity';
import { TestResponse } from '../../entities/test-response.entity';
import { Meeting } from '../../entities/meeting.entity';
import { Plan } from '../../entities/plan.entity';
import { Subscription } from '../../entities/subscription.entity';
import { Charge } from '../../entities/charge.entity';
import { AppSetting } from '../../entities/app-setting.entity';
import { MentorAiConfig } from '../../entities/mentor-ai-config.entity';
import { AdminController } from './admin.controller';
import { AiProvidersController } from './ai-providers.controller';
import { AppSettingsController } from './app-settings.controller';
import { AiUsageAdminController } from './ai-usage-admin.controller';
import { AppSettingsService } from './app-settings.service';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { AsaasService } from '../billing/asaas.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AiProvider, Lead, TestResponse, Meeting, Plan, Subscription, Charge, AppSetting, MentorAiConfig]),
    AiModule,
    AuthModule,
  ],
  controllers: [AdminController, AiProvidersController, AppSettingsController, AiUsageAdminController],
  providers: [AppSettingsService, AsaasService],
  exports: [AppSettingsService],
})
export class AdminModule {}
