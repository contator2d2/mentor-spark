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

  private async getCreds(dynamicRedirectUri?: string) {
    const [clientId, clientSecret, savedRedirectUri] = await Promise.all([
      this.settings.get('google.clientId'),
      this.settings.get('google.clientSecret'),
      this.settings.get('google.redirectUri'),
    ]);
    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        'Google OAuth não configurado. Super admin deve configurar em Admin → Credenciais Google.',
      );
    }

    // Prioridade para o redirectUri:
    // 1. O que veio na request (dinâmico)
    // 2. O que está salvo no banco (admin credentials)
    // 3. O que está no env (PUBLIC_API_URL)
    // 4. Localhost fallback
    
    let finalRedirect = dynamicRedirectUri;

    if (!finalRedirect) {
      const normalizedSavedRedirect = savedRedirectUri?.trim().replace(/\/$/, '') || '';
      const apiBase = (process.env.PUBLIC_API_URL || '').trim().replace(/\/$/, '');
      
      finalRedirect =
        normalizedSavedRedirect ||
        (apiBase
          ? `${apiBase}/api/integrations/google/callback`
          : 'http://localhost:3001/api/integrations/google/callback');
          
      if (!normalizedSavedRedirect && !dynamicRedirectUri) {
        this.logger.warn(
          `google.redirectUri não configurado em app_settings — usando fallback: ${finalRedirect}`,
        );
      }
    }

    return { clientId, clientSecret, redirectUri: finalRedirect };
  }

  async getAuthUrl(mentorId: string, customRedirectUri?: string, frontendUrl?: string): Promise<string> {
    const { clientId, redirectUri } = await this.getCreds(customRedirectUri);
    
    // Codifica o estado para recuperar o mentorId, o redirectUri usado e o frontendUrl original
    const stateObj = {
      mentorId,
      redirectUri,
      frontendUrl: frontendUrl || '',
    };
    const state = Buffer.from(JSON.stringify(stateObj)).toString('base64');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      scope: SCOPES.join(' '),
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleCallback(code: string, state: string) {
    let stateData: { mentorId: string; redirectUri: string; frontendUrl?: string };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    } catch (e) {
      // Fallback para quando o state era apenas o mentorId (legado)
      stateData = { mentorId: state, redirectUri: '', frontendUrl: '' };
    }

    const { mentorId, redirectUri, frontendUrl } = stateData;
    const { clientId, clientSecret, redirectUri: finalRedirect } = await this.getCreds(redirectUri);

    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: finalRedirect,
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
    await this.users.update(mentorId, { googleTokens: tokens } as any);
    
    return { mentorId, frontendUrl };
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
    evt: {
      summary: string;
      description?: string;
      startsAt?: Date;
      endsAt?: Date;
      attendeeEmail?: string;
      // legado:
      startISO?: string;
      durationMinutes?: number;
    },
  ): Promise<any | null> {
    const u = await this.users
      .createQueryBuilder('u')
      .addSelect('u.googleTokens')
      .where('u.id = :id', { id: mentorId })
      .getOne();
    if (!u?.googleTokens?.access_token) return null;
    const accessToken = await this.refreshIfNeeded(u);
    if (!accessToken) return null;

    const start = evt.startsAt || (evt.startISO ? new Date(evt.startISO) : new Date());
    const end = evt.endsAt || new Date(start.getTime() + (evt.durationMinutes || 30) * 60_000);

    const body: any = {
      summary: evt.summary,
      description: evt.description,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
      conferenceData: {
        createRequest: {
          requestId: `bk-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    };
    if (evt.attendeeEmail) body.attendees = [{ email: evt.attendeeEmail }];

    const r = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    if (!r.ok) {
      this.logger.warn(`Google Calendar createEvent ${r.status}: ${(await r.text()).slice(0, 200)}`);
      return null;
    }
    return r.json();
  }

  async deleteEvent(mentorId: string, eventId: string): Promise<boolean> {
    const u = await this.users
      .createQueryBuilder('u')
      .addSelect('u.googleTokens')
      .where('u.id = :id', { id: mentorId })
      .getOne();
    if (!u?.googleTokens?.access_token) return false;
    const accessToken = await this.refreshIfNeeded(u);
    if (!accessToken) return false;
    const r = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?sendUpdates=all`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return r.ok;
  }
}
