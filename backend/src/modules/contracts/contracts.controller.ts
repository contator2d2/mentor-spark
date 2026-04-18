import {
  BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Res,
} from '@nestjs/common';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ContractTemplate } from '../../entities/contract-template.entity';
import { Contract, ContractStatus } from '../../entities/contract.entity';
import { Lead } from '../../entities/lead.entity';
import { User } from '../../entities/user.entity';
import { Plan } from '../../entities/plan.entity';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';
import { ContractsService } from './contracts.service';

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

@Controller('contracts')
export class ContractsController {
  constructor(
    @InjectRepository(ContractTemplate) private tpls: Repository<ContractTemplate>,
    @InjectRepository(Contract) private contracts: Repository<Contract>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Plan) private plans: Repository<Plan>,
    private service: ContractsService,
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
    const buffer = await this.service.renderPdf(c);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="contrato-${c.id}.pdf"`);
    res.end(buffer);
  }
}
