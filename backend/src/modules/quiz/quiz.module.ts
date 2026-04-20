import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizSession } from '../../entities/quiz-session.entity';
import { QuizPlayer } from '../../entities/quiz-player.entity';
import { QuizAnswer } from '../../entities/quiz-answer.entity';
import { TestTemplate } from '../../entities/test-template.entity';
import { TestQuestion } from '../../entities/test-question.entity';
import { QuizTemplate, QuizLibraryTemplate } from '../../entities/quiz-template.entity';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { QuizGateway } from './quiz.gateway';
import { AiModule } from '../ai/ai.module';
import { QuizLibrarySeedService } from './quiz-library.seed';

@Module({
  imports: [
    TypeOrmModule.forFeature([QuizSession, QuizPlayer, QuizAnswer, TestTemplate, TestQuestion, QuizTemplate, QuizLibraryTemplate]),
    AiModule,
  ],
  controllers: [QuizController],
  providers: [QuizService, QuizGateway, QuizLibrarySeedService],
  exports: [QuizService],
})
export class QuizModule {}
