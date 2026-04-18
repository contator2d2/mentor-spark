import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';
import { EventsService } from './events.service';
import { RegistrationStatus } from '../../entities/event-registration.entity';

class UpsertEventDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() virtualUrl?: string;
  @IsOptional() @IsString() modality?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() startsAt?: string;
  @IsOptional() @IsString() endsAt?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsInt() capacity?: number;
  @IsOptional() @IsBoolean() npsEnabled?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(168) npsDelayHours?: number;
  @IsOptional() @IsString() npsQuestion?: string;
  @IsOptional() @IsString() defaultTestTemplateId?: string;
  @IsOptional() @IsString() coverImageUrl?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

class BroadcastDto {
  @IsString() subject: string;
  @IsString() message: string;
  @IsArray() channels: string[];
  @IsOptional() @IsArray() onlyStatus?: RegistrationStatus[];
}

class SendTestDto {
  @IsString() testTemplateId: string;
  @IsOptional() @IsBoolean() onlyCheckedIn?: boolean;
}

class SendMeetingDto {
  @IsOptional() @IsBoolean() onlyCheckedIn?: boolean;
  @IsOptional() @IsString() bookingUrl?: string;
}

@Controller('events')
export class EventsController {
  constructor(private svc: EventsService) {}

  @Auth('mentor', 'super_admin')
  @Get()
  list(@TenantId() mentorId: string) {
    return this.svc.list(mentorId);
  }

  @Auth('mentor', 'super_admin')
  @Post()
  create(@TenantId() mentorId: string, @Body() dto: UpsertEventDto) {
    return this.svc.create(mentorId, dto);
  }

  @Auth('mentor', 'super_admin')
  @Get(':id')
  get(@TenantId() mentorId: string, @Param('id') id: string) {
    return this.svc.get(mentorId, id);
  }

  @Auth('mentor', 'super_admin')
  @Patch(':id')
  update(@TenantId() mentorId: string, @Param('id') id: string, @Body() dto: UpsertEventDto) {
    return this.svc.update(mentorId, id, dto);
  }

  @Auth('mentor', 'super_admin')
  @Delete(':id')
  remove(@TenantId() mentorId: string, @Param('id') id: string) {
    return this.svc.remove(mentorId, id);
  }

  // -------- Inscrições --------
  @Auth('mentor', 'super_admin')
  @Get(':id/registrations')
  listRegs(@TenantId() mentorId: string, @Param('id') id: string) {
    return this.svc.listRegistrations(mentorId, id);
  }

  @Auth('mentor', 'super_admin')
  @Patch(':id/registrations/:regId/status')
  setStatus(@TenantId() mentorId: string, @Param('id') id: string, @Param('regId') regId: string, @Body() body: { status: RegistrationStatus }) {
    return this.svc.setRegistrationStatus(mentorId, id, regId, body.status);
  }

  @Auth('mentor', 'super_admin')
  @Delete(':id/registrations/:regId')
  removeReg(@TenantId() mentorId: string, @Param('id') id: string, @Param('regId') regId: string) {
    return this.svc.deleteRegistration(mentorId, id, regId);
  }

  @Auth('mentor', 'super_admin')
  @Post(':id/registrations/:regId/convert')
  convert(@TenantId() mentorId: string, @Param('id') id: string, @Param('regId') regId: string) {
    return this.svc.convertToLead(mentorId, id, regId);
  }

  // -------- Check-in (mentor escaneia) --------
  @Auth('mentor', 'super_admin')
  @Post('checkin/:ticketCode')
  checkIn(@TenantId() mentorId: string, @Param('ticketCode') ticketCode: string) {
    return this.svc.checkIn(mentorId, ticketCode);
  }

  // -------- Broadcasts --------
  @Auth('mentor', 'super_admin')
  @Post(':id/broadcast')
  broadcast(@TenantId() mentorId: string, @Param('id') id: string, @Body() dto: BroadcastDto) {
    return this.svc.broadcast(mentorId, id, dto);
  }

  // -------- Pós-evento --------
  @Auth('mentor', 'super_admin')
  @Post(':id/nps/send')
  sendNps(@TenantId() mentorId: string, @Param('id') id: string) {
    return this.svc.sendNpsManual(mentorId, id);
  }

  @Auth('mentor', 'super_admin')
  @Get(':id/nps/summary')
  npsSummary(@TenantId() mentorId: string, @Param('id') id: string) {
    return this.svc.npsSummary(mentorId, id);
  }

  @Auth('mentor', 'super_admin')
  @Post(':id/send-test')
  sendTest(@TenantId() mentorId: string, @Param('id') id: string, @Body() dto: SendTestDto) {
    return this.svc.sendTestToAll(mentorId, id, dto.testTemplateId, { onlyCheckedIn: dto.onlyCheckedIn });
  }

  @Auth('mentor', 'super_admin')
  @Post(':id/send-meeting')
  sendMeeting(@TenantId() mentorId: string, @Param('id') id: string, @Body() dto: SendMeetingDto) {
    return this.svc.sendMeetingLinkToAll(mentorId, id, dto);
  }

  @Auth('mentor', 'super_admin')
  @Post(':id/send-company-analysis')
  sendAnalysis(@TenantId() mentorId: string, @Param('id') id: string) {
    return this.svc.sendCompanyAnalysisToAll(mentorId, id);
  }

  @Auth('mentor', 'super_admin')
  @Get(':id/actions')
  actions(@TenantId() mentorId: string, @Param('id') id: string) {
    return this.svc.listActions(mentorId, id);
  }
}
