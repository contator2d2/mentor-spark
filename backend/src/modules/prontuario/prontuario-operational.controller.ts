import {
  BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';
import { MentoredRecord } from '../../entities/mentored-record.entity';
import { MentoredObjective } from '../../entities/mentored-objective.entity';
import { MentoredPain } from '../../entities/mentored-pain.entity';
import { MentoredMetric, MentoredMetricExtras } from '../../entities/mentored-metric.entity';

type AnyDto = Record<string, any>;

/**
 * CRUD genérico das entidades operacionais do prontuário (objetivos, dores, indicadores).
 * Todas as rotas garantem isolamento por mentorId e validam que o record pertence ao mentor.
 */
@Controller('prontuario')
export class ProntuarioOperationalController {
  constructor(
    @InjectRepository(MentoredRecord) private records: Repository<MentoredRecord>,
    @InjectRepository(MentoredObjective) private objectives: Repository<MentoredObjective>,
    @InjectRepository(MentoredPain) private pains: Repository<MentoredPain>,
    @InjectRepository(MentoredMetric) private metrics: Repository<MentoredMetric>,
  ) {}

  private async assertOwn(mentorId: string, recordId: string) {
    const rec = await this.records.findOne({ where: { id: recordId, mentorId } });
    if (!rec) throw new NotFoundException('Prontuário não encontrado');
    return rec;
  }

  // ============ Objetivos ============
  @Auth('mentor', 'super_admin')
  @Get(':recordId/objectives')
  async listObjectives(@TenantId() mentorId: string, @Param('recordId') recordId: string) {
    await this.assertOwn(mentorId, recordId);
    return this.objectives.find({ where: { recordId, mentorId }, order: { createdAt: 'DESC' } });
  }

  @Auth('mentor', 'super_admin')
  @Post(':recordId/objectives')
  async createObjective(@TenantId() mentorId: string, @Param('recordId') recordId: string, @Body() dto: AnyDto) {
    await this.assertOwn(mentorId, recordId);
    if (!dto.title?.trim()) throw new BadRequestException('Título obrigatório');
    return this.objectives.save(this.objectives.create({ ...dto, mentorId, recordId }));
  }

  @Auth('mentor', 'super_admin')
  @Patch(':recordId/objectives/:id')
  async updateObjective(
    @TenantId() mentorId: string,
    @Param('recordId') recordId: string,
    @Param('id') id: string,
    @Body() dto: AnyDto,
  ) {
    await this.assertOwn(mentorId, recordId);
    const obj = await this.objectives.findOne({ where: { id, mentorId, recordId } });
    if (!obj) throw new NotFoundException('Objetivo não encontrado');
    Object.assign(obj, dto);
    return this.objectives.save(obj);
  }

  @Auth('mentor', 'super_admin')
  @Delete(':recordId/objectives/:id')
  async deleteObjective(
    @TenantId() mentorId: string,
    @Param('recordId') recordId: string,
    @Param('id') id: string,
  ) {
    await this.assertOwn(mentorId, recordId);
    await this.objectives.delete({ id, mentorId, recordId });
    return { ok: true };
  }

  // ============ Dores / Gargalos / Oportunidades ============
  @Auth('mentor', 'super_admin')
  @Get(':recordId/pains')
  async listPains(@TenantId() mentorId: string, @Param('recordId') recordId: string) {
    await this.assertOwn(mentorId, recordId);
    return this.pains.find({ where: { recordId, mentorId }, order: { createdAt: 'DESC' } });
  }

  @Auth('mentor', 'super_admin')
  @Post(':recordId/pains')
  async createPain(@TenantId() mentorId: string, @Param('recordId') recordId: string, @Body() dto: AnyDto) {
    await this.assertOwn(mentorId, recordId);
    if (!dto.title?.trim()) throw new BadRequestException('Título obrigatório');
    return this.pains.save(this.pains.create({ ...dto, mentorId, recordId, source: dto.source || 'manual' }));
  }

  @Auth('mentor', 'super_admin')
  @Patch(':recordId/pains/:id')
  async updatePain(
    @TenantId() mentorId: string,
    @Param('recordId') recordId: string,
    @Param('id') id: string,
    @Body() dto: AnyDto,
  ) {
    await this.assertOwn(mentorId, recordId);
    const p = await this.pains.findOne({ where: { id, mentorId, recordId } });
    if (!p) throw new NotFoundException('Item não encontrado');
    Object.assign(p, dto);
    return this.pains.save(p);
  }

  @Auth('mentor', 'super_admin')
  @Delete(':recordId/pains/:id')
  async deletePain(
    @TenantId() mentorId: string,
    @Param('recordId') recordId: string,
    @Param('id') id: string,
  ) {
    await this.assertOwn(mentorId, recordId);
    await this.pains.delete({ id, mentorId, recordId });
    return { ok: true };
  }

  // ============ Indicadores / Métricas ============
  @Auth('mentor', 'super_admin')
  @Get(':recordId/metrics')
  async listMetrics(@TenantId() mentorId: string, @Param('recordId') recordId: string) {
    await this.assertOwn(mentorId, recordId);
    return this.metrics.find({ where: { recordId, mentorId }, order: { category: 'ASC', name: 'ASC' } });
  }

  @Auth('mentor', 'super_admin')
  @Post(':recordId/metrics')
  async createMetric(@TenantId() mentorId: string, @Param('recordId') recordId: string, @Body() dto: AnyDto) {
    await this.assertOwn(mentorId, recordId);
    if (!dto.name?.trim()) throw new BadRequestException('Nome obrigatório');
    const m = this.metrics.create({ ...dto, mentorId, recordId, history: [] });
    if (dto.currentValue != null) {
      m.history = [{ date: new Date().toISOString(), value: Number(dto.currentValue) }];
    }
    return this.metrics.save(m);
  }

  @Auth('mentor', 'super_admin')
  @Patch(':recordId/metrics/:id')
  async updateMetric(
    @TenantId() mentorId: string,
    @Param('recordId') recordId: string,
    @Param('id') id: string,
    @Body() dto: AnyDto,
  ) {
    await this.assertOwn(mentorId, recordId);
    const m = await this.metrics.findOne({ where: { id, mentorId, recordId } });
    if (!m) throw new NotFoundException('Indicador não encontrado');

    // Se o valor atual mudou, empurrar pro histórico e calcular tendência
    if (dto.currentValue != null && Number(dto.currentValue) !== Number(m.currentValue)) {
      const next = Number(dto.currentValue);
      const prev = m.currentValue != null ? Number(m.currentValue) : undefined;
      m.previousValue = prev;
      const hist = m.history || [];
      hist.push({ date: new Date().toISOString(), value: next });
      m.history = hist.slice(-24);
      if (prev != null) {
        if (next > prev) m.trend = 'up' as any;
        else if (next < prev) m.trend = 'down' as any;
        else m.trend = 'flat' as any;
      }
      m.referenceDate = new Date().toISOString().slice(0, 10);
    }

    const allow = ['name', 'category', 'unit', 'currentValue', 'targetValue', 'frequency', 'notes', 'referenceDate'];
    for (const k of allow) if (dto[k] !== undefined) (m as any)[k] = dto[k];

    return this.metrics.save(m);
  }

  @Auth('mentor', 'super_admin')
  @Delete(':recordId/metrics/:id')
  async deleteMetric(
    @TenantId() mentorId: string,
    @Param('recordId') recordId: string,
    @Param('id') id: string,
  ) {
    await this.assertOwn(mentorId, recordId);
    await this.metrics.delete({ id, mentorId, recordId });
    return { ok: true };
  }
}
