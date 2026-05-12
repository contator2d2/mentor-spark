import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MentorIntegration, IntegrationProvider, IntegrationStatus, IntegrationType } from '../../entities/mentor-integration.entity';
import { AppSettingsService } from '../admin/app-settings.service';

interface UazapiCreds {
  baseUrl: string;
  token: string;
  instanceName?: string;
}

interface UazapiAdmin {
  baseUrl: string;
  adminToken: string;
}

export interface WhatsappAttachment {
  url: string;
  mimetype?: string;
  /** image | audio | video | document */
  kind?: string;
  caption?: string;
  fileName?: string;
}

/**
 * Serviço de WhatsApp via uazapi (https://docs.uazapi.com).
 * O super-admin configura URL + admin token globais. Cada mentor possui
 * uma instância criada/destruída automaticamente — não precisa lidar com tokens.
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    @InjectRepository(MentorIntegration) private repo: Repository<MentorIntegration>,
    private settings: AppSettingsService,
  ) {}

  /** Busca config admin: prioriza app_settings, fallback env. */
  private async getAdmin(): Promise<UazapiAdmin | null> {
    const dbUrl = await this.settings.get('uazapi.adminUrl');
    const dbToken = await this.settings.get('uazapi.adminToken');
    const baseUrl = dbUrl || process.env.UAZAPI_URL || null;
    const adminToken = dbToken || process.env.UAZAPI_TOKEN || null;
    if (!baseUrl || !adminToken) return null;
    return { baseUrl: baseUrl.replace(/\/$/, ''), adminToken };
  }

  async isAdminConfigured(): Promise<boolean> {
    return !!(await this.getAdmin());
  }

  async getCreds(mentorId: string): Promise<UazapiCreds | null> {
    const integ = await this.repo
      .createQueryBuilder('i')
      .addSelect('i.token')
      .where('i.mentorId = :mentorId AND i.type = :type', { mentorId, type: IntegrationType.WHATSAPP })
      .getOne();
    if (integ?.baseUrl && integ?.token) {
      return { baseUrl: integ.baseUrl, token: integ.token, instanceName: integ.instanceName };
    }
    return null;
  }

  /** Cria/atualiza configuração do mentor (uso interno) */
  async upsertConfig(mentorId: string, dto: { baseUrl?: string; token?: string; instanceName?: string; provider?: IntegrationProvider; status?: IntegrationStatus; phoneNumber?: string }) {
    let integ = await this.repo.findOne({ where: { mentorId, type: IntegrationType.WHATSAPP } });
    if (!integ) {
      integ = this.repo.create({
        mentorId,
        type: IntegrationType.WHATSAPP,
        provider: dto.provider || IntegrationProvider.UAZAPI,
        status: dto.status || IntegrationStatus.PENDING,
      });
    }
    if (dto.baseUrl !== undefined) integ.baseUrl = dto.baseUrl;
    if (dto.token !== undefined) integ.token = dto.token;
    if (dto.instanceName !== undefined) integ.instanceName = dto.instanceName;
    if (dto.provider) integ.provider = dto.provider;
    if (dto.status) integ.status = dto.status;
    if (dto.phoneNumber !== undefined) integ.phoneNumber = dto.phoneNumber;
    return this.repo.save(integ);
  }

  /**
   * Provisiona uma instância no uazapi para o mentor (chama /instance/init com admin token).
   * Salva token retornado e nome da instância na MentorIntegration.
   */
  async provisionInstance(mentorId: string, mentorLabel: string): Promise<{ ok: boolean; error?: string }> {
    const admin = await this.getAdmin();
    if (!admin) return { ok: false, error: 'WhatsApp ainda não foi configurado pelo administrador da plataforma.' };

    const existing = await this.getCreds(mentorId);
    
    // Se já existe uma instância com token, apenas retornamos OK
    // para evitar criar instâncias duplicadas no provedor
    if (existing?.token && existing?.instanceName) {
      return { ok: true };
    }

    // Se já temos um registro mas sem token, tentamos usar o mesmo instanceName
    // ou geramos um novo se for a primeira vez
    const integ = await this.repo.findOne({ where: { mentorId, type: IntegrationType.WHATSAPP } });
    const instanceName = integ?.instanceName || `mentor-${mentorId.slice(0, 8)}-${Date.now().toString(36)}`;
    
    try {
      const res = await fetch(`${admin.baseUrl}/instance/init`, {
        method: 'POST',
        headers: { adminToken: admin.adminToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: instanceName, systemName: mentorLabel || 'MentorFlow' }),
      });
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data?.message || data?.error || `HTTP ${res.status}` };
      }
      const instanceToken = data?.token || data?.instance?.token || data?.instanceToken;
      const finalName = data?.instance?.name || data?.name || instanceName;
      if (!instanceToken) {
        return { ok: false, error: 'Resposta do uazapi sem token da instância' };
      }
      await this.upsertConfig(mentorId, {
        baseUrl: admin.baseUrl,
        token: instanceToken,
        instanceName: finalName,
        provider: IntegrationProvider.UAZAPI,
        status: IntegrationStatus.PENDING,
      });
      return { ok: true };
    } catch (e: any) {
      this.logger.error(`provisionInstance falhou: ${e.message}`);
      return { ok: false, error: e.message };
    }
  }

  /** Remove a instância no uazapi e limpa registros locais. */
  async disconnect(mentorId: string): Promise<{ ok: boolean; error?: string }> {
    const admin = await this.getAdmin();
    const integ = await this.repo
      .createQueryBuilder('i')
      .addSelect('i.token')
      .where('i.mentorId = :mentorId AND i.type = :type', { mentorId, type: IntegrationType.WHATSAPP })
      .getOne();
    if (!integ) return { ok: true };

    if (admin && integ.instanceName) {
      try {
        await fetch(`${admin.baseUrl}/instance/delete`, {
          method: 'POST',
          headers: { adminToken: admin.adminToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: integ.instanceName }),
        });
      } catch (e: any) {
        this.logger.warn(`uazapi delete falhou (seguindo): ${e.message}`);
      }
    }
    await this.repo.delete(integ.id);
    return { ok: true };
  }

  async getStatus(mentorId: string) {
    const creds = await this.getCreds(mentorId);
    if (!creds) return { configured: false, status: 'no_creds', connected: false };
    try {
      const url = `${creds.baseUrl.replace(/\/$/, '')}/instance/status`;
      const res = await fetch(url, {
        headers: { token: creds.token, 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      const connected = res.ok && (data.status === 'connected' || data.connected === true || data.instance?.status === 'open' || data.instance?.status === 'connected');
      const phone = data?.instance?.owner || data?.owner || data?.instance?.phone || data?.phone || null;
      const integ = await this.repo.findOne({ where: { mentorId, type: IntegrationType.WHATSAPP } });
      if (integ) {
        integ.status = connected ? IntegrationStatus.CONNECTED : IntegrationStatus.PENDING;
        if (connected) integ.connectedAt = new Date();
        if (phone) integ.phoneNumber = String(phone).replace(/\D/g, '');
        integ.metadata = data;
        await this.repo.save(integ);
      }
      return { configured: true, connected, phoneNumber: phone, raw: data };
    } catch (e: any) {
      this.logger.warn(`uazapi status falhou: ${e.message}`);
      return { configured: true, connected: false, error: e.message };
    }
  }

  /** Solicita o QR Code da instância do mentor */
  async getQrCode(mentorId: string): Promise<{ ok: boolean; qrcode?: string; connected?: boolean; error?: string }> {
    const creds = await this.getCreds(mentorId);
    if (!creds) return { ok: false, error: 'Instância não provisionada' };
    const base = creds.baseUrl.replace(/\/$/, '');
    try {
      const res = await fetch(`${base}/instance/connect`, {
        method: 'POST',
        headers: { token: creds.token, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data?.message || `HTTP ${res.status}` };
      const qrRaw = data?.qrcode || data?.qr || data?.instance?.qrcode || data?.base64 || null;
      const qrcode = qrRaw && !String(qrRaw).startsWith('data:')
        ? `data:image/png;base64,${String(qrRaw).replace(/^data:image\/png;base64,/, '')}`
        : qrRaw;
      const connected = data?.connected === true || data?.instance?.status === 'connected' || data?.instance?.status === 'open';
      return { ok: true, qrcode, connected };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  /** Normaliza para somente dígitos com DDI (Brasil 55 default). */
  private normalizePhone(raw: string): string {
    let phone = (raw || '').replace(/\D/g, '');
    if (!phone) return '';
    if (phone.length === 10 || phone.length === 11) phone = '55' + phone;
    return phone;
  }

  /** Verifica se um número está registrado no WhatsApp via uazapi */
  async checkNumber(mentorId: string, raw: string): Promise<{ ok: boolean; isWhatsapp?: boolean; jid?: string; error?: string }> {
    const creds = await this.getCreds(mentorId);
    if (!creds) return { ok: false, error: 'WhatsApp não configurado' };
    const phone = this.normalizePhone(raw);
    if (!phone) return { ok: false, error: 'Telefone inválido' };
    const base = creds.baseUrl.replace(/\/$/, '');
    const tryEndpoints = [
      { url: `${base}/chat/check`, body: { numbers: [phone] } },
      { url: `${base}/contact/exists`, body: { number: phone } },
    ];
    for (const t of tryEndpoints) {
      try {
        const res = await fetch(t.url, {
          method: 'POST',
          headers: { token: creds.token, 'Content-Type': 'application/json' },
          body: JSON.stringify(t.body),
        });
        if (!res.ok) continue;
        const data: any = await res.json().catch(() => ({}));
        const arr = data?.numbers || data?.result || data;
        const first = Array.isArray(arr) ? arr[0] : arr;
        const isWhatsapp = !!(first?.exists ?? first?.isWhatsapp ?? first?.isInWhatsapp ?? data?.exists);
        const jid = first?.jid || first?.id;
        return { ok: true, isWhatsapp, jid };
      } catch {
        continue;
      }
    }
    return { ok: false, error: 'Falha ao validar número (endpoint indisponível)' };
  }

  /** Envia mensagem de texto via uazapi */
  async sendText(mentorId: string, to: string, message: string): Promise<{ ok: boolean; error?: string; raw?: any }> {
    const creds = await this.getCreds(mentorId);
    if (!creds) return { ok: false, error: 'WhatsApp não configurado para este mentor' };
    try {
      const phone = this.normalizePhone(to);
      const url = `${creds.baseUrl.replace(/\/$/, '')}/send/text`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { token: creds.token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: phone, text: message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data?.message || `HTTP ${res.status}`, raw: data };
      return { ok: true, raw: data };
    } catch (e: any) {
      this.logger.error(`uazapi send falhou: ${e.message}`);
      return { ok: false, error: e.message };
    }
  }

  // ============== GRUPOS & CANAIS ==============

  /** Lista grupos / comunidades / canais já existentes na instância. */
  async listGroups(mentorId: string): Promise<{ ok: boolean; groups?: any[]; error?: string }> {
    const creds = await this.getCreds(mentorId);
    if (!creds) return { ok: false, error: 'WhatsApp não configurado' };
    const base = creds.baseUrl.replace(/\/$/, '');
    // tenta endpoints comuns no uazapi
    const urls = [`${base}/group/list`, `${base}/groups`, `${base}/group/all`];
    for (const u of urls) {
      try {
        const res = await fetch(u, { headers: { token: creds.token } });
        if (!res.ok) continue;
        const data: any = await res.json().catch(() => ({}));
        const list = Array.isArray(data) ? data : (data?.groups || data?.result || data?.data || []);
        const normalized = (list || []).map((g: any) => ({
          jid: g.id || g.jid || g.group_id || g.groupJid,
          name: g.subject || g.name || g.title || 'Sem nome',
          isChannel: !!(g.isChannel || g.channel || g.type === 'channel' || g.newsletter),
          participants: g.participants?.length || g.size || g.participantsCount || 0,
          raw: g,
        })).filter((g: any) => !!g.jid);
        return { ok: true, groups: normalized };
      } catch { continue; }
    }
    return { ok: false, error: 'Endpoint de grupos indisponível' };
  }

  /** Cria um grupo no WhatsApp com participantes iniciais. */
  async createGroup(mentorId: string, name: string, participants: string[]): Promise<{ ok: boolean; jid?: string; error?: string; raw?: any }> {
    const creds = await this.getCreds(mentorId);
    if (!creds) return { ok: false, error: 'WhatsApp não configurado' };
    const base = creds.baseUrl.replace(/\/$/, '');
    const phones = (participants || []).map((p) => this.normalizePhone(p)).filter(Boolean);
    try {
      const res = await fetch(`${base}/group/create`, {
        method: 'POST',
        headers: { token: creds.token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, subject: name, participants: phones, numbers: phones }),
      });
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data?.message || `HTTP ${res.status}`, raw: data };
      const jid = data?.jid || data?.id || data?.group?.id || data?.groupJid;
      return { ok: true, jid, raw: data };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  /** Cria um canal (newsletter) — depende de suporte do uazapi. */
  async createChannel(mentorId: string, name: string, description?: string): Promise<{ ok: boolean; jid?: string; error?: string; raw?: any }> {
    const creds = await this.getCreds(mentorId);
    if (!creds) return { ok: false, error: 'WhatsApp não configurado' };
    const base = creds.baseUrl.replace(/\/$/, '');
    const tries = [
      { url: `${base}/channel/create`, body: { name, description } },
      { url: `${base}/newsletter/create`, body: { name, description } },
    ];
    for (const t of tries) {
      try {
        const res = await fetch(t.url, {
          method: 'POST',
          headers: { token: creds.token, 'Content-Type': 'application/json' },
          body: JSON.stringify(t.body),
        });
        const data: any = await res.json().catch(() => ({}));
        if (!res.ok) continue;
        const jid = data?.jid || data?.id || data?.channel?.id;
        return { ok: true, jid, raw: data };
      } catch { continue; }
    }
    return { ok: false, error: 'Criação de canal não suportada por esta instância' };
  }

  /** Adiciona participantes a um grupo/canal existente. */
  async addParticipants(mentorId: string, jid: string, participants: string[]): Promise<{ ok: boolean; error?: string; raw?: any }> {
    const creds = await this.getCreds(mentorId);
    if (!creds) return { ok: false, error: 'WhatsApp não configurado' };
    const base = creds.baseUrl.replace(/\/$/, '');
    const phones = (participants || []).map((p) => this.normalizePhone(p)).filter(Boolean);
    const tries = [
      { url: `${base}/group/addParticipants`, body: { groupJid: jid, participants: phones, numbers: phones } },
      { url: `${base}/group/participants/add`, body: { jid, participants: phones } },
    ];
    for (const t of tries) {
      try {
        const res = await fetch(t.url, {
          method: 'POST',
          headers: { token: creds.token, 'Content-Type': 'application/json' },
          body: JSON.stringify(t.body),
        });
        const data: any = await res.json().catch(() => ({}));
        if (res.ok) return { ok: true, raw: data };
      } catch { continue; }
    }
    return { ok: false, error: 'Falha ao adicionar participantes' };
  }

  /** Remove participantes de um grupo. */
  async removeParticipants(mentorId: string, jid: string, participants: string[]): Promise<{ ok: boolean; error?: string }> {
    const creds = await this.getCreds(mentorId);
    if (!creds) return { ok: false, error: 'WhatsApp não configurado' };
    const base = creds.baseUrl.replace(/\/$/, '');
    const phones = (participants || []).map((p) => this.normalizePhone(p)).filter(Boolean);
    const tries = [
      { url: `${base}/group/removeParticipants`, body: { groupJid: jid, participants: phones } },
      { url: `${base}/group/participants/remove`, body: { jid, participants: phones } },
    ];
    for (const t of tries) {
      try {
        const res = await fetch(t.url, {
          method: 'POST',
          headers: { token: creds.token, 'Content-Type': 'application/json' },
          body: JSON.stringify(t.body),
        });
        if (res.ok) return { ok: true };
      } catch { continue; }
    }
    return { ok: false, error: 'Falha ao remover participantes' };
  }

  /** Envia texto para um grupo/canal (jid completo, ex: 12036304...@g.us). */
  async sendTextToGroup(mentorId: string, groupJid: string, message: string): Promise<{ ok: boolean; error?: string; raw?: any }> {
    const creds = await this.getCreds(mentorId);
    if (!creds) return { ok: false, error: 'WhatsApp não configurado' };
    try {
      const url = `${creds.baseUrl.replace(/\/$/, '')}/send/text`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { token: creds.token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: groupJid, text: message, isGroup: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data?.message || `HTTP ${res.status}`, raw: data };
      return { ok: true, raw: data };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  /** Envia mídia para grupo/canal. */
  async sendMediaToGroup(mentorId: string, groupJid: string, att: WhatsappAttachment, publicBaseUrl?: string) {
    const creds = await this.getCreds(mentorId);
    if (!creds) return { ok: false, error: 'WhatsApp não configurado' };
    const base = creds.baseUrl.replace(/\/$/, '');
    let mediaUrl = att.url;
    if (mediaUrl.startsWith('/') && publicBaseUrl) mediaUrl = publicBaseUrl.replace(/\/$/, '') + mediaUrl;
    const kind = att.kind || (att.mimetype?.startsWith('image/') ? 'image' : att.mimetype?.startsWith('audio/') ? 'audio' : att.mimetype?.startsWith('video/') ? 'video' : 'document');
    const endpointMap: Record<string, string> = { image: '/send/image', video: '/send/video', audio: '/send/audio', document: '/send/document' };
    const endpoint = endpointMap[kind] || '/send/document';
    const body: any = { number: groupJid, url: mediaUrl, isGroup: true };
    if (att.caption) body.caption = att.caption;
    if (att.fileName) body.fileName = att.fileName;
    try {
      const res = await fetch(`${base}${endpoint}`, {
        method: 'POST',
        headers: { token: creds.token, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data?.message || `HTTP ${res.status}`, raw: data };
      return { ok: true, raw: data };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  /** Envia mídia (imagem/audio/video/documento) com caption opcional */
  async sendMedia(
    mentorId: string,
    to: string,
    att: WhatsappAttachment,
    publicBaseUrl?: string,
  ): Promise<{ ok: boolean; error?: string; raw?: any }> {
    const creds = await this.getCreds(mentorId);
    if (!creds) return { ok: false, error: 'WhatsApp não configurado' };
    try {
      const phone = this.normalizePhone(to);
      const base = creds.baseUrl.replace(/\/$/, '');
      let mediaUrl = att.url;
      if (mediaUrl.startsWith('/') && publicBaseUrl) {
        mediaUrl = publicBaseUrl.replace(/\/$/, '') + mediaUrl;
      }
      const kind = att.kind || (att.mimetype?.startsWith('image/') ? 'image' : att.mimetype?.startsWith('audio/') ? 'audio' : att.mimetype?.startsWith('video/') ? 'video' : 'document');
      const endpointMap: Record<string, string> = {
        image: '/send/image',
        video: '/send/video',
        audio: '/send/audio',
        document: '/send/document',
      };
      const endpoint = endpointMap[kind] || '/send/document';
      const body: any = { number: phone, url: mediaUrl };
      if (att.caption) body.caption = att.caption;
      if (att.fileName) body.fileName = att.fileName;
      const res = await fetch(`${base}${endpoint}`, {
        method: 'POST',
        headers: { token: creds.token, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data?.message || `HTTP ${res.status}`, raw: data };
      return { ok: true, raw: data };
    } catch (e: any) {
      this.logger.error(`uazapi sendMedia falhou: ${e.message}`);
      return { ok: false, error: e.message };
    }
  }
}
