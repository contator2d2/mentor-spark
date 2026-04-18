import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Lead } from '../../entities/lead.entity';
import { MentorController } from './mentor.controller';
import { MailService } from '../../shared/mail.service';
import { PlansModule } from '../plans/plans.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Lead]), PlansModule, IntegrationsModule],
  controllers: [MentorController],
  providers: [MailService],
})
export class MentorModule {}
