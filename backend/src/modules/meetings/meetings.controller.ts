import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from '../../entities/meeting.entity';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';
import { AiService } from '../ai/ai.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('meetings')
@ApiBearerAuth()
@Controller('meetings')
export class MeetingsController {
  constructor(
    @InjectRepository(Meeting) private meetings: Repository<Meeting>,
    private ai: AiService,
  ) {}

  @Auth('mentor', 'super_admin', 'mentorado', 'prospect')
  @Get()
  list(@TenantId() mentorId: string, @Query('leadId') leadId?: string) {
    const where: any = { mentorId };
    if (leadId) where.leadId = leadId;
    return this.meetings.find({ where, order: { scheduledAt: 'DESC' } });
  }

  @Auth('mentor', 'super_admin')
  @Post()
  create(@TenantId() mentorId: string, @Body() dto: any) {
    return this.meetings.save(this.meetings.create({ ...dto, mentorId }));
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

  @Auth('mentor', 'super_admin')
  @Post(':id/summarize')
  async summarize(@TenantId() mentorId: string, @Param('id') id: string) {
    const m = await this.meetings.findOne({ where: { id, mentorId } });
    if (!m || !m.transcript) return { error: 'Sem transcrição' };
    const { summary, insights } = await this.ai.summarizeMeeting(mentorId, m.transcript);
    m.aiSummary = summary;
    m.aiInsights = insights;
    await this.meetings.save(m);
    return m;
  }

  @Auth('mentor', 'super_admin')
  @Delete(':id')
  async delete(@TenantId() mentorId: string, @Param('id') id: string) {
    await this.meetings.delete({ id, mentorId } as any);
    return { ok: true };
  }
}
