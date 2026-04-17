import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { MentorController } from './mentor.controller';
import { MailService } from '../../shared/mail.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [MentorController],
  providers: [MailService],
})
export class MentorModule {}
