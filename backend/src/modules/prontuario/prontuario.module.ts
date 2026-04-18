import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MentoredRecord } from '../../entities/mentored-record.entity';
import { Lead } from '../../entities/lead.entity';
import { User } from '../../entities/user.entity';
import { TestResponse } from '../../entities/test-response.entity';
import { Meeting } from '../../entities/meeting.entity';
import { Task } from '../../entities/task.entity';
import { ProntuarioController } from './prontuario.controller';
import { ProntuarioService } from './prontuario.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MentoredRecord, Lead, User, TestResponse, Meeting, Task]),
  ],
  controllers: [ProntuarioController],
  providers: [ProntuarioService],
  exports: [ProntuarioService],
})
export class ProntuarioModule {}
