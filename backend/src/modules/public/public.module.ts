import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { TestTemplate } from '../../entities/test-template.entity';
import { PublicController } from './public.controller';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, TestTemplate]), LeadsModule],
  controllers: [PublicController],
})
export class PublicModule {}
