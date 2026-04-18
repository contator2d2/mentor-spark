import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from '../../entities/lead.entity';
import { User } from '../../entities/user.entity';
import { CaptureEvent } from '../../entities/capture-event.entity';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Lead, User, CaptureEvent]), AuthModule],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
