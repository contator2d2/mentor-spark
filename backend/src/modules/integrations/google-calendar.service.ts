import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { AppSettingsService } from '../admin/app-settings.service';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
];

/**
 * Google Calendar OAuth completo.
 * Credenciais (client_id/secret) ficam em app_settings (super_admin gerencia em /app/admin/integrations-credentials).
 * Tokens ficam em users.googleTokens (jsonb, select:false).
 */
@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private settings: AppSettingsService,
  ) {}

  private async getCreds() {
    const [clientId, clientSecret, redirectUri] = await Promise.all([
      this.settings.get('google.clientId'),
      this.settings.get('google.clientSecret'),
      this.settings.get('google.redirectUri'),
    ]);
    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        'Google OAuth não configurado. Super admin deve configurar em Admin → Credenciais Google.',
      );
    }
    const finalRedirect =
      redirectUri ||
      `${process.env.PUBLIC_API_URL || 'http://localhost:3000'}/integrations/google/callback`;
    return { clientId, clientSecret, redirectUri: finalRedirect };
  }

  async getAuthUrl(mentorId: string): Promise<string> {
    const { clientId, redirectUri } = await this.getCreds();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      scope: SCOPES.join(' '),
      state: mentorId, // simples; idealmente assinado
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleCallback(code: string, state: string) {
    const { clientId, clientSecret, redirectUri } = await this.getCreds();
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      throw new BadRequestException(`Falha ao trocar code por token: ${t.slice(0, 200)}`);
    }
    const data: any = await r.json();
    const tokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expiry_date: Date.now() + (data.expires_in || 3600) * 1000,
    };
    await this.users.update(state, { googleTokens: tokens } as any);
  }

  async disconnect(mentorId: string) {
    await this.users.update(mentorId, { googleTokens: null } as any);
  }

  async getStatus(mentorId: string) {
    const u = await this.users
      .createQueryBuilder('u')
      .addSelect('u.googleTokens')
      .where('u.id = :id', { id: mentorId })
      .getOne();
    const credsConfigured = !!(await this.settings.get('google.clientId'));
    return {
      credsConfigured,
      connected: !!u?.googleTokens?.access_token,
      hasRefreshToken: !!u?.googleTokens?.refresh_token,
    };
  }

  private async refreshIfNeeded(u: User): Promise<string | null> {
    const t = u.googleTokens;
    if (!t?.access_token) return null;
    if (t.expiry_date && t.expiry_date > Date.now() + 60_000) return t.access_token;
    if (!t.refresh_token) return t.access_token; // expirado mas sem refresh — tenta mesmo assim
    try {
      const { clientId, clientSecret } = await this.getCreds();
      const r = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: t.refresh_token,
          grant_type: 'refresh_token',
        }),
      });
      if (!r.ok) return t.access_token;
      const data: any = await r.json();
      const newTokens = {
        access_token: data.access_token,
        refresh_token: t.refresh_token,
        expiry_date: Date.now() + (data.expires_in || 3600) * 1000,
      };
      await this.users.update(u.id, { googleTokens: newTokens } as any);
      return newTokens.access_token;
    } catch (e: any) {
      this.logger.warn(`refresh falhou: ${e.message}`);
      return t.access_token;
    }
  }

  async createEvent(
    mentorId: string,
    evt: { summary: string; startISO: string; durationMinutes: number; description?: string },
  ): Promise<string | null> {
    const u = await this.users
      .createQueryBuilder('u')
      .addSelect('u.googleTokens')
      .where('u.id = :id', { id: mentorId })
      .getOne();
    if (!u?.googleTokens?.access_token) return null;
    const accessToken = await this.refreshIfNeeded(u);
    if (!accessToken) return null;

    const start = new Date(evt.startISO);
    const end = new Date(start.getTime() + evt.durationMinutes * 60_000);

    const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: evt.summary,
        description: evt.description,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
      }),
    });
    if (!r.ok) {
      this.logger.warn(`Google Calendar createEvent ${r.status}: ${(await r.text()).slice(0, 200)}`);
      return null;
    }
    const data: any = await r.json();
    return data.id || null;
  }
}
