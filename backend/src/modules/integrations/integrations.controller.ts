import { Body, Controller, Get, Post, Query, Res, Delete } from '@nestjs/common';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsOptional, IsString } from 'class-validator';
import { MentorIntegration, IntegrationType } from '../../entities/mentor-integration.entity';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';
import { WhatsappService } from './whatsapp.service';
import { GoogleCalendarService } from './google-calendar.service';
import { PlansService } from '../plans/plans.service';

class UpsertWhatsappDto {
  @IsOptional() @IsString() baseUrl?: string;
  @IsOptional() @IsString() token?: string;
  @IsOptional() @IsString() instanceName?: string;
}

@Controller('integrations')
export class IntegrationsController {
  constructor(
    @InjectRepository(MentorIntegration) private repo: Repository<MentorIntegration>,
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
  async googleConnect(@TenantId() mentorId: string) {
    const url = await this.gcal.getAuthUrl(mentorId);
    return { url };
  }

  /** Callback público (Google bate aqui sem JWT) */
  @Get('google/callback')
  async googleCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    const frontend = process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
    try {
      await this.gcal.handleCallback(code, state);
      return res.redirect(`${frontend}/app/integrations?google=ok`);
    } catch (e: any) {
      return res.redirect(`${frontend}/app/integrations?google=error&msg=${encodeURIComponent(e.message)}`);
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
    // não retorna token
    return items.map((i) => ({ ...i, token: undefined }));
  }

  @Auth('mentor', 'super_admin')
  @Get('whatsapp')
  async getWhatsapp(@TenantId() mentorId: string) {
    const integ = await this.repo.findOne({ where: { mentorId, type: IntegrationType.WHATSAPP } });
    const allowed = await this.plans.hasFeature(mentorId, 'allowWhatsapp');
    return {
      allowed,
      configured: !!integ?.baseUrl,
      provider: integ?.provider || 'uazapi',
      baseUrl: integ?.baseUrl || null,
      instanceName: integ?.instanceName || null,
      status: integ?.status || 'disconnected',
      phoneNumber: integ?.phoneNumber || null,
      connectedAt: integ?.connectedAt || null,
    };
  }

  @Auth('mentor', 'super_admin')
  @Post('whatsapp')
  async saveWhatsapp(@TenantId() mentorId: string, @Body() dto: UpsertWhatsappDto) {
    const allowed = await this.plans.hasFeature(mentorId, 'allowWhatsapp');
    if (!allowed) {
      return { ok: false, error: 'Seu plano atual não inclui WhatsApp. Faça upgrade.' };
    }
    await this.whatsapp.upsertConfig(mentorId, dto);
    return { ok: true };
  }

  @Auth('mentor', 'super_admin')
  @Get('whatsapp/status')
  status(@TenantId() mentorId: string) {
    return this.whatsapp.getStatus(mentorId);
  }

  @Auth('mentor', 'super_admin')
  @Post('whatsapp/connect')
  connect(@TenantId() mentorId: string) {
    return this.whatsapp.getQrCode(mentorId);
  }

  @Auth('mentor', 'super_admin')
  @Post('whatsapp/test')
  test(@TenantId() mentorId: string, @Body() body: { to: string; message?: string }) {
    return this.whatsapp.sendText(mentorId, body.to, body.message || '✅ Teste do MentorFlow — sua integração WhatsApp está funcionando!');
  }
}
