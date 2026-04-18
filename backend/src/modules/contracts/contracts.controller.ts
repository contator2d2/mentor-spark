import {
  BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Res,
} from '@nestjs/common';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { ContractTemplate } from '../../entities/contract-template.entity';
import { Contract, ContractStatus } from '../../entities/contract.entity';
import { Lead } from '../../entities/lead.entity';
import { User } from '../../entities/user.entity';
import { Plan } from '../../entities/plan.entity';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';
import { ContractsService } from './contracts.service';
import { AiService } from '../ai/ai.service';

class UpsertTemplateDto {
  @IsString() name: string;
  @IsString() body: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

class GenerateContractDto {
  @IsString() leadId: string;
  @IsString() templateId: string;
  @IsOptional() @IsString() title?: string;
}

class AiGenerateTemplateDto {
  @IsString() contractType: string; // mentoria | consultoria | coaching | nda | prestacao_servicos | personalizado
  @IsOptional() @IsString() segment?: string;
  @IsOptional() @IsString() objective?: string;
  @IsOptional() @IsString() durationMonths?: string;
  @IsOptional() @IsString() priceMonthly?: string;
  @IsOptional() @IsString() paymentTerms?: string;
  @IsOptional() @IsString() jurisdiction?: string;
  @IsOptional() @IsString() extraClauses?: string;
  @IsOptional() @IsString() tone?: string; // formal | acessível
}

@Controller('contracts')
export class ContractsController {
  constructor(
    @InjectRepository(ContractTemplate) private tpls: Repository<ContractTemplate>,
    @InjectRepository(Contract) private contracts: Repository<Contract>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Plan) private plans: Repository<Plan>,
    private service: ContractsService,
    private ai: AiService,
  ) {}

  // ============ Templates ============
  @Auth('mentor', 'super_admin')
  @Get('templates')
  listTemplates(@TenantId() mentorId: string) {
    return this.tpls.find({ where: { mentorId }, order: { createdAt: 'DESC' } });
  }

  @Auth('mentor', 'super_admin')
  @Post('templates')
  createTemplate(@TenantId() mentorId: string, @Body() dto: UpsertTemplateDto) {
    return this.tpls.save(this.tpls.create({ mentorId, ...dto }));
  }

  @Auth('mentor', 'super_admin')
  @Patch('templates/:id')
  async updateTemplate(@TenantId() mentorId: string, @Param('id') id: string, @Body() dto: Partial<UpsertTemplateDto>) {
    const t = await this.tpls.findOne({ where: { id, mentorId } });
    if (!t) throw new NotFoundException();
    await this.tpls.update(id, dto);
    return this.tpls.findOne({ where: { id } });
  }

  @Auth('mentor', 'super_admin')
  @Delete('templates/:id')
  async removeTemplate(@TenantId() mentorId: string, @Param('id') id: string) {
    const t = await this.tpls.findOne({ where: { id, mentorId } });
    if (!t) throw new NotFoundException();
    await this.tpls.delete(id);
    return { ok: true };
  }

  // ============ AI generation ============
  @Auth('mentor', 'super_admin')
  @Post('templates/ai-generate')
  async aiGenerate(@TenantId() mentorId: string, @Body() dto: AiGenerateTemplateDto) {
    const mentor = await this.users.findOne({ where: { id: mentorId } });
    const typeLabels: Record<string, string> = {
      mentoria: 'Contrato de Prestação de Serviços de Mentoria Empresarial',
      consultoria: 'Contrato de Consultoria',
      coaching: 'Contrato de Coaching',
      nda: 'Acordo de Confidencialidade (NDA)',
      prestacao_servicos: 'Contrato de Prestação de Serviços',
      personalizado: 'Contrato Personalizado',
    };
    const titulo = typeLabels[dto.contractType] || 'Contrato';

    const sys = `Você é um advogado brasileiro especialista em contratos para mentores e consultores. Gere contratos juridicamente sólidos, em português brasileiro, ${dto.tone === 'acessivel' ? 'em linguagem acessível e clara' : 'em linguagem formal jurídica'}. Use APENAS os placeholders abaixo onde fizer sentido (não invente outros): {{nome}}, {{cpf}}, {{rg}}, {{endereco}}, {{cidade}}, {{estado}}, {{cep}}, {{empresa}}, {{cnpj}}, {{empresa_endereco}}, {{empresa_cidade}}, {{empresa_estado}}, {{empresa_cep}}, {{segmento}}, {{faturamento}}, {{mentor_nome}}, {{mentor_marca}}, {{mentor_email}}, {{plano_nome}}, {{valor_plano}}, {{data_hoje}}.`;

    const user = `Gere o corpo COMPLETO de um ${titulo}.

Informações:
- Mentor/Empresa: ${mentor?.brandName || mentor?.name || '{{mentor_marca}}'}
- Segmento de atuação do mentorado: ${dto.segment || 'genérico'}
- Objetivo da mentoria/serviço: ${dto.objective || 'desenvolvimento empresarial'}
- Duração: ${dto.durationMonths || '12'} meses
- Valor mensal: ${dto.priceMonthly ? `R$ ${dto.priceMonthly}` : '{{valor_plano}}'}
- Forma de pagamento: ${dto.paymentTerms || 'Mensal, via boleto/PIX/cartão'}
- Foro: ${dto.jurisdiction || 'Comarca do mentor'}
${dto.extraClauses ? `- Cláusulas extras solicitadas: ${dto.extraClauses}` : ''}

Estrutura obrigatória:
1. QUALIFICAÇÃO DAS PARTES (CONTRATANTE e CONTRATADA)
2. OBJETO
3. ESCOPO DOS SERVIÇOS (detalhado conforme o segmento)
4. OBRIGAÇÕES DAS PARTES
5. PRAZO E VIGÊNCIA
6. VALOR E FORMA DE PAGAMENTO
7. CONFIDENCIALIDADE
8. PROPRIEDADE INTELECTUAL
9. RESCISÃO
10. FORO

Retorne APENAS o texto do contrato, sem comentários adicionais, sem markdown, sem títulos extras.`;

    const body = await this.ai.chat(sys, user);
    return { name: titulo, body: body.trim() };
  }

  // ============ Contratos ============
  @Auth('mentor', 'super_admin')
  @Get()
  list(@TenantId() mentorId: string) {
    return this.contracts.find({ where: { mentorId }, order: { createdAt: 'DESC' } });
  }

  @Auth('mentor', 'super_admin')
  @Get(':id')
  async get(@TenantId() mentorId: string, @Param('id') id: string) {
    const c = await this.contracts.findOne({ where: { id, mentorId } });
    if (!c) throw new NotFoundException();
    return c;
  }

  @Auth('mentor', 'super_admin')
  @Post('generate')
  async generate(@TenantId() mentorId: string, @Body() dto: GenerateContractDto) {
    const lead = await this.leads.findOne({ where: { id: dto.leadId, mentorId } });
    if (!lead) throw new BadRequestException('Lead não encontrado');
    const tpl = await this.tpls.findOne({ where: { id: dto.templateId, mentorId } });
    if (!tpl) throw new BadRequestException('Template não encontrado');
    const mentor = await this.users.findOne({ where: { id: mentorId } });
    const plan = mentor?.planId ? await this.plans.findOne({ where: { id: mentor.planId } }) : null;
    return this.service.generate(mentor!, lead, tpl, plan, dto.title);
  }

  @Auth('mentor', 'super_admin')
  @Get(':id/pdf')
  async pdf(@TenantId() mentorId: string, @Param('id') id: string, @Res() res: Response) {
    const c = await this.contracts.findOne({ where: { id, mentorId } });
    if (!c) throw new NotFoundException();
    const mentor = await this.users.findOne({ where: { id: mentorId } });
    const buffer = await this.service.renderPdf(c, mentor || undefined);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="contrato-${c.id}.pdf"`);
    res.end(buffer);
  }
}
