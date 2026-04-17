import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LandingPage } from '../../entities/landing-page.entity';
import { User } from '../../entities/user.entity';
import { LandingController } from './landing.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LandingPage, User])],
  controllers: [LandingController],
})
export class LandingModule {}
