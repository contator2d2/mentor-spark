import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Auth } from '../auth/auth.decorators';
import { TenantId, CurrentUser } from '../auth/current-user.decorator';
import { TestsService } from './tests.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('tests')
@ApiBearerAuth()
@Controller('tests')
export class TestsController {
  constructor(private tests: TestsService) {}

  @Auth('mentor', 'super_admin')
  @Get('templates')
  list(@TenantId() mentorId: string) {
    return this.tests.listTemplates(mentorId);
  }

  @Auth('mentor', 'super_admin')
  @Post('templates')
  create(@TenantId() mentorId: string, @Body() dto: any) {
    return this.tests.createTemplate(mentorId, dto);
  }

  @Auth('mentor', 'super_admin', 'prospect', 'mentorado')
  @Get('templates/:id')
  get(@TenantId() mentorId: string, @Param('id') id: string) {
    return this.tests.getTemplate(mentorId, id);
  }

  @Auth('mentor', 'super_admin')
  @Patch('templates/:id')
  update(@TenantId() mentorId: string, @Param('id') id: string, @Body() dto: any) {
    return this.tests.updateTemplate(mentorId, id, dto);
  }

  @Auth('mentor', 'super_admin')
  @Delete('templates/:id')
  delete(@TenantId() mentorId: string, @Param('id') id: string) {
    return this.tests.deleteTemplate(mentorId, id);
  }

  @Auth('mentor', 'super_admin', 'prospect', 'mentorado')
  @Post('templates/:id/responses')
  submit(@TenantId() mentorId: string, @Param('id') templateId: string, @Body() body: { leadId: string; answers: any[] }) {
    return this.tests.submitResponse({ mentorId, templateId, leadId: body.leadId, answers: body.answers });
  }

  @Auth('mentor', 'super_admin')
  @Get('responses')
  responses(@TenantId() mentorId: string, @Query('leadId') leadId?: string) {
    return this.tests.listResponses(mentorId, leadId);
  }

  @Auth('prospect', 'mentorado')
  @Get('responses/me')
  myResponses(@CurrentUser() user: any) {
    return this.tests.listResponsesForUser(user.sub);
  }

  @Auth('mentor', 'super_admin', 'prospect', 'mentorado')
  @Get('responses/:id')
  response(@TenantId() mentorId: string, @Param('id') id: string) {
    return this.tests.getResponse(mentorId, id);
  }
}
