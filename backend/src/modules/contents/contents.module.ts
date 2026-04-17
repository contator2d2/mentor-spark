import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Content } from '../../entities/content.entity';
import { ContentsController } from './contents.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Content])],
  controllers: [ContentsController],
})
export class ContentsModule {}
