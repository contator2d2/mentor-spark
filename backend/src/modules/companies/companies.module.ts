import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '../../entities/company.entity';
import { Lead } from '../../entities/lead.entity';
import { Meeting } from '../../entities/meeting.entity';
import { Contract } from '../../entities/contract.entity';
import { User } from '../../entities/user.entity';
import { CompaniesController } from './companies.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Company, Lead, Meeting, Contract, User]), AuthModule],
  controllers: [CompaniesController],
})
export class CompaniesModule {}
