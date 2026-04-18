import { Body, Controller, Delete, Get, Param, Patch, Post, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';
import { Meeting } from '../../entities/meeting.entity';
import { MeetingParticipant } from '../../entities/meeting-participant.entity';

@ApiTags('meeting-participants')
@ApiBearerAuth()
@Controller('meetings')
export class MeetingParticipantsController {
  constructor(
    @InjectRepository(Meeting) private meetings: Repository<Meeting>,
    @InjectRepository(MeetingParticipant) private participants: Repository<MeetingParticipant>,
  ) {}

  @Auth('mentor', 'super_admin', 'mentorado', 'prospect')
  @Get(':id/participants')
  list(@TenantId() mentorId: string, @Param('id') meetingId: string) {
    return this.participants.find({ where: { meetingId }, order: { createdAt: 'ASC' } });
  }

  @Auth('mentor', 'super_admin')
  @Post(':id/participants')
  async add(@TenantId() mentorId: string, @Param('id') meetingId: string, @Body() dto: any) {
    const m = await this.meetings.findOne({ where: { id: meetingId, mentorId } });
    if (!m) throw new BadRequestException('Reunião não encontrada');
    return this.participants.save(this.participants.create({ ...dto, meetingId }));
  }

  @Auth('mentor', 'super_admin')
  @Patch(':id/participants/:pid')
  async update(@TenantId() mentorId: string, @Param('pid') pid: string, @Body() dto: any) {
    await this.participants.update({ id: pid } as any, dto);
    return this.participants.findOne({ where: { id: pid } });
  }

  @Auth('mentor', 'super_admin')
  @Delete(':id/participants/:pid')
  async remove(@Param('pid') pid: string) {
    await this.participants.delete({ id: pid } as any);
    return { ok: true };
  }
}
