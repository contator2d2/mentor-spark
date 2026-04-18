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

  /** Submissão pública de lead. Aceita ?event=<slug> para vincular a um evento.
   *  No auto-cadastro, o lead define a própria senha (mínimo 8 caracteres). */
  @Post('mentor/:slug/lead')
  async createLead(
    @Param('slug') slug: string,
    @Body() body: { name: string; email: string; phone?: string; company?: string; revenue?: number; source?: string; eventSlug?: string; password?: string },
  ) {
    const mentor = await this.users.findOne({ where: { slug, status: UserStatus.ACTIVE } });
    if (!mentor) throw new NotFoundException('Mentor não encontrado');

    if (!body.password || body.password.length < 8) {
      throw new BadRequestException('Senha obrigatória (mínimo 8 caracteres)');
    }

    let eventId: string | undefined;
    if (body.eventSlug) {
      const ev = await (this.users.manager as any).findOne('events', { where: { slug: body.eventSlug, mentorId: mentor.id } });
      if (ev) eventId = ev.id;
    }

    const result = await this.leadsService.createFromCapture({
      mentorId: mentor.id,
      mentorBrand: mentor.brandName || mentor.name,
      eventId,
      ...body,
    });
    return { ok: true, leadId: result.lead.id, accountCreated: result.accountCreated, userChosePassword: result.userChosePassword };
  }

  /** Lista pública de testes ativos do mentor (para o lead escolher após capturar) */
  @Get('mentor/:slug/tests')
  async listTests(@Param('slug') slug: string) {
    const mentor = await this.users.findOne({ where: { slug, status: UserStatus.ACTIVE } });
    if (!mentor) throw new NotFoundException('Mentor não encontrado');
    const list = await this.templates.find({
      where: { mentorId: mentor.id, active: true },
      order: { createdAt: 'DESC' },
    });
    return list.map((t) => ({ id: t.id, title: t.title, description: t.description, category: t.category }));
  }

  /** Detalhes de um teste para o player conversacional (público) */
  @Get('mentor/:slug/tests/:id')
  async getTest(@Param('slug') slug: string, @Param('id') id: string) {
    const mentor = await this.users.findOne({ where: { slug, status: UserStatus.ACTIVE } });
    if (!mentor) throw new NotFoundException('Mentor não encontrado');
    const t = await this.templates.findOne({ where: { id, mentorId: mentor.id, active: true }, relations: ['questions'] });
    if (!t) throw new NotFoundException('Teste não encontrado');
    t.questions = (t.questions || []).sort((a, b) => a.order - b.order);
    return {
      id: t.id,
      title: t.title,
      description: t.description,
      category: t.category,
      questions: t.questions.map((q) => ({ id: q.id, type: q.type, text: q.text, config: q.config, order: q.order })),
    };
  }

  /** Submissão pública de respostas de teste por um lead (já capturado).
   *  Não retorna a análise IA (apenas score) — IA é privilégio do mentor. */
  @Post('mentor/:slug/tests/:id/responses')
  async submitTest(
    @Param('slug') slug: string,
    @Param('id') templateId: string,
    @Body() body: { leadId: string; answers: Array<{ questionId: string; answer: any }> },
  ) {
    const mentor = await this.users.findOne({ where: { slug, status: UserStatus.ACTIVE } });
    if (!mentor) throw new NotFoundException('Mentor não encontrado');
    const lead = await this.leads.findOne({ where: { id: body.leadId, mentorId: mentor.id } });
    if (!lead) throw new NotFoundException('Lead não encontrado');
    const r = await this.testsService.submitResponse({
      mentorId: mentor.id,
      templateId,
      leadId: lead.id,
      answers: body.answers,
    });
    return { ok: true, responseId: r.id, scorePct: Number(r.scorePct), classification: r.classification };
  }
}
