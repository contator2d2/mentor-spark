import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';
import { LeadsService } from './leads.service';
import { LeadStage } from '../../entities/lead.entity';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('leads')
@ApiBearerAuth()
@Controller('leads')
export class LeadsController {
  constructor(private leads: LeadsService) {}

  @Auth('mentor', 'super_admin')
  @Get()
  list(@TenantId() mentorId: string, @Query('stage') stage?: LeadStage, @Query('q') q?: string) {
    return this.leads.list(mentorId, { stage, q });
  }

  @Auth('mentor', 'super_admin')
  @Get('stats')
  stats(@TenantId() mentorId: string) {
    return this.leads.stats(mentorId);
  }

  @Auth('mentor', 'super_admin')
  @Get(':id')
  get(@TenantId() mentorId: string, @Param('id') id: string) {
    return this.leads.getById(mentorId, id);
  }

  @Auth('mentor', 'super_admin')
  @Patch(':id')
  update(@TenantId() mentorId: string, @Param('id') id: string, @Body() dto: any) {
    return this.leads.update(mentorId, id, dto);
  }
}
