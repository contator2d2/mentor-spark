import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestAssignment } from '../../entities/test-assignment.entity';
import { TestTemplate } from '../../entities/test-template.entity';
import { User } from '../../entities/user.entity';
import { TestAssignmentsController } from './test-assignments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TestAssignment, TestTemplate, User])],
  controllers: [TestAssignmentsController],
})
export class TestAssignmentsModule {}
