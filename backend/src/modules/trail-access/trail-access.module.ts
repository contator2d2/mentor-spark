import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trail } from '../../entities/trail.entity';
import { TrailModule as TrailModuleEntity } from '../../entities/trail-module.entity';
import { TrailLesson } from '../../entities/trail-lesson.entity';
import { TrailProgress } from '../../entities/trail-progress.entity';
import { TrailAccess } from '../../entities/trail-access.entity';
import { TrailAccessRequest } from '../../entities/trail-access-request.entity';
import { Lead } from '../../entities/lead.entity';
import { User } from '../../entities/user.entity';
import { Charge } from '../../entities/charge.entity';
import { TrailAccessService } from './trail-access.service';
import { TrailAccessController } from './trail-access.controller';
import { AccessGroupsModule } from '../access-groups/access-groups.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Trail, TrailModuleEntity, TrailLesson, TrailProgress,
      TrailAccess, TrailAccessRequest,
      Lead, User, Charge,
    ]),
    AccessGroupsModule,
    NotificationsModule,
  ],
  controllers: [TrailAccessController],
  providers: [TrailAccessService],
  exports: [TrailAccessService],
})
export class TrailAccessModule {}