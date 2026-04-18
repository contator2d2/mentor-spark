import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Auth } from '../auth/auth.decorators';
import { TenantId, CurrentUser } from '../auth/current-user.decorator';
import { MessagesService } from './messages.service';
import { Message, MessageChannel, MessageAttachment } from '../../entities/message.entity';
import { MessageTemplate, MessageTemplateCategory } from '../../entities/message-template.entity';
import { MessageBroadcast, BroadcastSequenceStep } from '../../entities/message-broadcast.entity';
import { Lead } from '../../entities/lead.entity';
import { WhatsappService } from '../integrations/whatsapp.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('messages')
@ApiBearerAuth()
@Controller('messages')
export class MessagesController {
  constructor(
    private svc: MessagesService,
    private whatsapp: WhatsappService,
    @InjectRepository(Message) private repo: Repository<Message>,
    @InjectRepository(MessageTemplate) private templates: Repository<MessageTemplate>,
    @InjectRepository(MessageBroadcast) private broadcasts: Repository<MessageBroadcast>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
  ) {}

  // ============ ENVIO INDIVIDUAL ============
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
      attachments?: MessageAttachment[];
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
      attachments: dto.attachments,
    });
  }

  // ============ TESTE RÁPIDO ============
  @Auth('mentor', 'super_admin', 'mentor_team')
  @Post('test')
  async test(
    @TenantId() mentorId: string,
    @Body() dto: { channel: MessageChannel; to: string; body: string; subject?: string; attachments?: MessageAttachment[] },
  ) {
    if (!dto.to || !dto.body || !dto.channel) throw new BadRequestException('to, channel e body obrigatórios');
    return this.svc.sendTest(mentorId, dto.channel, dto.to, dto.body, dto.subject, dto.attachments);
  }

  // ============ SEQUÊNCIA (1 lead, várias mensagens com delay) ============
  @Auth('mentor', 'super_admin', 'mentor_team')
  @Post('sequence')
  async sequence(
    @TenantId() mentorId: string,
    @CurrentUser() u: any,
    @Body() dto: {
      leadId: string;
      channel: MessageChannel;
      steps: BroadcastSequenceStep[];
      startAt?: string;
    },
  ) {
    if (!dto.leadId || !dto.steps?.length) throw new BadRequestException('leadId e steps obrigatórios');
    return this.svc.sendSequence({
      mentorId,
      senderId: u.sub,
      leadId: dto.leadId,
      channel: dto.channel,
      steps: dto.steps,
      startAt: dto.startAt ? new Date(dto.startAt) : undefined,
    });
  }

  // ============ VALIDAR NÚMERO WHATSAPP ============
  @Auth('mentor', 'super_admin', 'mentor_team')
  @Post('whatsapp/check')
  async checkWa(@TenantId() mentorId: string, @Body() dto: { phone: string }) {
    if (!dto.phone) throw new BadRequestException('phone obrigatório');
    return this.whatsapp.checkNumber(mentorId, dto.phone);
  }

  /** Valida em lote (lista de leadIds) — útil antes de broadcast */
  @Auth('mentor', 'super_admin', 'mentor_team')
  @Post('whatsapp/check-batch')
  async checkBatch(@TenantId() mentorId: string, @Body() dto: { leadIds: string[] }) {
    if (!dto.leadIds?.length) throw new BadRequestException('leadIds obrigatório');
    const leads = await this.leads.find({ where: { mentorId } });
    const map = new Map(leads.map((l) => [l.id, l]));
    const results: Array<{ leadId: string; phone?: string; isWhatsapp?: boolean; error?: string }> = [];
    for (const id of dto.leadIds) {
      const lead = map.get(id);
      if (!lead?.phone) {
        results.push({ leadId: id, error: 'Sem telefone' });
        continue;
      }
      const r = await this.whatsapp.checkNumber(mentorId, lead.phone);
      results.push({ leadId: id, phone: lead.phone, isWhatsapp: r.isWhatsapp, error: r.error });
      // pequeno delay para não estourar rate-limit do uazapi
      await new Promise((res) => setTimeout(res, 350));
    }
    return { results };
  }

  // ============ HISTÓRICO ============
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

  // ============ TEMPLATES (mentor + biblioteca) ============
  @Auth('mentor', 'super_admin', 'mentor_team')
  @Get('templates/all')
  async listTemplates(@TenantId() mentorId: string, @Query('channel') channel?: MessageChannel, @Query('category') category?: MessageTemplateCategory) {
    const qb = this.templates.createQueryBuilder('t')
      .where('(t.mentorId = :mentorId OR t.mentorId IS NULL)', { mentorId })
      .orderBy('t.isLibrary', 'DESC')
      .addOrderBy('t.name', 'ASC');
    if (channel) qb.andWhere('t.channel = :channel', { channel });
    if (category) qb.andWhere('t.category = :category', { category });
    return qb.getMany();
  }

  @Auth('mentor', 'super_admin')
  @Post('templates')
  async createTemplate(@TenantId() mentorId: string, @Body() dto: any) {
    if (!dto.name || !dto.channel || !dto.body) throw new BadRequestException('name, channel e body obrigatórios');
    return this.templates.save(this.templates.create({ ...dto, mentorId, isLibrary: false }));
  }

  /** Clona um template da biblioteca para o acervo do mentor */
  @Auth('mentor', 'super_admin', 'mentor_team')
  @Post('templates/:id/clone')
  async cloneTemplate(@TenantId() mentorId: string, @Param('id') id: string) {
    const t = await this.templates.findOne({ where: { id } });
    if (!t) throw new BadRequestException('Template não encontrado');
    const copy = this.templates.create({
      mentorId,
      name: t.name,
      channel: t.channel,
      category: t.category,
      subject: t.subject,
      body: t.body,
      attachments: t.attachments,
      description: t.description,
      enabled: true,
      isLibrary: false,
    });
    return this.templates.save(copy);
  }

  @Auth('mentor', 'super_admin')
  @Patch('templates/:id')
  async updateTemplate(@TenantId() mentorId: string, @Param('id') id: string, @Body() dto: any) {
    const existing = await this.templates.findOne({ where: { id } });
    if (!existing) throw new BadRequestException('Template não encontrado');
    if (existing.isLibrary || !existing.mentorId) throw new BadRequestException('Templates da biblioteca não podem ser editados — clone primeiro.');
    if (existing.mentorId !== mentorId) throw new BadRequestException('Sem permissão');
    await this.templates.update(id, dto);
    return this.templates.findOne({ where: { id } });
  }

  @Auth('mentor', 'super_admin')
  @Delete('templates/:id')
  async deleteTemplate(@TenantId() mentorId: string, @Param('id') id: string) {
    const t = await this.templates.findOne({ where: { id } });
    if (!t) return { ok: true };
    if (t.isLibrary || !t.mentorId) throw new BadRequestException('Templates da biblioteca não podem ser excluídos');
    if (t.mentorId !== mentorId) throw new BadRequestException('Sem permissão');
    await this.templates.delete(id);
    return { ok: true };
  }

  // ============ BROADCAST (envio em massa) ============
  @Auth('mentor', 'super_admin', 'mentor_team')
  @Post('broadcasts')
  async createBroadcast(
    @TenantId() mentorId: string,
    @CurrentUser() u: any,
    @Body() dto: {
      name: string;
      channel: MessageChannel;
      sequence: BroadcastSequenceStep[];
      leadIds: string[];
      perRecipientDelaySeconds?: number;
      jitter?: number;
      scheduledAt?: string;
    },
  ) {
    return this.svc.createBroadcast({
      mentorId,
      createdBy: u.sub,
      name: dto.name,
      channel: dto.channel,
      sequence: dto.sequence,
      leadIds: dto.leadIds,
      perRecipientDelaySeconds: dto.perRecipientDelaySeconds,
      jitter: dto.jitter,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
    });
  }

  @Auth('mentor', 'super_admin', 'mentor_team')
  @Get('broadcasts')
  listBroadcasts(@TenantId() mentorId: string) {
    return this.svc.listBroadcasts(mentorId);
  }

  @Auth('mentor', 'super_admin', 'mentor_team')
  @Get('broadcasts/:id')
  reportBroadcast(@TenantId() mentorId: string, @Param('id') id: string) {
    return this.svc.broadcastReport(mentorId, id);
  }

  @Auth('mentor', 'super_admin')
  @Post('broadcasts/:id/cancel')
  cancelBroadcast(@TenantId() mentorId: string, @Param('id') id: string) {
    return this.svc.cancelBroadcast(mentorId, id);
  }
}
