import { Body, Controller, Get, Post } from '@nestjs/common';
import { Auth } from '../auth/auth.decorators';
import { AppSettingsService } from './app-settings.service';

@Controller('admin/app-settings')
export class AppSettingsController {
  constructor(private settings: AppSettingsService) {}

  /** Status das credenciais globais — não retorna valores secretos */
  @Auth('super_admin')
  @Get('google')
  async getGoogle() {
    const [clientId, clientSecret, redirectUri] = await Promise.all([
      this.settings.get('google.clientId'),
      this.settings.get('google.clientSecret'),
      this.settings.get('google.redirectUri'),
    ]);
    return {
      configured: !!(clientId && clientSecret),
      clientId: clientId || '',
      clientIdMasked: clientId ? `${clientId.slice(0, 12)}…${clientId.slice(-12)}` : null,
      hasSecret: !!clientSecret,
      redirectUri: redirectUri || '',
    };
  }

  @Auth('super_admin')
  @Post('google')
  async saveGoogle(@Body() body: { clientId?: string; clientSecret?: string; redirectUri?: string }) {
    const normalizedClientId = body.clientId?.trim();
    const normalizedClientSecret = body.clientSecret?.trim();
    const normalizedRedirectUri = body.redirectUri?.trim().replace(/\/$/, '');
    if (normalizedClientId !== undefined) await this.settings.set('google.clientId', normalizedClientId || null, 'Google OAuth Client ID (Calendar)');
    if (normalizedClientSecret) await this.settings.set('google.clientSecret', normalizedClientSecret, 'Google OAuth Client Secret');
    if (normalizedRedirectUri !== undefined) await this.settings.set('google.redirectUri', normalizedRedirectUri || null, 'OAuth Redirect URI');
    return { ok: true };
  }

  // ====== uazapi (WhatsApp) ======
  @Auth('super_admin')
  @Get('uazapi')
  async getUazapi() {
    const [adminUrl, adminToken] = await Promise.all([
      this.settings.get('uazapi.adminUrl'),
      this.settings.get('uazapi.adminToken'),
    ]);
    return {
      configured: !!(adminUrl && adminToken),
      adminUrl: adminUrl || '',
      hasToken: !!adminToken,
    };
  }

  @Auth('super_admin')
  @Post('uazapi')
  async saveUazapi(@Body() body: { adminUrl?: string; adminToken?: string }) {
    if (body.adminUrl !== undefined) await this.settings.set('uazapi.adminUrl', body.adminUrl || null, 'uazapi base URL');
    if (body.adminToken) await this.settings.set('uazapi.adminToken', body.adminToken, 'uazapi admin token');
    return { ok: true };
  }
}
