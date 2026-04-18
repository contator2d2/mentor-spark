import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MentorIntegration, IntegrationProvider, IntegrationStatus, IntegrationType } from '../../entities/mentor-integration.entity';

interface UazapiCreds {
  baseUrl: string;
  token: string;
  instanceName?: string;
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
 * Resolve credenciais por mentor (multi-tenant) com fallback nas envs globais.
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    @InjectRepository(MentorIntegration) private repo: Repository<MentorIntegration>,
  ) {}

  private getGlobalFallback(): UazapiCreds | null {
    const baseUrl = process.env.UAZAPI_URL;
    const token = process.env.UAZAPI_TOKEN;
    if (!baseUrl || !token) return null;
    return { baseUrl, token, instanceName: process.env.UAZAPI_INSTANCE };
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
    return this.getGlobalFallback();
  }

  /** Cria/atualiza configuração do mentor */
  async upsertConfig(mentorId: string, dto: { baseUrl?: string; token?: string; instanceName?: string; provider?: IntegrationProvider }) {
    let integ = await this.repo.findOne({ where: { mentorId, type: IntegrationType.WHATSAPP } });
    if (!integ) {
      integ = this.repo.create({
        mentorId,
        type: IntegrationType.WHATSAPP,
        provider: dto.provider || IntegrationProvider.UAZAPI,
        status: IntegrationStatus.PENDING,
      });
    }
    if (dto.baseUrl !== undefined) integ.baseUrl = dto.baseUrl;
    if (dto.token !== undefined) integ.token = dto.token;
    if (dto.instanceName !== undefined) integ.instanceName = dto.instanceName;
    if (dto.provider) integ.provider = dto.provider;
    return this.repo.save(integ);
  }

  async getStatus(mentorId: string) {
    const creds = await this.getCreds(mentorId);
    if (!creds) return { configured: false, status: 'no_creds' };
    try {
      const url = `${creds.baseUrl.replace(/\/$/, '')}/instance/status`;
      const res = await fetch(url, {
        headers: { token: creds.token, 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      const connected = res.ok && (data.status === 'connected' || data.connected === true || data.instance?.status === 'open');
      const integ = await this.repo.findOne({ where: { mentorId, type: IntegrationType.WHATSAPP } });
      if (integ) {
        integ.status = connected ? IntegrationStatus.CONNECTED : IntegrationStatus.PENDING;
        if (connected) integ.connectedAt = new Date();
        integ.metadata = data;
        await this.repo.save(integ);
      }
      return { configured: true, connected, raw: data };
    } catch (e: any) {
      this.logger.warn(`uazapi status falhou: ${e.message}`);
      return { configured: true, connected: false, error: e.message };
    }
  }

  async getQrCode(mentorId: string) {
    const creds = await this.getCreds(mentorId);
    if (!creds) throw new Error('WhatsApp não configurado');
    const url = `${creds.baseUrl.replace(/\/$/, '')}/instance/connect`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { token: creds.token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ instanceName: creds.instanceName }),
    });
    return res.json().catch(() => ({}));
  }

  /** Normaliza para somente dígitos com DDI (Brasil 55 default). */
  private normalizePhone(raw: string): string {
    let phone = (raw || '').replace(/\D/g, '');
    if (!phone) return '';
    // Se vier sem DDI e tiver 10/11 dígitos => Brasil
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
    // uazapi tem dois formatos comuns: /chat/check ou /contact/exists
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
        // Formatos possíveis de resposta
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
      // Resolve URL absoluta caso venha relativa (/uploads/...)
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
