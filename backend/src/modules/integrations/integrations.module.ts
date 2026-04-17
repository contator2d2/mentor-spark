import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MentorIntegration } from '../../entities/mentor-integration.entity';
import { IntegrationsController } from './integrations.controller';
import { WhatsappService } from './whatsapp.service';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [TypeOrmModule.forFeature([MentorIntegration]), PlansModule],
  controllers: [IntegrationsController],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class IntegrationsModule {}
