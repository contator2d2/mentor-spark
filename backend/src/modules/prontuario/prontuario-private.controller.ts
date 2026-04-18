import {
  BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';
import { MentoredRecord } from '../../entities/mentored-record.entity';
import { MentoredPrivateNote } from '../../entities/mentored-private-note.entity';
import { MentoredAlert, AlertStatus } from '../../entities/mentored-alert.entity';
import { MentoredMaterial } from '../../entities/mentored-material.entity';
import { MentoredTimelineEvent } from '../../entities/mentored-timeline-event.entity';
import { ProntuarioAlertsService } from './prontuario-alerts.service';
import { TimelineEventType } from '../../entities/mentored-timeline-event.entity';

type AnyDto = Record<string, any>;

/**
 * Fase 3 — Notas privadas, Alertas, Materiais e Timeline persistida.
 * Notas e alertas NUNCA são expostos em rotas públicas.
 */
@Controller('prontuario')
export class ProntuarioPrivateController {
  constructor(
    @InjectRepository(MentoredRecord) private records: Repository<MentoredRecord>,
    @InjectRepository(MentoredPrivateNote) private notes: Repository<MentoredPrivateNote>,
    @InjectRepository(MentoredAlert) private alerts: Repository<MentoredAlert>,
    @InjectRepository(MentoredMaterial) private materials: Repository<MentoredMaterial>,
    @InjectRepository(MentoredTimelineEvent) private events: Repository<MentoredTimelineEvent>,
    private alertsService: ProntuarioAlertsService,
  ) {}

  private async assertOwn(mentorId: string, recordId: string) {
    const rec = await this.records.findOne({ where: { id: recordId, mentorId } });
    if (!rec) throw new NotFoundException('Prontuário não encontrado');
    return rec;
  }

  // ============ Notas Privadas ============
  @Auth('mentor', 'super_admin')
  @Get(':recordId/private-notes')
  async listNotes(@TenantId() mentorId: string, @Param('recordId') recordId: string) {
    await this.assertOwn(mentorId, recordId);
    return this.notes.find({
      where: { recordId, mentorId },
      order: { pinned: 'DESC', createdAt: 'DESC' },
    });
  }

  @Auth('mentor', 'super_admin')
  @Post(':recordId/private-notes')
  async createNote(@TenantId() mentorId: string, @Param('recordId') recordId: string, @Body() dto: AnyDto) {
    await this.assertOwn(mentorId, recordId);
    if (!dto.content?.trim()) throw new BadRequestException('Conteúdo obrigatório');
    const note = await this.notes.save(this.notes.create({ ...dto, mentorId, recordId }));
    await this.alertsService.logEvent(
      mentorId, recordId, TimelineEventType.PRIVATE_NOTE,
      'Nota privada adicionada',
      { source: 'mentor', meta: { category: note.category } },
    );
    return note;
  }

  @Auth('mentor', 'super_admin')
  @Patch(':recordId/private-notes/:id')
  async updateNote(
    @TenantId() mentorId: string,
    @Param('recordId') recordId: string,
    @Param('id') id: string,
    @Body() dto: AnyDto,
  ) {
    await this.assertOwn(mentorId, recordId);
    const note = await this.notes.findOne({ where: { id, recordId, mentorId } });
    if (!note) throw new NotFoundException('Nota não encontrada');
    Object.assign(note, dto);
    return this.notes.save(note);
  }

  @Auth('mentor', 'super_admin')
  @Delete(':recordId/private-notes/:id')
  async deleteNote(@TenantId() mentorId: string, @Param('recordId') recordId: string, @Param('id') id: string) {
    await this.assertOwn(mentorId, recordId);
    await this.notes.delete({ id, recordId, mentorId });
    return { ok: true };
  }

  // ============ Alertas ============
  @Auth('mentor', 'super_admin')
  @Get(':recordId/alerts')
  async listAlerts(@TenantId() mentorId: string, @Param('recordId') recordId: string) {
    await this.assertOwn(mentorId, recordId);
    return this.alerts.find({
      where: { recordId, mentorId },
      order: { status: 'ASC', severity: 'DESC', createdAt: 'DESC' },
    });
  }

  @Auth('mentor', 'super_admin')
  @Post(':recordId/alerts/evaluate')
  async evaluateAlerts(@TenantId() mentorId: string, @Param('recordId') recordId: string) {
    const rec = await this.assertOwn(mentorId, recordId);
    await this.alertsService.evaluate(rec);
    return this.alerts.find({
      where: { recordId, mentorId },
      order: { status: 'ASC', severity: 'DESC', createdAt: 'DESC' },
    });
  }

  @Auth('mentor', 'super_admin')
  @Post(':recordId/alerts')
  async createCustomAlert(
    @TenantId() mentorId: string,
    @Param('recordId') recordId: string,
    @Body() dto: AnyDto,
  ) {
    await this.assertOwn(mentorId, recordId);
    if (!dto.title?.trim()) throw new BadRequestException('Título obrigatório');
    return this.alerts.save(this.alerts.create({ ...dto, mentorId, recordId }));
  }

  @Auth('mentor', 'super_admin')
  @Patch(':recordId/alerts/:id')
  async updateAlert(
    @TenantId() mentorId: string,
    @Param('recordId') recordId: string,
    @Param('id') id: string,
    @Body() dto: AnyDto,
  ) {
    await this.assertOwn(mentorId, recordId);
    const alert = await this.alerts.findOne({ where: { id, recordId, mentorId } });
    if (!alert) throw new NotFoundException('Alerta não encontrado');
    if (dto.status === AlertStatus.ACKNOWLEDGED && !alert.acknowledgedAt) alert.acknowledgedAt = new Date();
    if (dto.status === AlertStatus.RESOLVED && !alert.resolvedAt) {
      alert.resolvedAt = new Date();
      await this.alertsService.logEvent(
        mentorId, recordId, TimelineEventType.ALERT_RESOLVED,
        `Alerta resolvido: ${alert.title}`, { source: 'mentor' },
      );
    }
    Object.assign(alert, dto);
    return this.alerts.save(alert);
  }

  @Auth('mentor', 'super_admin')
  @Delete(':recordId/alerts/:id')
  async deleteAlert(@TenantId() mentorId: string, @Param('recordId') recordId: string, @Param('id') id: string) {
    await this.assertOwn(mentorId, recordId);
    await this.alerts.delete({ id, recordId, mentorId });
    return { ok: true };
  }

  // ============ Materiais ============
  @Auth('mentor', 'super_admin')
  @Get(':recordId/materials')
  async listMaterials(@TenantId() mentorId: string, @Param('recordId') recordId: string) {
    await this.assertOwn(mentorId, recordId);
    return this.materials.find({ where: { recordId, mentorId }, order: { createdAt: 'DESC' } });
  }

  @Auth('mentor', 'super_admin')
  @Post(':recordId/materials')
  async createMaterial(@TenantId() mentorId: string, @Param('recordId') recordId: string, @Body() dto: AnyDto) {
    await this.assertOwn(mentorId, recordId);
    if (!dto.title?.trim()) throw new BadRequestException('Título obrigatório');
    const mat = await this.materials.save(this.materials.create({ ...dto, mentorId, recordId }));
    if (mat.sharedWithMentee) {
      await this.alertsService.logEvent(
        mentorId, recordId, TimelineEventType.MATERIAL_SHARED,
        `Material compartilhado: ${mat.title}`, { source: 'mentor', meta: { type: mat.type } },
      );
    }
    return mat;
  }

  @Auth('mentor', 'super_admin')
  @Patch(':recordId/materials/:id')
  async updateMaterial(
    @TenantId() mentorId: string,
    @Param('recordId') recordId: string,
    @Param('id') id: string,
    @Body() dto: AnyDto,
  ) {
    await this.assertOwn(mentorId, recordId);
    const mat = await this.materials.findOne({ where: { id, recordId, mentorId } });
    if (!mat) throw new NotFoundException('Material não encontrado');
    Object.assign(mat, dto);
    return this.materials.save(mat);
  }

  @Auth('mentor', 'super_admin')
  @Delete(':recordId/materials/:id')
  async deleteMaterial(@TenantId() mentorId: string, @Param('recordId') recordId: string, @Param('id') id: string) {
    await this.assertOwn(mentorId, recordId);
    await this.materials.delete({ id, recordId, mentorId });
    return { ok: true };
  }

  // ============ Timeline persistida ============
  @Auth('mentor', 'super_admin')
  @Get(':recordId/events')
  async listEvents(@TenantId() mentorId: string, @Param('recordId') recordId: string) {
    await this.assertOwn(mentorId, recordId);
    return this.events.find({
      where: { recordId, mentorId },
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }
}
