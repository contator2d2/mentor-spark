import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MentoredRecord } from '../../entities/mentored-record.entity';
import { MentoredObjective } from '../../entities/mentored-objective.entity';
import { MentoredPain } from '../../entities/mentored-pain.entity';
import { MentoredMetric } from '../../entities/mentored-metric.entity';
import { Lead } from '../../entities/lead.entity';
import { User } from '../../entities/user.entity';
import { TestResponse } from '../../entities/test-response.entity';
import { Meeting } from '../../entities/meeting.entity';
import { Task } from '../../entities/task.entity';
import { ProntuarioController } from './prontuario.controller';
import { ProntuarioService } from './prontuario.service';
import { ProntuarioOperationalController } from './prontuario-operational.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MentoredRecord,
      MentoredObjective,
      MentoredPain,
      MentoredMetric,
      Lead,
      User,
      TestResponse,
      Meeting,
      Task,
    ]),
  ],
  controllers: [ProntuarioController, ProntuarioOperationalController],
  providers: [ProntuarioService],
  exports: [ProntuarioService],
})
export class ProntuarioModule {}
