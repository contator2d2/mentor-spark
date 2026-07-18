import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesPage } from '../../entities/sales-page.entity';
import { User } from '../../entities/user.entity';
import { MentorPaymentProvider } from '../../entities/mentor-payment-provider.entity';
import { SalesPagesController, PublicSalesPagesController } from './sales-pages.controller';
import { SalesPagesService } from './sales-pages.service';
import { AiModule } from '../ai/ai.module';
import { LeadsModule } from '../leads/leads.module';
import { AutomationsModule } from '../automations/automations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SalesPage, User, MentorPaymentProvider]),
    AiModule,
    LeadsModule,
    AutomationsModule,
  ],
  controllers: [SalesPagesController, PublicSalesPagesController],
  providers: [SalesPagesService],
  exports: [SalesPagesService],
})
export class SalesPagesModule {}