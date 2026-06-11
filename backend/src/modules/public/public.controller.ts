import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
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

  private normalizeHost(value?: string | null) {
    return (value || '')
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .replace(/:\d+$/, '')
      .replace(/\.$/, '')
      .replace(/^www\./, '');
  }

  private hostCandidates(host: string) {
    const normalized = this.normalizeHost(host);
    const candidates = new Set<string>([normalized, `www.${normalized}`]);
    if (
      normalized.startsWith('app.') ||
      normalized.startsWith('portal.') ||
      normalized.startsWith('mentor.')
    ) {
      const root = normalized.replace(/^(app|portal|mentor)\./, '');
      candidates.add(root);
      candidates.add(`www.${root}`);
    }
    return Array.from(candidates).filter(Boolean);
  }

  private slugCandidatesFromHost(host: string) {
    const normalized = this.normalizeHost(host);
    const ignored = new Set(['www', 'app', 'portal', 'mentor', 'localhost', 'com', 'combr', 'br', '']);
    const parts = normalized.split('.').filter(Boolean);
    const candidates = new Set<string>();

    for (const part of parts) {
      const compact = part.replace(/[^a-z0-9]/g, '');
      if (!ignored.has(part) && !ignored.has(compact) && compact.length >= 4) {
        candidates.add(compact);
      }
    }

    return Array.from(candidates);
  }

  /** Resolve tenant pelo host (subdomínio ou domínio próprio).
   *  Ex.: joao.mentorflow.com → mentor com slug=joao
   *       app.cliente.com    → mentor com customDomain='app.cliente.com'
   */
  @Get('tenant-by-host')
  async tenantByHost(@Query('host') host?: string) {
    if (!host) return null;
    const h = this.normalizeHost(host);
    const domainCandidates = this.hostCandidates(h);

    // 1) Domínio customizado. Normaliza também valores antigos salvos com protocolo/barra.
    let mentor = await this.users
      .createQueryBuilder('u')
      .where('u.status = :status', { status: UserStatus.ACTIVE })
      .andWhere(
        `LOWER(REGEXP_REPLACE(REGEXP_REPLACE(COALESCE(u."customDomain", ''), '^https?://', ''), '/.*$', '')) IN (:...domains)`,
        { domains: domainCandidates },
      )
      .getOne();

    // 2) Subdomínio ou slug (tenta extrair o slug se não achou por domínio customizado)
    if (!mentor) {
      const parts = h.split('.');
      const sub = parts[0];
      const ignore = new Set(['www', 'app', 'portal', 'mentor', 'localhost', '']);
      
      // Se tiver mais de 2 partes e a primeira for um slug válido (não ignorado)
      if (parts.length >= 2 && !ignore.has(sub)) {
        mentor = await this.users.findOne({ where: { slug: sub, status: UserStatus.ACTIVE } });
      }
      
      // Se ainda não achou e tem 3+ partes (ex: app.slug.com.br), tenta a segunda parte
      if (!mentor && parts.length >= 3 && ignore.has(sub)) {
        const potentialSlug = parts[1];
        if (!ignore.has(potentialSlug)) {
          mentor = await this.users.findOne({ where: { slug: potentialSlug, status: UserStatus.ACTIVE } });
        }
      }

      // 3) Domínios como app.draamandacristina.com.br: se o domínio não foi salvo
      // exatamente em customDomain, tenta casar o token do domínio com o slug sem hífens.
      if (!mentor) {
        const slugTokens = this.slugCandidatesFromHost(h);
        if (slugTokens.length) {
          const compactExpr = (field: string) => `LOWER(REGEXP_REPLACE(COALESCE(${field}, ''), '[^a-z0-9]', '', 'g'))`;
          const tokenClauses = slugTokens
            .map((_, i) => {
              const token = `:slugToken${i}`;
              const tokenRaw = `:slugTokenRaw${i}`;
              // Bidirectional match: host token contains mentor identifier, OR mentor identifier contains host token.
              return `(
                ${compactExpr('u.slug')} LIKE ${token}
                OR ${compactExpr('u."brandName"')} LIKE ${token}
                OR ${compactExpr('u.name')} LIKE ${token}
                OR (LENGTH(${compactExpr('u.slug')}) >= 4 AND ${tokenRaw} LIKE '%' || ${compactExpr('u.slug')} || '%')
                OR (LENGTH(${compactExpr('u."brandName"')}) >= 4 AND ${tokenRaw} LIKE '%' || ${compactExpr('u."brandName"')} || '%')
                OR (LENGTH(${compactExpr('u.name')}) >= 4 AND ${tokenRaw} LIKE '%' || ${compactExpr('u.name')} || '%')
              )`;
            })
            .join(' OR ');
          const tokenParams = Object.fromEntries(
            slugTokens.flatMap((token, i) => [
              [`slugToken${i}`, `%${token}%`],
              [`slugTokenRaw${i}`, token],
            ]),
          );

          mentor = await this.users
            .createQueryBuilder('u')
            .where('u.status = :status', { status: UserStatus.ACTIVE })
            .andWhere('u.role = :role', { role: 'mentor' })
            .andWhere(`(${tokenClauses})`, tokenParams)
            .getOne();
        }
      }
    }

    if (!mentor) {
      return null;
    }
    return {
      id: mentor.id,
      slug: mentor.slug,
      brandName: mentor.brandName || mentor.name,
      brandLogoUrl: mentor.brandLogoUrl,
      brandBannerUrl: mentor.brandBannerUrl,
      brandMobileBannerUrl: mentor.brandMobileBannerUrl,
      brandPrimaryColor: mentor.brandPrimaryColor,
      brandAccentColor: mentor.brandAccentColor,
      brandTheme: mentor.brandTheme,
      brandHighlightTheme: mentor.brandHighlightTheme,
      brandCoursesLayout: mentor.brandCoursesLayout,
      brandDarkBannerUrl: mentor.brandDarkBannerUrl,
      brandDarkLogoUrl: mentor.brandDarkLogoUrl,
    };
  }

  /** Página pública de captação por slug do mentor */
   @Get('mentor-by-id/:id')
   async getMentorById(@Param('id') id: string) {
     const m = await this.users.findOne({ where: { id, status: UserStatus.ACTIVE } });
     if (!m) throw new NotFoundException('Mentor não encontrado');
     return {
       id: m.id,
       name: m.name,
       brandName: m.brandName || m.name,
       brandLogoUrl: m.brandLogoUrl,
       brandBannerUrl: m.brandBannerUrl,
       brandMobileBannerUrl: m.brandMobileBannerUrl,
       brandPrimaryColor: m.brandPrimaryColor,
       brandAccentColor: m.brandAccentColor,
        brandTheme: m.brandTheme,
        brandHighlightTheme: m.brandHighlightTheme,
        brandCoursesLayout: m.brandCoursesLayout,
        brandDarkBannerUrl: m.brandDarkBannerUrl,
        brandDarkLogoUrl: m.brandDarkLogoUrl,
       slug: m.slug,
       customDomain: m.customDomain,
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
      brandBannerUrl: m.brandBannerUrl,
      brandMobileBannerUrl: m.brandMobileBannerUrl,
      brandPrimaryColor: m.brandPrimaryColor,
      brandAccentColor: m.brandAccentColor,
      brandTheme: m.brandTheme,
      brandHighlightTheme: m.brandHighlightTheme,
      brandCoursesLayout: m.brandCoursesLayout,
      brandDarkBannerUrl: m.brandDarkBannerUrl,
      brandDarkLogoUrl: m.brandDarkLogoUrl,
      slug: m.slug,
    };
  }

  @Get('mentor/:slug/qrcode')
  async getQrCode(@Param('slug') slug: string) {
    const m = await this.users.findOne({ where: { slug, status: UserStatus.ACTIVE } });
    if (!m) throw new NotFoundException('Mentor não encontrado');

    let baseUrl = (process.env.APP_URL || 'http://localhost:8080').replace(/\/$/, '');
    if (m.customDomain) {
      baseUrl = `https://${m.customDomain}`;
    }

    const url = `${baseUrl}/c/${slug}`;
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
