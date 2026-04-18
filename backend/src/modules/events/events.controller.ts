import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CaptureEvent } from '../../entities/capture-event.entity';
import { Lead } from '../../entities/lead.entity';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';

class UpsertEventDto {
  @IsString() name: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() startsAt?: string;
  @IsOptional() @IsString() endsAt?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

function makeSlug(name: string) {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${base || 'evento'}-${rand}`;
}

@Controller('events')
export class EventsController {
  constructor(
    @InjectRepository(CaptureEvent) private events: Repository<CaptureEvent>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
  ) {}

  @Auth('mentor', 'super_admin')
  @Get()
  async list(@TenantId() mentorId: string) {
    const list = await this.events.find({ where: { mentorId }, order: { createdAt: 'DESC' } });
    // contagem de leads por evento
    return Promise.all(
      list.map(async (e) => {
        const total = await this.leads.count({ where: { eventId: e.id } });
        const converted = await this.leads
          .createQueryBuilder('l')
          .where('l.eventId = :id', { id: e.id })
          .andWhere('l.stage = :s', { s: 'client' })
          .getCount();
        return { ...e, leadsCount: total, convertedCount: converted };
      }),
    );
  }

  @Auth('mentor', 'super_admin')
  @Post()
  async create(@TenantId() mentorId: string, @Body() dto: UpsertEventDto) {
    const ev = this.events.create({
      mentorId,
      name: dto.name,
      location: dto.location,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      notes: dto.notes,
      isActive: dto.isActive ?? true,
      slug: makeSlug(dto.name),
    });
    return this.events.save(ev);
  }

  @Auth('mentor', 'super_admin')
  @Patch(':id')
  async update(@TenantId() mentorId: string, @Param('id') id: string, @Body() dto: Partial<UpsertEventDto>) {
    const e = await this.events.findOne({ where: { id, mentorId } });
    if (!e) return { ok: false };
    const patch: any = { ...dto };
    if (dto.startsAt !== undefined) patch.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.endsAt !== undefined) patch.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    await this.events.update(id, patch);
    return this.events.findOne({ where: { id } });
  }

  @Auth('mentor', 'super_admin')
  @Delete(':id')
  async remove(@TenantId() mentorId: string, @Param('id') id: string) {
    const e = await this.events.findOne({ where: { id, mentorId } });
    if (!e) return { ok: false };
    await this.events.delete(id);
    return { ok: true };
  }
}
