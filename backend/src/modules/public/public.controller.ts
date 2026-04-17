import { Body, Controller, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../../entities/user.entity';
import { TestTemplate } from '../../entities/test-template.entity';
import { Lead } from '../../entities/lead.entity';
import { LeadsService } from '../leads/leads.service';
import { TestsService } from '../tests/tests.service';
import { ApiTags } from '@nestjs/swagger';
import * as QRCode from 'qrcode';

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(TestTemplate) private templates: Repository<TestTemplate>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
    private leadsService: LeadsService,
    private testsService: TestsService,
  ) {}

  /** Resolve tenant pelo host (subdomínio ou domínio próprio).
   *  Ex.: joao.mentorflow.com → mentor com slug=joao
   *       app.cliente.com    → mentor com customDomain='app.cliente.com'
   */
  @Get('tenant-by-host')
  async tenantByHost(@Query('host') host?: string) {
    if (!host) return null;
    const h = host.toLowerCase().split(':')[0];

    // 1) Domínio customizado
    let mentor = await this.users.findOne({ where: { customDomain: h, status: UserStatus.ACTIVE } });

    // 2) Subdomínio (primeiro segmento) — ignora www e o app principal
    if (!mentor) {
      const parts = h.split('.');
      const baseDomain = (process.env.APP_BASE_DOMAIN || '').toLowerCase();
      const sub = parts[0];
      const ignore = new Set(['www', 'app', 'mentor', 'localhost', '']);
      if (parts.length >= 3 && !ignore.has(sub) && (!baseDomain || h.endsWith(baseDomain))) {
        mentor = await this.users.findOne({ where: { slug: sub, status: UserStatus.ACTIVE } });
      }
    }

    if (!mentor) return null;
    return {
      id: mentor.id,
      slug: mentor.slug,
      brandName: mentor.brandName || mentor.name,
      brandLogoUrl: mentor.brandLogoUrl,
      brandPrimaryColor: mentor.brandPrimaryColor,
      brandAccentColor: mentor.brandAccentColor,
    };
  }

  /** Página pública de captação por slug do mentor */
  @Get('mentor/:slug')
  async getMentorBySlug(@Param('slug') slug: string) {
    const m = await this.users.findOne({ where: { slug, status: UserStatus.ACTIVE } });
    if (!m) throw new NotFoundException('Mentor não encontrado');
    return {
      id: m.id,
      name: m.name,
      brandName: m.brandName || m.name,
      brandLogoUrl: m.brandLogoUrl,
      brandPrimaryColor: m.brandPrimaryColor,
      brandAccentColor: m.brandAccentColor,
      slug: m.slug,
    };
  }

  @Get('mentor/:slug/qrcode')
  async getQrCode(@Param('slug') slug: string) {
    const url = `${process.env.APP_URL || 'http://localhost:8080'}/c/${slug}`;
    const dataUrl = await QRCode.toDataURL(url, { width: 512, margin: 2 });
    return { url, qr: dataUrl };
  }

  /** Submissão pública de lead */
  @Post('mentor/:slug/lead')
  async createLead(
    @Param('slug') slug: string,
    @Body() body: { name: string; email: string; phone?: string; company?: string; revenue?: number; source?: string },
  ) {
    const mentor = await this.users.findOne({ where: { slug, status: UserStatus.ACTIVE } });
    if (!mentor) throw new NotFoundException('Mentor não encontrado');
    const result = await this.leadsService.createFromCapture({
      mentorId: mentor.id,
      mentorBrand: mentor.brandName || mentor.name,
      ...body,
    });
    return { ok: true, leadId: result.lead.id, accountCreated: result.accountCreated };
  }
}
