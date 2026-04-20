import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { CurrentUser } from '../auth/current-user.decorator';
import { AccessGroupsService } from './access-groups.service';
import { userId } from '../auth/user-id.util';

@Controller('access-groups')
@UseGuards(JwtAuthGuard)
export class AccessGroupsController {
  constructor(private svc: AccessGroupsService) {}

  @Get()
  list(@CurrentUser() u: any) { return this.svc.list(userId(u)); }

  @Get(':id')
  one(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.getOne(userId(u), id); }

  @Post()
  create(@CurrentUser() u: any, @Body() body: any) { return this.svc.create(userId(u), body); }

  @Patch(':id')
  update(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.update(userId(u), id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.remove(userId(u), id); }

  @Post(':id/members')
  addMembers(@CurrentUser() u: any, @Param('id') id: string, @Body() body: { leadIds: string[] }) {
    return this.svc.addMembers(userId(u), id, body.leadIds || []);
  }

  @Delete(':id/members/:leadId')
  removeMember(@CurrentUser() u: any, @Param('id') id: string, @Param('leadId') leadId: string) {
    return this.svc.removeMember(userId(u), id, leadId);
  }

  @Post(':id/import-event/:eventId')
  importEvent(@CurrentUser() u: any, @Param('id') id: string, @Param('eventId') eventId: string) {
    return this.svc.importFromEvent(userId(u), id, eventId);
  }
}