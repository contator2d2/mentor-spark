import {
  BadRequestException, Body, Controller, Delete, Get, Param, Post, Query,
} from '@nestjs/common';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';
import { ProntuarioAiService } from './prontuario-ai.service';
import { InsightType } from '../../entities/mentored-ai-insight.entity';
import { MentorProntuarioConfig } from '../../entities/mentor-prontuario-config.entity';

const VALID_TYPES = Object.values(InsightType);

@Controller('prontuario')
export class ProntuarioAiController {
  constructor(private readonly svc: ProntuarioAiService) {}

  // ============ Personalização do mentor ============
  @Auth('mentor', 'super_admin')
  @Get('config/me')
  config(@TenantId() mentorId: string) {
    return this.svc.getConfig(mentorId);
  }

  @Auth('mentor', 'super_admin')
  @Post('config/me')
  updateConfig(@TenantId() mentorId: string, @Body() dto: Partial<MentorProntuarioConfig>) {
    return this.svc.updateConfig(mentorId, dto);
  }

  // ============ Insights ============
  @Auth('mentor', 'super_admin')
  @Get(':recordId/insights')
  list(@TenantId() mentorId: string, @Param('recordId') recordId: string) {
    return this.svc.listInsights(mentorId, recordId);
  }

  @Auth('mentor', 'super_admin')
  @Post(':recordId/insights/generate')
  generate(
    @TenantId() mentorId: string,
    @Param('recordId') recordId: string,
    @Body() dto: { type?: string; includeNotes?: boolean },
  ) {
    const type = (dto.type || 'executive_summary') as InsightType;
    if (!VALID_TYPES.includes(type)) throw new BadRequestException('Tipo de insight inválido');
    return this.svc.generate(mentorId, recordId, type, { includeNotes: !!dto.includeNotes });
  }

  @Auth('mentor', 'super_admin')
  @Post(':recordId/insights/:id/promote')
  promote(
    @TenantId() mentorId: string,
    @Param('recordId') recordId: string,
    @Param('id') id: string,
  ) {
    return this.svc.promoteInsight(mentorId, recordId, id);
  }

  @Auth('mentor', 'super_admin')
  @Delete(':recordId/insights/:id')
  remove(
    @TenantId() mentorId: string,
    @Param('recordId') recordId: string,
    @Param('id') id: string,
  ) {
    return this.svc.deleteInsight(mentorId, recordId, id);
  }
}
