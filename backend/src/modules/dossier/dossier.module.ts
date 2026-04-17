import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from '../../entities/lead.entity';
import { TestResponse } from '../../entities/test-response.entity';
import { Meeting } from '../../entities/meeting.entity';
import { Task } from '../../entities/task.entity';
import { User } from '../../entities/user.entity';
import { DossierController } from './dossier.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Lead, TestResponse, Meeting, Task, User])],
  controllers: [DossierController],
})
export class DossierModule {}
