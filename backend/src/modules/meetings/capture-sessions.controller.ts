import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';

import { Auth } from '../auth/auth.decorators';
import { CurrentUser, TenantId } from '../auth/current-user.decorator';

import { MeetingCaptureSession } from '../../entities/meeting-capture-session.entity';
import { MeetingCaptureHeartbeat } from '../../entities/meeting-capture-heartbeat.entity';
import { MeetingAudioAsset } from '../../entities/meeting-audio-asset.entity';
import { MeetingAudioChunk } from '../../entities/meeting-audio-chunk.entity';
import { MeetingCaptureLog } from '../../entities/meeting-capture-log.entity';
import { Meeting } from '../../entities/meeting.entity';

import { CapturePipelineService } from './capture-pipeline.service';

@ApiTags('capture-sessions')
@ApiBearerAuth()
@Controller()
export class CaptureSessionsController {
  constructor(
    @InjectRepository(MeetingCaptureSession) private sessions: Repository<MeetingCaptureSession>,
    @InjectRepository(MeetingCaptureHeartbeat) private heartbeats: Repository<MeetingCaptureHeartbeat>,
    @InjectRepository(MeetingAudioAsset) private assets: Repository<MeetingAudioAsset>,
    @InjectRepository(MeetingAudioChunk) private chunks: Repository<MeetingAudioChunk>,
    @InjectRepository(MeetingCaptureLog) private logs: Repository<MeetingCaptureLog>,
    @InjectRepository(Meeting) private meetings: Repository<Meeting>,
    private pipeline: CapturePipelineService,
  ) {}

  // ---------- Criar sessão ----------
  @Auth('mentor', 'super_admin')
  @Post('meetings/:id/capture-sessions')
  async create(
    @TenantId() mentorId: string,
    @CurrentUser() user: any,
    @Param('id') meetingId: string,
    @Body() dto: any,
  ) {
    const meeting = await this.meetings.findOne({ where: { id: meetingId, mentorId } });
    if (!meeting) throw new BadRequestException('Reunião não encontrada');

    const s = await this.sessions.save(this.sessions.create({
      meetingId,
      tenantId: mentorId,
      initiatedByUserId: user.sub,
      sourceType: dto?.sourceType || 'mic',
      browserName: dto?.browserName,
      browserVersion: dto?.browserVersion,
      osName: dto?.osName,
      status: 'preparing',
      startedAt: new Date(),
      lastHeartbeatAt: new Date(),
    }));
    await this.pipeline.log(s.id, 'info', 'session_created', 'Sessão de captura criada');
    await this.meetings.update({ id: meetingId } as any, { status: 'in_progress' });
    return s;
  }

  // ---------- Heartbeat ----------
  @Auth('mentor', 'super_admin')
  @Post('capture-sessions/:id/heartbeat')
  async heartbeat(@TenantId() mentorId: string, @Param('id') id: string, @Body() dto: any) {
    const s = await this.sessions.findOne({ where: { id, tenantId: mentorId } });
    if (!s) throw new BadRequestException('Sessão não encontrada');
    s.lastHeartbeatAt = new Date();
    if (dto?.status === 'recording') s.status = 'recording';
    if (dto?.status === 'paused') s.status = 'paused';
    await this.sessions.save(s);
    await this.heartbeats.save(this.heartbeats.create({
      captureSessionId: id,
      timestamp: new Date(),
      audioLevel: dto?.audioLevel ?? 0,
      streamStatus: dto?.streamStatus || 'ok',
      sourceType: dto?.sourceType || s.sourceType,
      notes: dto?.notes,
    }));
    return { ok: true };
  }

  // ---------- Encerrar (sem upload ainda) ----------
  @Auth('mentor', 'super_admin')
  @Patch('capture-sessions/:id/end')
  async end(@TenantId() mentorId: string, @Param('id') id: string, @Body() dto: any) {
    const s = await this.sessions.findOne({ where: { id, tenantId: mentorId } });
    if (!s) throw new BadRequestException('Sessão não encontrada');
    s.status = 'stopped';
    s.endedAt = new Date();
    if (s.startedAt) s.durationSeconds = Math.round((s.endedAt.getTime() - new Date(s.startedAt).getTime()) / 1000);
    await this.sessions.save(s);
    await this.pipeline.log(id, 'info', 'session_ended', `Captura encerrada (${s.durationSeconds}s)`);
    return s;
  }

  // ---------- Marcar falha ----------
  @Auth('mentor', 'super_admin')
  @Post('capture-sessions/:id/fail')
  async fail(@TenantId() mentorId: string, @Param('id') id: string, @Body() dto: any) {
    const s = await this.sessions.findOne({ where: { id, tenantId: mentorId } });
    if (!s) throw new BadRequestException('Sessão não encontrada');
    s.status = 'failed';
    s.errorMessage = dto?.message || 'Falha reportada pelo cliente';
    await this.sessions.save(s);
    await this.pipeline.log(id, 'error', 'client_fail', s.errorMessage!);
    return { ok: true };
  }

  // ---------- Upload do áudio bruto ----------
  @Auth('mentor', 'super_admin')
  @Post('capture-sessions/:id/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = path.resolve(process.cwd(), 'uploads', 'meetings', 'originals');
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const id = (req.params as any).id;
          const ext = path.extname(file.originalname) || '.webm';
          cb(null, `${id}-${Date.now()}${ext}`);
        },
      }),
      limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB
    }),
  )
  async upload(@TenantId() mentorId: string, @Param('id') id: string, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Arquivo obrigatório');
    const s = await this.sessions.findOne({ where: { id, tenantId: mentorId } });
    if (!s) throw new BadRequestException('Sessão não encontrada');

    const storageUrl = `/uploads/meetings/originals/${file.filename}`;
    const asset = await this.assets.save(this.assets.create({
      captureSessionId: id,
      assetType: 'original',
      storageUrl,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      processingStatus: 'pending',
    }));

    s.status = 'uploaded';
    await this.sessions.save(s);
    await this.meetings.update({ id: s.meetingId } as any, { audioUrl: storageUrl, status: 'processing' });
    await this.pipeline.log(id, 'info', 'upload_complete', `Upload concluído (${(file.size/1024/1024).toFixed(2)} MB)`);

    // Dispara pipeline em background
    this.pipeline.run(id, asset.id).catch((e) => {
      this.pipeline.log(id, 'error', 'pipeline_crashed', e.message).catch(() => {});
    });

    return { ok: true, asset, sessionStatus: s.status };
  }

  // ---------- Status / Transcrição / Logs ----------
  @Auth('mentor', 'super_admin', 'mentorado', 'prospect')
  @Get('capture-sessions/:id/status')
  async status(@TenantId() mentorId: string, @Param('id') id: string) {
    const s = await this.sessions.findOne({ where: { id, tenantId: mentorId } });
    if (!s) throw new BadRequestException('Sessão não encontrada');
    return {
      id: s.id,
      status: s.status,
      totalChunks: s.totalChunks,
      completedChunks: s.completedChunks,
      durationSeconds: s.durationSeconds,
      lastHeartbeatAt: s.lastHeartbeatAt,
      errorMessage: s.errorMessage,
    };
  }

  @Auth('mentor', 'super_admin', 'mentorado', 'prospect')
  @Get('capture-sessions/:id/transcription')
  async transcription(@TenantId() mentorId: string, @Param('id') id: string) {
    const s = await this.sessions.findOne({ where: { id, tenantId: mentorId } });
    if (!s) throw new BadRequestException('Sessão não encontrada');
    const chunks = await this.chunks.find({ where: { captureSessionId: id }, order: { orderIndex: 'ASC' } });
    return {
      consolidated: s.consolidatedTranscript || '',
      chunks: chunks.map((c) => ({
        id: c.id,
        orderIndex: c.orderIndex,
        startSecond: c.startSecond,
        endSecond: c.endSecond,
        status: c.transcriptionStatus,
        retryCount: c.retryCount,
        transcript: c.transcript,
        errorMessage: c.errorMessage,
      })),
    };
  }

  @Auth('mentor', 'super_admin')
  @Get('capture-sessions/:id/logs')
  async getLogs(@TenantId() mentorId: string, @Param('id') id: string, @Query('limit') limit = '100') {
    const s = await this.sessions.findOne({ where: { id, tenantId: mentorId } });
    if (!s) throw new BadRequestException('Sessão não encontrada');
    return this.logs.find({
      where: { captureSessionId: id },
      order: { createdAt: 'DESC' },
      take: Math.min(+limit, 500),
    });
  }

  @Auth('mentor', 'super_admin')
  @Get('capture-sessions/:id/assets')
  assets_(@TenantId() mentorId: string, @Param('id') id: string) {
    return this.assets.find({ where: { captureSessionId: id }, order: { createdAt: 'ASC' } });
  }

  @Auth('mentor', 'super_admin')
  @Post('capture-sessions/:id/reprocess')
  async reprocess(@TenantId() mentorId: string, @Param('id') id: string) {
    const s = await this.sessions.findOne({ where: { id, tenantId: mentorId } });
    if (!s) throw new BadRequestException('Sessão não encontrada');
    await this.pipeline.reprocess(id);
    return { ok: true };
  }

  // ---------- Listar sessões de uma reunião ----------
  @Auth('mentor', 'super_admin', 'mentorado', 'prospect')
  @Get('meetings/:id/capture-sessions')
  listForMeeting(@TenantId() mentorId: string, @Param('id') meetingId: string) {
    return this.sessions.find({ where: { meetingId, tenantId: mentorId }, order: { createdAt: 'DESC' } });
  }
}
