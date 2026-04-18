import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunityPost } from '../../entities/community-post.entity';
import { CommunityComment } from '../../entities/community-comment.entity';
import { CommunityReaction } from '../../entities/community-reaction.entity';
import { User } from '../../entities/user.entity';
import { Lead } from '../../entities/lead.entity';
import { CommunityService } from './community.service';
import { CommunityController } from './community.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CommunityPost, CommunityComment, CommunityReaction, User, Lead]),
    NotificationsModule,
  ],
  controllers: [CommunityController],
  providers: [CommunityService],
})
export class CommunityModule {}
