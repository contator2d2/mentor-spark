import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MentoredRecord } from '../../entities/mentored-record.entity';
import { MentoredObjective } from '../../entities/mentored-objective.entity';
import { MentoredPain } from '../../entities/mentored-pain.entity';
import { MentoredMetric } from '../../entities/mentored-metric.entity';
import { MentoredPrivateNote } from '../../entities/mentored-private-note.entity';
import { MentoredAlert } from '../../entities/mentored-alert.entity';
import { MentoredMaterial } from '../../entities/mentored-material.entity';
import { MentoredTimelineEvent } from '../../entities/mentored-timeline-event.entity';
import { MentoredAIInsight } from '../../entities/mentored-ai-insight.entity';
import { MentorProntuarioConfig } from '../../entities/mentor-prontuario-config.entity';
import { Lead } from '../../entities/lead.entity';
import { User } from '../../entities/user.entity';
import { TestResponse } from '../../entities/test-response.entity';
import { Meeting } from '../../entities/meeting.entity';
import { Task } from '../../entities/task.entity';
import { ProntuarioController } from './prontuario.controller';
import { ProntuarioService } from './prontuario.service';
import { ProntuarioOperationalController } from './prontuario-operational.controller';
import { ProntuarioPrivateController } from './prontuario-private.controller';
import { ProntuarioAlertsService } from './prontuario-alerts.service';
import { ProntuarioAiController } from './prontuario-ai.controller';
import { ProntuarioAiService } from './prontuario-ai.service';
import { ProntuarioAccessController } from './prontuario-access.controller';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MentoredRecord,
      MentoredObjective,
      MentoredPain,
      MentoredMetric,
      MentoredPrivateNote,
      MentoredAlert,
      MentoredMaterial,
      MentoredTimelineEvent,
      MentoredAIInsight,
      MentorProntuarioConfig,
      Lead,
      User,
      TestResponse,
      Meeting,
      Task,
    ]),
    AiModule,
  ],
  controllers: [
    ProntuarioController,
    ProntuarioOperationalController,
    ProntuarioPrivateController,
    ProntuarioAiController,
  ],
  providers: [ProntuarioService, ProntuarioAlertsService, ProntuarioAiService],
  exports: [ProntuarioService, ProntuarioAlertsService, ProntuarioAiService],
})
export class ProntuarioModule {}
