import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { Auth } from '../auth/auth.decorators';
import { TenantId, CurrentUser } from '../auth/current-user.decorator';
import { DemandsService } from './demands.service';

@Controller('demands')
export class DemandsController {
  constructor(private demandsService: DemandsService) {}

   @Auth('mentor', 'super_admin', 'mentor_team')
  @Get()
   list(@TenantId() mentorId: string, @CurrentUser() user: any) {
     return this.demandsService.list(mentorId, user);
  }

  @Auth('mentor', 'super_admin', 'mentor_team')
  @Get(':id')
  findOne(@TenantId() mentorId: string, @Param('id') id: string) {
    return this.demandsService.findOne(mentorId, id);
  }

  @Auth('mentor', 'super_admin', 'mentor_team')
  @Post()
  create(@TenantId() mentorId: string, @Body() dto: any) {
    return this.demandsService.create(mentorId, dto);
  }

  @Auth('mentor', 'super_admin', 'mentor_team')
  @Patch(':id')
  update(@TenantId() mentorId: string, @Param('id') id: string, @Body() dto: any) {
    return this.demandsService.update(mentorId, id, dto);
  }

  @Auth('mentor', 'super_admin')
  @Delete(':id')
  delete(@TenantId() mentorId: string, @Param('id') id: string) {
    return this.demandsService.delete(mentorId, id);
  }

  @Auth('mentor', 'super_admin', 'mentor_team')
  @Post(':id/versions')
  addVersion(@TenantId() mentorId: string, @Param('id') id: string, @CurrentUser() user: any, @Body() dto: any) {
    return this.demandsService.addVersion(mentorId, id, user.sub, dto);
  }

  @Auth('mentor', 'super_admin', 'mentor_team')
  @Post(':id/comments')
  addComment(@TenantId() mentorId: string, @Param('id') id: string, @CurrentUser() user: any, @Body() dto: any) {
    return this.demandsService.addComment(mentorId, id, user.sub, dto);
  }

  @Auth('mentor', 'super_admin', 'mentor_team')
  @Post('ai/briefing')
  generateBriefing(@TenantId() mentorId: string, @Body() dto: any) {
    return this.demandsService.generateBriefing(mentorId, dto);
  }
}
