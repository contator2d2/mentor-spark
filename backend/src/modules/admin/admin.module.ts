import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { AiProvider } from '../../entities/ai-provider.entity';
import { AdminController } from './admin.controller';
import { AiProvidersController } from './ai-providers.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, AiProvider]), AiModule],
  controllers: [AdminController, AiProvidersController],
})
export class AdminModule {}
