import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamMember } from '../../entities/team-member.entity';
import { User } from '../../entities/user.entity';
import { Plan } from '../../entities/plan.entity';
import { TeamController } from './team.controller';
import { MailService } from '../../shared/mail.service';

@Module({
  imports: [TypeOrmModule.forFeature([TeamMember, User, Plan])],
  controllers: [TeamController],
  providers: [MailService],
})
export class TeamModule {}
