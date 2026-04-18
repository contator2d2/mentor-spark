import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auth } from '../auth/auth.decorators';
import { TenantId, CurrentUser } from '../auth/current-user.decorator';
import { MessagesService } from './messages.service';
import { Message, MessageChannel } from '../../entities/message.entity';
import { MessageTemplate } from '../../entities/message-template.entity';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('messages')
@ApiBearerAuth()
@Controller('messages')
export class MessagesController {
  constructor(
    private svc: MessagesService,
    @InjectRepository(Message) private repo: Repository<Message>,
    @InjectRepository(MessageTemplate) private templates: Repository<MessageTemplate>,
  ) {}

  // ============ ENVIO ============
  @Auth('mentor', 'super_admin', 'mentor_team')
  @Post()
  async send(
    @TenantId() mentorId: string,
    @CurrentUser() u: any,
    @Body() dto: {
      leadId?: string;
      channel: MessageChannel;
      subject?: string;
      body: string;
      templateId?: string;
      scheduledAt?: string;
    },
  ) {
    if (!dto.body || !dto.channel) throw new BadRequestException('channel e body obrigatórios');
    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    return this.svc.send({
      mentorId,
      senderId: u.sub,
      leadId: dto.leadId,
      channel: dto.channel,
      subject: dto.subject,
      body: dto.body,
      templateId: dto.templateId,
      scheduledAt,
    });
  }

  @Auth('mentor', 'super_admin', 'mentor_team')
  @Get()
  list(@TenantId() mentorId: string, @Query('leadId') leadId?: string, @Query('channel') channel?: MessageChannel) {
    if (leadId) return this.svc.listForLead(mentorId, leadId);
    return this.svc.listAll(mentorId, { channel });
  }

  @Auth('mentor', 'super_admin')
  @Delete(':id')
  async delete(@TenantId() mentorId: string, @Param('id') id: string) {
    await this.repo.delete({ id, mentorId } as any);
    return { ok: true };
  }

  @Auth('mentor', 'super_admin')
  @Post(':id/retry')
  async retry(@TenantId() mentorId: string, @Param('id') id: string) {
    const m = await this.repo.findOne({ where: { id, mentorId } });
    if (!m) throw new BadRequestException('Mensagem não encontrada');
    await this.repo.update(id, { status: 'queued' as any, errorMessage: null });
    this.svc.dispatch(id).catch(() => null);
    return { ok: true };
  }

  // ============ TEMPLATES ============
  @Auth('mentor', 'super_admin', 'mentor_team')
  @Get('templates/all')
  listTemplates(@TenantId() mentorId: string, @Query('channel') channel?: MessageChannel) {
    const where: any = { mentorId };
    if (channel) where.channel = channel;
    return this.templates.find({ where, order: { name: 'ASC' } });
  }

  @Auth('mentor', 'super_admin')
  @Post('templates')
  async createTemplate(@TenantId() mentorId: string, @Body() dto: any) {
    if (!dto.name || !dto.channel || !dto.body) throw new BadRequestException('name, channel e body obrigatórios');
    return this.templates.save(this.templates.create({ ...dto, mentorId }));
  }

  @Auth('mentor', 'super_admin')
  @Patch('templates/:id')
  async updateTemplate(@TenantId() mentorId: string, @Param('id') id: string, @Body() dto: any) {
    await this.templates.update({ id, mentorId } as any, dto);
    return this.templates.findOne({ where: { id, mentorId } });
  }

  @Auth('mentor', 'super_admin')
  @Delete('templates/:id')
  async deleteTemplate(@TenantId() mentorId: string, @Param('id') id: string) {
    await this.templates.delete({ id, mentorId } as any);
    return { ok: true };
  }
}
