import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from '../../entities/lead.entity';
import { Meeting } from '../../entities/meeting.entity';
import { TestResponse } from '../../entities/test-response.entity';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Lead, Meeting, TestResponse])],
  controllers: [DashboardController],
})
export class DashboardModule {}
