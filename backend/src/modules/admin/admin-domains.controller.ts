import { Controller, Get, Param, Post, Body, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, IsNull, Repository } from 'typeorm';
import { promises as dns } from 'dns';
import { User, UserRole, UserStatus } from '../../entities/user.entity';
import { Auth } from '../auth/auth.decorators';

/**
 * Tela admin de "Domínios dos mentores":
 *   - lista todos os mentores que cadastraram customDomain
 *   - verifica DNS (A record apontando para o IP do servidor)
 *   - publica o domínio no Easypanel via API (1 clique) quando configurado
 *
 * ENV opcionais:
 *   APP_SERVER_IP        — IP que o DNS dos mentores deve apontar (ex: 185.158.133.1)
 *   EASYPANEL_API_URL    — ex: https://easypanel.gleego.com.br/api
 *   EASYPANEL_API_TOKEN  — token de API
 *   EASYPANEL_PROJECT    — ex: blaster
 *   EASYPANEL_SERVICE    — ex: mentorflow-front
 */
@Controller('admin/domains')
export class AdminDomainsController {
  constructor(@InjectRepository(User) private users: Repository<User>) {}

  private serverIp() {
    return (process.env.APP_SERVER_IP || '').trim() || null;
  }

  private async resolveDns(host: string): Promise<{ ips: string[]; cnames: string[]; error?: string }> {
    const out: { ips: string[]; cnames: string[]; error?: string } = { ips: [], cnames: [] };
    try { out.ips = await dns.resolve4(host); } catch (e: any) { /* ignora */ }
    try { out.cnames = await dns.resolveCname(host); } catch { /* ignora */ }
    if (!out.ips.length && !out.cnames.length) out.error = 'DNS não resolve — domínio não está apontando para nenhum servidor.';
    return out;
  }

  /** Lista todos os domínios cadastrados pelos mentores, com status DNS. */
  @Auth('super_admin')
  @Get()
  async list() {
    const expectedIp = this.serverIp();
    const mentors = await this.users.find({
      where: { role: UserRole.MENTOR, customDomain: Not(IsNull()) },
      order: { createdAt: 'DESC' },
    });

    const result = await Promise.all(
      mentors
        .filter((m) => !!m.customDomain)
        .map(async (m) => {
          const host = (m.customDomain || '').toLowerCase().trim();
          const dnsInfo = await this.resolveDns(host);
          const dnsOk = expectedIp ? dnsInfo.ips.includes(expectedIp) : dnsInfo.ips.length > 0;

          return {
            mentorId: m.id,
            mentorName: m.name,
            mentorEmail: m.email,
            brandName: m.brandName,
            brandLogoUrl: m.brandLogoUrl,
            mentorStatus: m.status,
            domain: host,
            createdAt: m.createdAt,
            dnsIps: dnsInfo.ips,
            dnsCnames: dnsInfo.cnames,
            dnsError: dnsInfo.error,
            dnsOk,
            expectedIp,
          };
        }),
    );
    return {
      expectedIp,
      easypanelConfigured: !!(process.env.EASYPANEL_API_URL && process.env.EASYPANEL_API_TOKEN && process.env.EASYPANEL_PROJECT && process.env.EASYPANEL_SERVICE),
      domains: result,
    };
  }

  /** Re-verifica DNS de um domínio específico. */
  @Auth('super_admin')
  @Get(':mentorId/check')
  async check(@Param('mentorId') mentorId: string) {
    const m = await this.users.findOne({ where: { id: mentorId } });
    if (!m || !m.customDomain) throw new NotFoundException('Mentor sem domínio');
    const expectedIp = this.serverIp();
    const dnsInfo = await this.resolveDns(m.customDomain);
    return {
      domain: m.customDomain,
      expectedIp,
      dnsIps: dnsInfo.ips,
      dnsCnames: dnsInfo.cnames,
      dnsError: dnsInfo.error,
      dnsOk: expectedIp ? dnsInfo.ips.includes(expectedIp) : dnsInfo.ips.length > 0,
    };
  }

  /** Publica o domínio no Easypanel (cria o host no serviço de frontend e habilita SSL). */
  @Auth('super_admin')
  @Post(':mentorId/publish')
  async publish(@Param('mentorId') mentorId: string, @Body() body?: { force?: boolean }) {
    const m = await this.users.findOne({ where: { id: mentorId } });
    if (!m || !m.customDomain) throw new NotFoundException('Mentor sem domínio');
    const host = m.customDomain.toLowerCase().trim();

    const apiUrl = process.env.EASYPANEL_API_URL;
    const token = process.env.EASYPANEL_API_TOKEN;
    const project = process.env.EASYPANEL_PROJECT;
    const service = process.env.EASYPANEL_SERVICE;
    if (!apiUrl || !token || !project || !service) {
      throw new BadRequestException(
        'Easypanel não configurado. Defina EASYPANEL_API_URL, EASYPANEL_API_TOKEN, EASYPANEL_PROJECT, EASYPANEL_SERVICE no .env do backend.',
      );
    }

    if (!body?.force) {
      const expectedIp = this.serverIp();
      const dnsInfo = await this.resolveDns(host);
      const ok = expectedIp ? dnsInfo.ips.includes(expectedIp) : dnsInfo.ips.length > 0;
      if (!ok) {
        throw new BadRequestException(
          `DNS de ${host} ainda não está apontando para o servidor${expectedIp ? ` (${expectedIp})` : ''}. Aguarde a propagação ou use "Forçar publicação".`,
        );
      }
    }

    // Easypanel API: criar domínio no serviço de app.
    // Easypanel usa tRPC. O endpoint costuma ser /api/trpc/projects.app.createDomain?batch=1
    // ou /api/projects.app.createDomain dependendo da configuração do proxy/versão.
    
    const baseUrl = apiUrl.replace(/\/$/, '');
    const isTrpc = baseUrl.includes('/trpc') || !baseUrl.endsWith('/api');
    
    // Se a URL não termina em /trpc, mas termina em /api, tentamos adicionar /trpc se falhar.
    // Por padrão, vamos usar o formato tRPC que é o nativo do Easypanel.
    const url = baseUrl.includes('/trpc') 
      ? `${baseUrl}/projects.app.createDomain?batch=1`
      : `${baseUrl}/trpc/projects.app.createDomain?batch=1`;

    let resp: Response;
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          "0": {
            json: {
              projectName: project,
              serviceName: service,
              domain: { host, https: true, port: 80, path: '/' },
            },
          }
        }),
      });
    } catch (e: any) {
      throw new BadRequestException(`Falha ao chamar Easypanel: ${e.message}`);
    }
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new BadRequestException(`Easypanel retornou ${resp.status}: ${text.slice(0, 300)}`);
    }

    // Marca mentor como ativo se ainda estiver pending
    if (m.status === UserStatus.PENDING) {
      await this.users.update(m.id, { status: UserStatus.ACTIVE });
    }
    return { ok: true, domain: host };
  }
}