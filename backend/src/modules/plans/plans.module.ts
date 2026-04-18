import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from '../../entities/plan.entity';
import { User } from '../../entities/user.entity';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { FeatureGuard } from './feature.guard';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Plan, User])],
  controllers: [PlansController],
  providers: [PlansService, FeatureGuard],
  exports: [PlansService, FeatureGuard],
})
export class PlansModule {}

