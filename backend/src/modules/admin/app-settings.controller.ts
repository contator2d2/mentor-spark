import { Body, Controller, Get, Post } from '@nestjs/common';
import { Auth } from '../auth/auth.decorators';
import { AppSettingsService } from './app-settings.service';

const GOOGLE_KEYS = ['google.clientId', 'google.clientSecret', 'google.redirectUri'] as const;

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
    if (body.clientId !== undefined) await this.settings.set('google.clientId', body.clientId || null, 'Google OAuth Client ID (Calendar)');
    // Só atualiza secret se vier preenchido (vazio = manter atual)
    if (body.clientSecret) await this.settings.set('google.clientSecret', body.clientSecret, 'Google OAuth Client Secret');
    if (body.redirectUri !== undefined) await this.settings.set('google.redirectUri', body.redirectUri || null, 'OAuth Redirect URI');
    return { ok: true };
  }
}
