import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { CurrentUser } from '../auth/current-user.decorator';
import { TrailAccessService } from './trail-access.service';
import { userId, mentorIdOf } from '../auth/user-id.util';
import { TrailAccessRequestStatus } from '../../entities/trail-access-request.entity';

@Controller('trail-access')
@UseGuards(JwtAuthGuard)
export class TrailAccessController {
  constructor(private svc: TrailAccessService) {}

  // ===== Mentor =====
  @Get('trails/:trailId/grants')
  list(@CurrentUser() u: any, @Param('trailId') trailId: string) {
    return this.svc.listAccessesForTrail(userId(u), trailId);
  }

  @Post('trails/:trailId/grants')
  grant(@CurrentUser() u: any, @Param('trailId') trailId: string, @Body() body: { leadId: string; expiresAt?: string }) {
    return this.svc.grantManual(userId(u), trailId, body.leadId, body.expiresAt ? new Date(body.expiresAt) : undefined);
  }

  @Delete('trails/:trailId/grants/:leadId')
  revoke(@CurrentUser() u: any, @Param('trailId') trailId: string, @Param('leadId') leadId: string) {
    return this.svc.revokeManual(userId(u), trailId, leadId);
  }

  @Get('requests')
  requests(@CurrentUser() u: any, @Query('status') status?: TrailAccessRequestStatus) {
    return this.svc.listRequests(userId(u), status);
  }

  @Post('requests/:id/approve')
  approve(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.resolveRequest(userId(u), id, 'approve');
  }

  @Post('requests/:id/deny')
  deny(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.resolveRequest(userId(u), id, 'deny');
  }

  // ===== Mentorado =====
  @Post('trails/:trailId/request')
  request(@CurrentUser() u: any, @Param('trailId') trailId: string, @Body() body: { message?: string }) {
    return this.svc.requestAccess(userId(u), trailId, body?.message);
  }
}