import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestTemplate } from '../../entities/test-template.entity';
import { TestQuestion } from '../../entities/test-question.entity';
import { TestResponse } from '../../entities/test-response.entity';
import { Lead } from '../../entities/lead.entity';
import { TestsService } from './tests.service';
import { TestsController } from './tests.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([TestTemplate, TestQuestion, TestResponse, Lead]), AiModule],
  providers: [TestsService],
  controllers: [TestsController],
  exports: [TestsService],
})
export class TestsModule {}
