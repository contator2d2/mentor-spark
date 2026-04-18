import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { AppSettingsService } from '../admin/app-settings.service';

/**
 * Cliente Asaas. Usa credenciais globais do Super Admin (app_settings) por padrão,
 * mas pode aceitar API key por mentor (futuro: split account).
 *
 * Sandbox: https://sandbox.asaas.com/api/v3
 * Prod:    https://api.asaas.com/v3
 */
@Injectable()
export class AsaasService {
  private readonly logger = new Logger(AsaasService.name);

  constructor(private settings: AppSettingsService) {}

  private async getConfig(): Promise<{ apiKey: string; baseUrl: string }> {
    const [apiKey, env] = await Promise.all([
      this.settings.get('asaas.apiKey'),
      this.settings.get('asaas.env'),
    ]);
    if (!apiKey) {
      throw new BadRequestException(
        'Asaas não configurado. Super admin deve configurar em Admin → Credenciais.',
      );
    }
    const baseUrl = env === 'production' ? 'https://api.asaas.com/v3' : 'https://sandbox.asaas.com/api/v3';
    return { apiKey, baseUrl };
  }

  private async req(path: string, init: RequestInit = {}) {
    const { apiKey, baseUrl } = await this.getConfig();
    const r = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        access_token: apiKey,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      this.logger.warn(`Asaas ${path} ${r.status}: ${JSON.stringify(data).slice(0, 300)}`);
      throw new BadRequestException(data?.errors?.[0]?.description || `Asaas ${r.status}`);
    }
    return data;
  }

  async upsertCustomer(c: { name: string; email?: string; cpfCnpj?: string; phone?: string; externalReference?: string }) {
    return this.req('/customers', { method: 'POST', body: JSON.stringify(c) });
  }

  async createCharge(c: {
    customer: string;
    billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
    value: number;
    dueDate: string; // YYYY-MM-DD
    description?: string;
    externalReference?: string;
  }) {
    return this.req('/payments', { method: 'POST', body: JSON.stringify(c) });
  }

  async createSubscription(s: {
    customer: string;
    billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
    value: number;
    nextDueDate: string;
    cycle: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
    description?: string;
    externalReference?: string;
  }) {
    return this.req('/subscriptions', { method: 'POST', body: JSON.stringify(s) });
  }

  async getPixQrCode(chargeId: string) {
    return this.req(`/payments/${chargeId}/pixQrCode`);
  }

  async cancelCharge(chargeId: string) {
    return this.req(`/payments/${chargeId}`, { method: 'DELETE' });
  }

  async cancelSubscription(subId: string) {
    return this.req(`/subscriptions/${subId}`, { method: 'DELETE' });
  }
}
