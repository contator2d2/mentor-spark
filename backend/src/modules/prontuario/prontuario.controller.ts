import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';
import { ProntuarioService } from './prontuario.service';
import { MentoredRecord } from '../../entities/mentored-record.entity';

/**
 * Prontuário Inteligente — substitui o antigo /dossier.
 * GET aceita leadId OU userId (resolve automaticamente).
 */
@Controller('prontuario')
export class ProntuarioController {
  constructor(private readonly svc: ProntuarioService) {}

  @Auth('mentor', 'super_admin')
  @Get(':leadIdOrUserId')
  byLead(@TenantId() mentorId: string, @Param('leadIdOrUserId') id: string) {
    return this.svc.getFull(mentorId, id);
  }

  @Auth('mentor', 'super_admin')
  @Patch(':id')
  patch(
    @TenantId() mentorId: string,
    @Param('id') recordId: string,
    @Body() dto: Partial<MentoredRecord>,
  ) {
    return this.svc.patch(mentorId, recordId, dto);
  }

  @Auth('mentor', 'super_admin')
  @Post(':id/recalculate')
  recalc(@TenantId() mentorId: string, @Param('id') recordId: string) {
    return this.svc.recalculateById(mentorId, recordId);
  }
}
