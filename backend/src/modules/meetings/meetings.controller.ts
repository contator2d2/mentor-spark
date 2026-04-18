import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from '../../entities/meeting.entity';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';
import { AiService } from '../ai/ai.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MeetingsService } from './meetings.service';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';

@ApiTags('meetings')
@ApiBearerAuth()
@Controller('meetings')
export class MeetingsController {
  constructor(
    @InjectRepository(Meeting) private meetings: Repository<Meeting>,
    private ai: AiService,
    private service: MeetingsService,
  ) {}

  @Auth('mentor', 'super_admin', 'mentorado', 'prospect')
  @Get()
  async list(@TenantId() mentorId: string, @Query('leadId') leadId?: string) {
    try {
      const where: any = { mentorId };
      if (leadId) where.leadId = leadId;
      return await this.meetings.find({ where, order: { scheduledAt: 'DESC' } });
    } catch (err: any) {
      // Log detalhado para diagnosticar o 500 (ex: coluna ausente após migração).
      // eslint-disable-next-line no-console
      console.error('[GET /meetings] erro:', err?.message, err?.stack);
      throw new BadRequestException(`Falha ao listar reuniões: ${err?.message || 'erro desconhecido'}`);
    }
  }

  @Auth('mentor', 'super_admin')
  @Post()
  async create(@TenantId() mentorId: string, @Body() dto: any) {
    const m = await this.meetings.save(this.meetings.create({ ...dto, mentorId }));
    // Tenta criar evento no Google Calendar (não bloqueia se falhar)
    this.service.createGoogleEvent(mentorId, (m as any).id).catch(() => {});
    return m;
  }

  @Auth('mentor', 'super_admin', 'mentorado', 'prospect')
  @Get(':id')
  get(@TenantId() mentorId: string, @Param('id') id: string) {
    return this.meetings.findOne({ where: { id, mentorId } });
  }

  @Auth('mentor', 'super_admin')
  @Patch(':id')
  async update(@TenantId() mentorId: string, @Param('id') id: string, @Body() dto: any) {
    await this.meetings.update({ id, mentorId } as any, dto);
    return this.meetings.findOne({ where: { id, mentorId } });
  }

  /** Upload de áudio da reunião — dispara transcrição em background */
  @Auth('mentor', 'super_admin')
  @Post(':id/upload-audio')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = path.resolve(process.cwd(), 'uploads', 'meetings');
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const id = (req.params as any).id;
          const ext = path.extname(file.originalname) || '.mp3';
          cb(null, `${id}-${Date.now()}${ext}`);
        },
      }),
      limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
    }),
  )
  async uploadAudio(
    @TenantId() mentorId: string,
    @Param('id') id: string,
    @UploadedFile() file: any,
  ) {
    if (!file) throw new BadRequestException('Arquivo obrigatório');
    const m = await this.meetings.findOne({ where: { id, mentorId } });
    if (!m) throw new BadRequestException('Reunião não encontrada');
    m.audioUrl = `/uploads/meetings/${file.filename}`;
    m.status = 'processing';
    await this.meetings.save(m);
    // Dispara transcrição em background
    this.service.transcribeAndSummarize(mentorId, id, file.path).catch(() => {});
    return { ok: true, status: m.status, audioUrl: m.audioUrl };
  }

  @Auth('mentor', 'super_admin')
  @Post(':id/summarize')
  async summarize(@TenantId() mentorId: string, @Param('id') id: string) {
    const m = await this.meetings.findOne({ where: { id, mentorId } });
    if (!m || !m.transcript) return { error: 'Sem transcrição' };
    const { summary, insights } = await this.ai.summarizeMeeting(mentorId, m.transcript);
    m.aiSummary = summary;
    m.aiInsights = insights;
    m.status = 'completed';
    await this.meetings.save(m);
    return m;
  }

  /** Alias REST do spec: POST /meetings/:id/generate-summary */
  @Auth('mentor', 'super_admin')
  @Post(':id/generate-summary')
  generateSummary(@TenantId() mentorId: string, @Param('id') id: string) {
    return this.summarize(mentorId, id);
  }

  @Auth('mentor', 'super_admin')
  @Delete(':id')
  async delete(@TenantId() mentorId: string, @Param('id') id: string) {
    await this.meetings.delete({ id, mentorId } as any);
    return { ok: true };
  }
}
