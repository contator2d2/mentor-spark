import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SalesPage, SalesPagePaymentMode, SalesPageProductType,
} from '../../entities/sales-page.entity';
import { User, UserStatus } from '../../entities/user.entity';
import { MentorPaymentProvider, PaymentProviderType } from '../../entities/mentor-payment-provider.entity';
import { AiService } from '../ai/ai.service';

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `p-${Date.now().toString(36)}`;
}

@Injectable()
export class SalesPagesService {
  private readonly logger = new Logger(SalesPagesService.name);

  constructor(
    @InjectRepository(SalesPage) private pages: Repository<SalesPage>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(MentorPaymentProvider) private providers: Repository<MentorPaymentProvider>,
    private ai: AiService,
  ) {}

  // ==================== CRUD mentor ====================
  async list(mentorId: string) {
    return this.pages.find({ where: { mentorId }, order: { updatedAt: 'DESC' } });
  }

  async get(mentorId: string, id: string) {
    const p = await this.pages.findOne({ where: { id, mentorId } });
    if (!p) throw new NotFoundException('Página não encontrada');
    return p;
  }

  private async ensureUniqueSlug(mentorId: string, base: string, ignoreId?: string) {
    let slug = slugify(base);
    for (let i = 0; i < 20; i++) {
      const existing = await this.pages.findOne({ where: { mentorId, slug } });
      if (!existing || existing.id === ignoreId) return slug;
      slug = `${slugify(base)}-${i + 2}`;
    }
    return `${slugify(base)}-${Date.now().toString(36)}`;
  }

  async create(mentorId: string, dto: Partial<SalesPage>) {
    if (!dto.title) throw new BadRequestException('Título é obrigatório');
    const slug = await this.ensureUniqueSlug(mentorId, dto.slug || dto.title);
    const p = this.pages.create({
      mentorId,
      title: dto.title,
      slug,
      productType: dto.productType || SalesPageProductType.OTHER,
      productRefId: dto.productRefId,
      headline: dto.headline,
      subheadline: dto.subheadline,
      description: dto.description,
      heroImageUrl: dto.heroImageUrl,
      videoUrl: dto.videoUrl,
      features: dto.features || [],
      faqs: dto.faqs || [],
      testimonials: dto.testimonials || [],
      badges: dto.badges || [],
      guaranteeText: dto.guaranteeText,
      ctaText: dto.ctaText || 'Quero garantir agora',
      priceCents: dto.priceCents || 0,
      currency: dto.currency || 'BRL',
      originalPriceCents: dto.originalPriceCents,
      maxInstallments: dto.maxInstallments || 1,
      paymentMode: dto.paymentMode || SalesPagePaymentMode.ONE_TIME,
      subscriptionCycle: dto.subscriptionCycle,
      paymentProviderId: dto.paymentProviderId,
      theme: dto.theme,
      seo: dto.seo,
      published: false,
      template: (dto as any).template || 'classic',
      forWho: (dto as any).forWho || [],
      notForWho: (dto as any).notForWho || [],
      agenda: (dto as any).agenda || [],
      about: (dto as any).about,
      eventInfo: (dto as any).eventInfo,
      urgencyText: (dto as any).urgencyText,
    });
    return this.pages.save(p);
  }

  async update(mentorId: string, id: string, dto: Partial<SalesPage>) {
    const p = await this.get(mentorId, id);
    if (dto.slug && dto.slug !== p.slug) {
      p.slug = await this.ensureUniqueSlug(mentorId, dto.slug, p.id);
    }
    const editable: (keyof SalesPage)[] = [
      'title', 'productType', 'productRefId', 'headline', 'subheadline', 'description',
      'heroImageUrl', 'videoUrl', 'features', 'faqs', 'testimonials', 'badges',
      'guaranteeText', 'ctaText', 'priceCents', 'currency', 'originalPriceCents',
      'maxInstallments', 'paymentMode', 'subscriptionCycle', 'paymentProviderId',
      'theme', 'seo', 'published',
      'template', 'forWho', 'notForWho', 'agenda', 'about', 'eventInfo', 'urgencyText',
    ];
    for (const k of editable) {
      if (dto[k] !== undefined) (p as any)[k] = dto[k];
    }
    return this.pages.save(p);
  }

  async remove(mentorId: string, id: string) {
    await this.get(mentorId, id);
    await this.pages.delete({ id, mentorId } as any);
    return { ok: true };
  }

  // ==================== Geração com IA ====================
  async generate(mentorId: string, dto: {
    briefing: string;
    audience?: string;
    priceHint?: string;
    productType?: SalesPageProductType;
    tone?: string;
  }) {
    if (!dto.briefing || dto.briefing.trim().length < 10) {
      throw new BadRequestException('Descreva melhor o produto (mínimo 10 caracteres).');
    }

    const system = `Você é copywriter de páginas de vendas de alta conversão para mentores e infoprodutores brasileiros.
Gere APENAS um JSON válido, sem markdown, no formato exato:
{
  "title": string (nome curto do produto, até 60 chars),
  "headline": string (título principal do hero, até 90 chars, direto e emocional),
  "subheadline": string (subtítulo do hero, até 200 chars, prova + benefício),
  "description": string (parágrafo persuasivo de 2-3 frases sobre a transformação),
  "features": [{"icon": "sparkles"|"target"|"trending-up"|"shield-check"|"zap"|"book-open"|"clock"|"users", "title": string, "text": string}] (4 a 6 itens),
  "badges": string[] (3 itens curtos, ex: "Acesso vitalício", "Garantia 7 dias", "Certificado digital"),
  "guaranteeText": string (frase de garantia curta),
  "ctaText": string (texto do botão, até 30 chars, ação clara),
  "faqs": [{"q": string, "a": string}] (4 perguntas objetivas com respostas curtas),
  "seo": {"title": string (até 60 chars), "description": string (até 155 chars)}
}
Português do Brasil. Tom: ${dto.tone || 'profissional, próximo, sem clichês vazios'}.`;

    const user = `Produto: ${dto.briefing}
Público: ${dto.audience || 'não especificado'}
Preço/oferta: ${dto.priceHint || 'não especificado'}
Tipo: ${dto.productType || 'não especificado'}

Gere o JSON agora.`;

    let raw = '';
    try {
      raw = await this.ai.chat(system, user, { mentorId, useCase: 'sales_page_generate' });
    } catch (e: any) {
      if (e instanceof ForbiddenException) throw e;
      throw new BadRequestException(`Falha ao chamar IA: ${e?.message || e}`);
    }

    // Extrai JSON (remove ```json fences se houver)
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start < 0 || end < 0) {
      throw new BadRequestException('IA não retornou JSON válido. Tente novamente.');
    }
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      throw new BadRequestException('IA retornou JSON malformado. Tente novamente.');
    }
    // sanitiza
    return {
      title: String(parsed.title || '').slice(0, 100),
      headline: String(parsed.headline || '').slice(0, 200),
      subheadline: String(parsed.subheadline || '').slice(0, 400),
      description: String(parsed.description || '').slice(0, 1200),
      features: Array.isArray(parsed.features) ? parsed.features.slice(0, 8).map((f: any) => ({
        icon: String(f.icon || 'sparkles'),
        title: String(f.title || '').slice(0, 80),
        text: String(f.text || '').slice(0, 200),
      })) : [],
      badges: Array.isArray(parsed.badges) ? parsed.badges.slice(0, 5).map((b: any) => String(b).slice(0, 40)) : [],
      guaranteeText: String(parsed.guaranteeText || '').slice(0, 200),
      ctaText: String(parsed.ctaText || 'Quero garantir agora').slice(0, 40),
      faqs: Array.isArray(parsed.faqs) ? parsed.faqs.slice(0, 8).map((f: any) => ({
        q: String(f.q || '').slice(0, 200),
        a: String(f.a || '').slice(0, 800),
      })) : [],
      seo: {
        title: String(parsed?.seo?.title || parsed.title || '').slice(0, 70),
        description: String(parsed?.seo?.description || '').slice(0, 165),
      },
    };
  }

  // ==================== Público ====================
  async publicBySlug(mentorSlug: string, pageSlug: string) {
    const m = await this.users.findOne({ where: { slug: mentorSlug, status: UserStatus.ACTIVE } });
    if (!m) throw new NotFoundException('Mentor não encontrado');
    const p = await this.pages.findOne({ where: { mentorId: m.id, slug: pageSlug, published: true } });
    if (!p) throw new NotFoundException('Página não encontrada ou não publicada');
    return {
      mentor: {
        id: m.id,
        slug: m.slug,
        brandName: m.brandName,
        brandLogoUrl: m.brandLogoUrl,
        brandPrimaryColor: m.brandPrimaryColor,
        brandAccentColor: m.brandAccentColor,
      },
      page: p,
    };
  }

  // ==================== Checkout transparente Asaas ====================
  async checkout(
    mentorSlug: string,
    pageSlug: string,
    dto: {
      name: string;
      email: string;
      cpfCnpj: string;
      phone?: string;
      billingType: 'PIX' | 'CREDIT_CARD';
      creditCard?: {
        holderName: string;
        number: string;
        expiryMonth: string;
        expiryYear: string;
        ccv: string;
      };
      creditCardHolderInfo?: {
        name: string;
        email: string;
        cpfCnpj: string;
        postalCode: string;
        addressNumber: string;
        phone?: string;
      };
      installments?: number;
    },
  ) {
    if (!dto?.name || !dto?.email || !dto?.cpfCnpj) {
      throw new BadRequestException('Nome, e-mail e CPF/CNPJ são obrigatórios.');
    }
    const { mentor, page } = await this.publicBySlug(mentorSlug, pageSlug);
    if (!page.paymentProviderId) {
      throw new BadRequestException('Página sem provedor de pagamento configurado.');
    }
    if (!page.priceCents || page.priceCents < 100) {
      throw new BadRequestException('Preço inválido.');
    }

    // Carrega provider com apiKey
    const provider = await this.providers
      .createQueryBuilder('p')
      .addSelect('p.apiKey')
      .where('p.id = :id AND p.mentorId = :mid', { id: page.paymentProviderId, mid: mentor.id })
      .getOne();

    if (!provider) throw new BadRequestException('Provedor de pagamento não encontrado.');
    if (provider.type !== PaymentProviderType.ASAAS) {
      throw new BadRequestException('Somente Asaas é suportado neste checkout.');
    }
    if (!provider.apiKey) throw new BadRequestException('API key Asaas ausente.');

    const baseUrl = provider.environment === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://sandbox.asaas.com/api/v3';
    const headers = {
      access_token: provider.apiKey,
      'Content-Type': 'application/json',
      'User-Agent': 'MentorGleego/1.0',
    };

    // 1. cliente
    const customer = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        cpfCnpj: dto.cpfCnpj.replace(/\D/g, ''),
        externalReference: `salespage:${page.id}`,
      }),
    }).then((r) => r.json());
    if (!customer?.id) {
      throw new BadRequestException(customer?.errors?.[0]?.description || 'Falha ao criar cliente Asaas.');
    }

    const value = page.priceCents / 100;
    const description = `${page.title} — ${mentor.brandName || 'Compra'}`;

    // 2. Cobrança
    const dueDate = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const chargePayload: any = {
      customer: customer.id,
      billingType: dto.billingType,
      value,
      dueDate,
      description,
      externalReference: `salespage:${page.id}`,
    };
    if (dto.billingType === 'CREDIT_CARD') {
      if (!dto.creditCard || !dto.creditCardHolderInfo) {
        throw new BadRequestException('Dados do cartão obrigatórios.');
      }
      chargePayload.installmentCount = Math.max(1, Math.min(dto.installments || 1, page.maxInstallments));
      if (chargePayload.installmentCount > 1) {
        chargePayload.totalValue = value;
        delete chargePayload.value;
      }
      chargePayload.creditCard = {
        holderName: dto.creditCard.holderName,
        number: dto.creditCard.number.replace(/\s/g, ''),
        expiryMonth: dto.creditCard.expiryMonth,
        expiryYear: dto.creditCard.expiryYear,
        ccv: dto.creditCard.ccv,
      };
      chargePayload.creditCardHolderInfo = {
        name: dto.creditCardHolderInfo.name,
        email: dto.creditCardHolderInfo.email,
        cpfCnpj: dto.creditCardHolderInfo.cpfCnpj.replace(/\D/g, ''),
        postalCode: dto.creditCardHolderInfo.postalCode.replace(/\D/g, ''),
        addressNumber: dto.creditCardHolderInfo.addressNumber,
        phone: dto.creditCardHolderInfo.phone,
      };
    }

    const endpoint = dto.billingType === 'CREDIT_CARD' && (chargePayload.installmentCount || 1) > 1
      ? '/installments'
      : '/payments';

    const charge = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(chargePayload),
    }).then((r) => r.json());

    if (!charge?.id && !charge?.installment) {
      throw new BadRequestException(charge?.errors?.[0]?.description || 'Falha ao criar cobrança.');
    }

    const chargeId = charge.id || charge.installment;

    // 3. Se PIX → busca QR
    let pix: { payload?: string; qrImage?: string } | null = null;
    if (dto.billingType === 'PIX') {
      try {
        const q = await fetch(`${baseUrl}/payments/${chargeId}/pixQrCode`, { headers }).then((r) => r.json());
        pix = {
          payload: q.payload,
          qrImage: q.encodedImage ? `data:image/png;base64,${q.encodedImage}` : undefined,
        };
      } catch (e: any) {
        this.logger.warn(`Asaas pix qrcode falhou: ${e?.message}`);
      }
    }

    return {
      ok: true,
      chargeId,
      status: charge.status || 'PENDING',
      billingType: dto.billingType,
      value,
      invoiceUrl: charge.invoiceUrl || null,
      bankSlipUrl: charge.bankSlipUrl || null,
      pix,
    };
  }
}