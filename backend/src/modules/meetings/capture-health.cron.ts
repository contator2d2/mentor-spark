/**
 * Monitor de saúde das sessões de captura.
 * Roda a cada 60s e marca sessões `recording` sem heartbeat há >2min como `failed`.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { MeetingCaptureSession } from '../../entities/meeting-capture-session.entity';
import { CapturePipelineService } from './capture-pipeline.service';

const HEARTBEAT_TIMEOUT_MS = 2 * 60 * 1000;

@Injectable()
export class CaptureHealthCron {
  private readonly logger = new Logger(CaptureHealthCron.name);

  constructor(
    @InjectRepository(MeetingCaptureSession) private sessions: Repository<MeetingCaptureSession>,
    private pipeline: CapturePipelineService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkStaleSessions() {
    const cutoff = new Date(Date.now() - HEARTBEAT_TIMEOUT_MS);
    const stale = await this.sessions.find({
      where: [
        { status: 'recording', lastHeartbeatAt: LessThan(cutoff) },
        { status: 'paused', lastHeartbeatAt: LessThan(cutoff) },
      ],
      take: 50,
    });
    for (const s of stale) {
      s.status = 'failed';
      s.errorMessage = 'Heartbeat ausente — captura considerada instável';
      await this.sessions.save(s);
      await this.pipeline.log(s.id, 'warn', 'heartbeat_lost', s.errorMessage);
    }
  }
}
