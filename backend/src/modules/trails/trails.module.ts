import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trail } from '../../entities/trail.entity';
import { TrailModule as TrailModuleEntity } from '../../entities/trail-module.entity';
import { TrailLesson } from '../../entities/trail-lesson.entity';
import { TrailProgress } from '../../entities/trail-progress.entity';
import { Lead } from '../../entities/lead.entity';
import { TrailsService } from './trails.service';
import { TrailsController } from './trails.controller';
import { TrailAccessModule } from '../trail-access/trail-access.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trail, TrailModuleEntity, TrailLesson, TrailProgress, Lead]),
    TrailAccessModule,
  ],
  controllers: [TrailsController],
  providers: [TrailsService],
  exports: [TrailsService],
})
export class TrailsModule {}
