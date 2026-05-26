import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DemandsService } from './demands.service';

@Injectable()
export class DemandsNotificationCron {
  private readonly logger = new Logger(DemandsNotificationCron.name);

  constructor(private readonly demandsService: DemandsService) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCron() {
    this.logger.log('Running demands notification cron...');
    await this.demandsService.processDeadlineNotifications();
  }
}
