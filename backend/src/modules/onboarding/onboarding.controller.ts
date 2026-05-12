import {
  BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Req,
} from '@nestjs/common';
import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { LeadOnboardingToken } from '../../entities/lead-onboarding-token.entity';
import { Lead, LeadStage } from '../../entities/lead.entity';
import { User } from '../../entities/user.entity';
import { Contract, ContractStatus } from '../../entities/contract.entity';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';

@Controller('onboarding')
export class OnboardingController {
  constructor(
    @InjectRepository(LeadOnboardingToken) private tokens: Repository<LeadOnboardingToken>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Contract) private contracts: Repository<Contract>,
  ) {}

  /** Mentor gera/recupera link de onboarding para um lead. */
  @Auth('mentor', 'super_admin')
  @Post('links/:leadId')
  async createLink(@TenantId() mentorId: string, @Param('leadId') leadId: string) {
    const lead = await this.leads.findOne({ where: { id: leadId, mentorId } });
    if (!lead) throw new NotFoundException('Lead não encontrado');

    let token = await this.tokens.findOne({
      where: { leadId, mentorId, completedAt: null as any },
    });
    if (!token) {
      token = this.tokens.create({
        mentorId,
        leadId,
        token: uuid().replace(/-/g, '') + uuid().replace(/-/g, '').slice(0, 8),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      await this.tokens.save(token);
    }

    let baseUrl = (process.env.APP_URL || 'http://localhost:8080').replace(/\/$/, '');
    if (mentorId) {
      const mentor = await this.users.findOne({ where: { id: mentorId } });
      if (mentor?.customDomain) {
        baseUrl = `https://${mentor.customDomain}`;
      }
    }
    return {
      token: token.token,
      url: `${baseUrl}/onboard/${token.token}`,
      expiresAt: token.expiresAt,
    };
  }

  /** Público: lê dados parciais para mostrar no formulário. */
  @Get('public/:token')
  async getPublic(@Param('token') token: string) {
    const t = await this.tokens.findOne({ where: { token } });
    if (!t) throw new NotFoundException('Link inválido');
    if (t.expiresAt && new Date(t.expiresAt) < new Date()) {
      throw new BadRequestException('Link expirado');
    }
    const lead = await this.leads.findOne({ where: { id: t.leadId } });
    const mentor = await this.users.findOne({ where: { id: t.mentorId } });
    return {
      completed: !!t.completedAt,
      mentor: { name: mentor?.brandName || mentor?.name, brandLogoUrl: mentor?.brandLogoUrl },
      lead: lead && {
        name: lead.name, email: lead.email, phone: lead.phone, company: lead.company,
        cpf: lead.cpf, rg: lead.rg, birthDate: lead.birthDate,
        addressZip: lead.addressZip, addressStreet: lead.addressStreet, addressNumber: lead.addressNumber,
        addressComplement: lead.addressComplement, addressNeighborhood: lead.addressNeighborhood,
        addressCity: lead.addressCity, addressState: lead.addressState,
        companyLegalName: lead.companyLegalName, companyCnpj: lead.companyCnpj,
        companyAddressZip: lead.companyAddressZip, companyAddressStreet: lead.companyAddressStreet,
        companyAddressNumber: lead.companyAddressNumber, companyAddressCity: lead.companyAddressCity,
        companyAddressState: lead.companyAddressState,
        revenue: lead.revenue, segment: lead.segment, employees: lead.employees,
        challenges: lead.challenges, goals: lead.goals,
      },
    };
  }

  /** Público: salva dados do onboarding. */
  @Post('public/:token')
  async submitPublic(@Param('token') token: string, @Body() body: any) {
    const t = await this.tokens.findOne({ where: { token } });
    if (!t) throw new NotFoundException('Link inválido');
    if (t.expiresAt && new Date(t.expiresAt) < new Date()) {
      throw new BadRequestException('Link expirado');
    }
    const allowed = [
      'name', 'phone', 'company', 'cpf', 'rg', 'birthDate',
      'addressZip', 'addressStreet', 'addressNumber', 'addressComplement', 'addressNeighborhood',
      'addressCity', 'addressState',
      'companyLegalName', 'companyCnpj', 'companyAddressZip', 'companyAddressStreet',
      'companyAddressNumber', 'companyAddressCity', 'companyAddressState',
      'revenue', 'segment', 'employees', 'challenges', 'goals',
    ];
    const patch: any = {};
    for (const k of allowed) if (body[k] !== undefined && body[k] !== '') patch[k] = body[k];
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('Envie ao menos um campo.');
    }
    await this.leads.update(t.leadId, patch);
    await this.tokens.update(t.id, { completedAt: new Date() });
    return { ok: true };
  }

  /** Público: assina um contrato (aceite eletrônico). */
  @Post('public/:token/sign/:contractId')
  async sign(
    @Param('token') token: string,
    @Param('contractId') contractId: string,
    @Body() body: { name: string },
    @Req() req: Request,
  ) {
    const t = await this.tokens.findOne({ where: { token } });
    if (!t) throw new NotFoundException('Link inválido');
    const c = await this.contracts.findOne({ where: { id: contractId, leadId: t.leadId } });
    if (!c) throw new NotFoundException('Contrato não encontrado');
    if (!body?.name) throw new BadRequestException('Informe seu nome para assinar.');

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '';
    await this.contracts.update(c.id, {
      status: ContractStatus.SIGNED,
      signedAt: new Date(),
      signedIp: ip,
      signedName: body.name,
    });
    return { ok: true };
  }
}
