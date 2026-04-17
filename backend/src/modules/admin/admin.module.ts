import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { AiProvider } from '../../entities/ai-provider.entity';
import { Lead } from '../../entities/lead.entity';
import { TestResponse } from '../../entities/test-response.entity';
import { Meeting } from '../../entities/meeting.entity';
import { AdminController } from './admin.controller';
import { AiProvidersController } from './ai-providers.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AiProvider, Lead, TestResponse, Meeting]),
    AiModule,
  ],
  controllers: [AdminController, AiProvidersController],
})
export class AdminModule {}
