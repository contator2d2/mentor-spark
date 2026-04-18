import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadOnboardingToken } from '../../entities/lead-onboarding-token.entity';
import { Lead } from '../../entities/lead.entity';
import { User } from '../../entities/user.entity';
import { Contract } from '../../entities/contract.entity';
import { OnboardingController } from './onboarding.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LeadOnboardingToken, Lead, User, Contract])],
  controllers: [OnboardingController],
})
export class OnboardingModule {}
