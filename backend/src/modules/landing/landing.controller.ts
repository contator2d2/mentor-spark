import { Body, Controller, Get, NotFoundException, Param, Put } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LandingPage, LandingBlock } from '../../entities/landing-page.entity';
import { User, UserStatus } from '../../entities/user.entity';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';

@Controller('landing')
export class LandingController {
  constructor(
    @InjectRepository(LandingPage) private pages: Repository<LandingPage>,
    @InjectRepository(User) private users: Repository<User>,
  ) {}

  @Auth('mentor', 'super_admin')
  @Get('mine')
  async mine(@TenantId() mentorId: string) {
    let p = await this.pages.findOne({ where: { mentorId } });
    if (!p) p = await this.pages.save(this.pages.create({ mentorId, blocks: defaultBlocks(), published: false }));
    return p;
  }

  @Auth('mentor', 'super_admin')
  @Put('mine')
  async update(@TenantId() mentorId: string, @Body() dto: Partial<LandingPage>) {
    let p = await this.pages.findOne({ where: { mentorId } });
    if (!p) p = this.pages.create({ mentorId });
    if (dto.blocks !== undefined) p.blocks = dto.blocks;
    if (dto.theme !== undefined) p.theme = dto.theme;
    if (dto.published !== undefined) p.published = dto.published;
    return this.pages.save(p);
  }

  /** Endpoint público: renderiza o landing por slug do mentor */
  @Get('public/:slug')
  async publicBySlug(@Param('slug') slug: string) {
    const m = await this.users.findOne({ where: { slug, status: UserStatus.ACTIVE } });
    if (!m) throw new NotFoundException('Mentor não encontrado');
    const p = await this.pages.findOne({ where: { mentorId: m.id, published: true } });
    return {
      mentor: {
        id: m.id, slug: m.slug, brandName: m.brandName, brandLogoUrl: m.brandLogoUrl,
        brandPrimaryColor: m.brandPrimaryColor, brandAccentColor: m.brandAccentColor,
      },
      landing: p ? { blocks: p.blocks, theme: p.theme } : null,
    };
  }
}

function defaultBlocks(): LandingBlock[] {
  return [
    { id: 'b1', type: 'hero', data: { title: 'Sua transformação começa aqui', subtitle: 'Mentoria estratégica para resultados reais.', ctaText: 'Começar agora' } },
    { id: 'b2', type: 'features', data: { items: [
      { icon: 'sparkles', title: 'Diagnóstico inteligente', text: 'Teste personalizado com IA.' },
      { icon: 'target', title: 'Plano sob medida', text: 'Etapas claras pra você crescer.' },
      { icon: 'trending-up', title: 'Acompanhamento contínuo', text: 'Resultados mensuráveis.' },
    ] } },
    { id: 'b3', type: 'form', data: { title: 'Comece agora', fields: ['name', 'email', 'phone', 'company', 'revenue'] } },
  ];
}
