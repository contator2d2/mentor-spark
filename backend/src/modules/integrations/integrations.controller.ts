import { Body, Controller, Get, Post, Query, Res, Delete, Param } from '@nestjs/common';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MentorIntegration, IntegrationType } from '../../entities/mentor-integration.entity';
import { User } from '../../entities/user.entity';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';
import { WhatsappService } from './whatsapp.service';
import { GoogleCalendarService } from './google-calendar.service';
import { PlansService } from '../plans/plans.service';

@Controller('integrations')
export class IntegrationsController {
  constructor(
    @InjectRepository(MentorIntegration) private repo: Repository<MentorIntegration>,
    @InjectRepository(User) private users: Repository<User>,
    private whatsapp: WhatsappService,
    private gcal: GoogleCalendarService,
    private plans: PlansService,
  ) {}

  // ===== Google Calendar =====
  @Auth('mentor', 'super_admin')
  @Get('google/status')
  googleStatus(@TenantId() mentorId: string) {
    return this.gcal.getStatus(mentorId);
  }

  @Auth('mentor', 'super_admin')
  @Post('google/connect')
  async googleConnect(
    @TenantId() mentorId: string,
    @Body() body: { redirectUri?: string; frontendUrl?: string },
  ) {
    const url = await this.gcal.getAuthUrl(mentorId, body.redirectUri, body.frontendUrl);
    return { url };
  }

  /** Callback público (Google bate aqui sem JWT) */
  @Get('google/callback')
  async googleCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    const defaultFrontend = process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
    try {
      const { frontendUrl } = await this.gcal.handleCallback(code, state);
      const targetFrontend = frontendUrl || defaultFrontend;
      return res.redirect(`${targetFrontend}/app/integrations?google=ok`);
    } catch (e: any) {
      return res.redirect(`${defaultFrontend}/app/integrations?google=error&msg=${encodeURIComponent(e.message)}`);
    }
  }

  @Auth('mentor', 'super_admin')
  @Delete('google')
  async googleDisconnect(@TenantId() mentorId: string) {
    await this.gcal.disconnect(mentorId);
    return { ok: true };
  }

  @Auth('mentor', 'super_admin')
  @Get()
  async list(@TenantId() mentorId: string) {
    const items = await this.repo.find({ where: { mentorId } });
    return items.map((i) => ({ ...i, token: undefined }));
  }

  // ===== WhatsApp (uazapi) =====
  @Auth('mentor', 'super_admin')
  @Get('whatsapp')
  async getWhatsapp(@TenantId() mentorId: string) {
    const integ = await this.repo.findOne({ where: { mentorId, type: IntegrationType.WHATSAPP } });
    const allowed = await this.plans.hasFeature(mentorId, 'allowWhatsapp');
    const adminConfigured = await this.whatsapp.isAdminConfigured();
    return {
      allowed,
      adminConfigured,
      provisioned: !!integ?.instanceName,
      provider: integ?.provider || 'uazapi',
      instanceName: integ?.instanceName || null,
      status: integ?.status || 'disconnected',
      phoneNumber: integ?.phoneNumber || null,
      connectedAt: integ?.connectedAt || null,
    };
  }

  /** Cria a instância no uazapi (chama com admin token) */
  @Auth('mentor', 'super_admin')
  @Post('whatsapp/provision')
  async provision(@TenantId() mentorId: string) {
    const allowed = await this.plans.hasFeature(mentorId, 'allowWhatsapp');
    if (!allowed) return { ok: false, error: 'Seu plano atual não inclui WhatsApp.' };
    const user = await this.users.findOne({ where: { id: mentorId } });
    return this.whatsapp.provisionInstance(mentorId, user?.brandName || user?.name || 'MentorFlow');
  }

  /** Retorna o QR code da instância */
  @Auth('mentor', 'super_admin')
  @Get('whatsapp/qrcode')
  qrcode(@TenantId() mentorId: string) {
    return this.whatsapp.getQrCode(mentorId);
  }

  @Auth('mentor', 'super_admin')
  @Get('whatsapp/status')
  status(@TenantId() mentorId: string) {
    return this.whatsapp.getStatus(mentorId);
  }

  /** Desconecta e remove a instância */
  @Auth('mentor', 'super_admin')
  @Delete('whatsapp')
  disconnect(@TenantId() mentorId: string) {
    return this.whatsapp.disconnect(mentorId);
  }

  @Auth('mentor', 'super_admin')
  @Post('whatsapp/test')
  test(@TenantId() mentorId: string, @Body() body: { to: string; message?: string }) {
    return this.whatsapp.sendText(mentorId, body.to, body.message || '✅ Teste do MentorFlow — sua integração WhatsApp está funcionando!');
  }

  // ===== WhatsApp: Grupos & Canais =====
  @Auth('mentor', 'super_admin', 'mentor_team')
  @Get('whatsapp/groups')
  listGroups(@TenantId() mentorId: string) {
    return this.whatsapp.listGroups(mentorId);
  }

  @Auth('mentor', 'super_admin', 'mentor_team')
  @Post('whatsapp/groups')
  createGroup(@TenantId() mentorId: string, @Body() body: { name: string; participants: string[] }) {
    return this.whatsapp.createGroup(mentorId, body.name, body.participants || []);
  }

  @Auth('mentor', 'super_admin', 'mentor_team')
  @Post('whatsapp/channels')
  createChannel(@TenantId() mentorId: string, @Body() body: { name: string; description?: string }) {
    return this.whatsapp.createChannel(mentorId, body.name, body.description);
  }

  @Auth('mentor', 'super_admin', 'mentor_team')
  @Post('whatsapp/groups/:jid/participants')
  addMembers(@TenantId() mentorId: string, @Param('jid') jid: string, @Body() body: { participants: string[] }) {
    return this.whatsapp.addParticipants(mentorId, jid, body.participants || []);
  }

  @Auth('mentor', 'super_admin', 'mentor_team')
  @Delete('whatsapp/groups/:jid/participants')
  removeMembers(@TenantId() mentorId: string, @Param('jid') jid: string, @Body() body: { participants: string[] }) {
    return this.whatsapp.removeParticipants(mentorId, jid, body.participants || []);
  }

  @Auth('mentor', 'super_admin', 'mentor_team')
  @Post('whatsapp/groups/:jid/send')
  sendToGroup(@TenantId() mentorId: string, @Param('jid') jid: string, @Body() body: { message: string }) {
    return this.whatsapp.sendTextToGroup(mentorId, jid, body.message);
  }
}
