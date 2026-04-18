import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractTemplate } from '../../entities/contract-template.entity';
import { Contract } from '../../entities/contract.entity';
import { Lead } from '../../entities/lead.entity';
import { User } from '../../entities/user.entity';
import { Plan } from '../../entities/plan.entity';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([ContractTemplate, Contract, Lead, User, Plan]), AiModule],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
