import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessGroup } from '../../entities/access-group.entity';
import { AccessGroupMember } from '../../entities/access-group-member.entity';
import { Lead } from '../../entities/lead.entity';
import { EventRegistration } from '../../entities/event-registration.entity';
import { MentorSubscription } from '../../entities/mentor-subscription.entity';
import { AccessGroupsService } from './access-groups.service';
import { AccessGroupsController } from './access-groups.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AccessGroup, AccessGroupMember, Lead, EventRegistration, MentorSubscription])],
  controllers: [AccessGroupsController],
  providers: [AccessGroupsService],
  exports: [AccessGroupsService],
})
export class AccessGroupsModule {}