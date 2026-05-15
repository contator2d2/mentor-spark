import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Demand } from '../../entities/demand.entity';
import { DemandVersion } from '../../entities/demand-version.entity';
 import { DemandComment } from '../../entities/demand-comment.entity';
 import { User } from '../../entities/user.entity';
import { DemandsController } from './demands.controller';
import { DemandsService } from './demands.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
     TypeOrmModule.forFeature([Demand, DemandVersion, DemandComment, User]),
    AiModule,
     IntegrationsModule,
  ],
  controllers: [DemandsController],
  providers: [DemandsService],
  exports: [DemandsService],
})
export class DemandsModule {}
