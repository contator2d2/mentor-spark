import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibraryTestTemplate } from '../../entities/library-test-template.entity';
import { TestTemplate } from '../../entities/test-template.entity';
import { TestQuestion } from '../../entities/test-question.entity';
import { LibraryService } from './library.service';
import { LibraryController } from './library.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LibraryTestTemplate, TestTemplate, TestQuestion])],
  providers: [LibraryService],
  controllers: [LibraryController],
  exports: [LibraryService],
})
export class LibraryModule {}
