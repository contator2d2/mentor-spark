import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MentorIntegration, IntegrationProvider, IntegrationStatus, IntegrationType } from '../../entities/mentor-integration.entity';

interface UazapiCreds {
  baseUrl: string;
  token: string;
  instanceName?: string;
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
      // Atualiza status persistido se temos integ deste mentor
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

  /** Solicita QR code para conectar instância */
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

  /** Envia mensagem de texto via uazapi */
  async sendText(mentorId: string, to: string, message: string): Promise<{ ok: boolean; error?: string; raw?: any }> {
    const creds = await this.getCreds(mentorId);
    if (!creds) return { ok: false, error: 'WhatsApp não configurado para este mentor' };
    try {
      const phone = to.replace(/\D/g, '');
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
}
