import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MentorIntegration } from '../../entities/mentor-integration.entity';
import { User } from '../../entities/user.entity';
import { IntegrationsController } from './integrations.controller';
import { WhatsappService } from './whatsapp.service';
import { GoogleCalendarService } from './google-calendar.service';
import { PlansModule } from '../plans/plans.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [TypeOrmModule.forFeature([MentorIntegration, User]), PlansModule, forwardRef(() => AdminModule)],
  controllers: [IntegrationsController],
  providers: [WhatsappService, GoogleCalendarService],
  exports: [WhatsappService, GoogleCalendarService],
})
export class IntegrationsModule {}
