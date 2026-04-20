import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizSession } from '../../entities/quiz-session.entity';
import { QuizPlayer } from '../../entities/quiz-player.entity';
import { QuizAnswer } from '../../entities/quiz-answer.entity';
import { TestTemplate } from '../../entities/test-template.entity';
import { TestQuestion } from '../../entities/test-question.entity';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { QuizGateway } from './quiz.gateway';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([QuizSession, QuizPlayer, QuizAnswer, TestTemplate, TestQuestion]), AiModule],
  controllers: [QuizController],
  providers: [QuizService, QuizGateway],
  exports: [QuizService],
})
export class QuizModule {}
