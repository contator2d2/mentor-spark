import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Prompt } from '../../entities/prompt.entity';
import { PromptsController } from './prompts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Prompt])],
  controllers: [PromptsController],
})
export class PromptsModule {}
