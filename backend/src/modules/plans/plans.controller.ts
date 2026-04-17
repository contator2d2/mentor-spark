import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Plan } from '../../entities/plan.entity';
import { User } from '../../entities/user.entity';
import { Auth } from '../auth/auth.decorators';

class UpsertPlanDto {
  @IsString() slug: string;
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() priceMonthly?: number;
  @IsOptional() @IsInt() @Min(-1) maxMentorados?: number;
  @IsOptional() @IsInt() @Min(-1) maxLeads?: number;
  @IsOptional() @IsInt() @Min(-1) maxAiMessagesMonth?: number;
  @IsOptional() @IsBoolean() allowWhatsapp?: boolean;
  @IsOptional() @IsBoolean() allowAi?: boolean;
  @IsOptional() @IsBoolean() allowCustomDomain?: boolean;
  @IsOptional() @IsBoolean() allowMeetings?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}

@Controller('plans')
export class PlansController {
  constructor(
    @InjectRepository(Plan) private plans: Repository<Plan>,
    @InjectRepository(User) private users: Repository<User>,
  ) {}

  /** Público: lista de planos ativos (para landing/pricing) */
  @Get('public')
  publicList() {
    return this.plans.find({ where: { isActive: true }, order: { sortOrder: 'ASC', priceMonthly: 'ASC' } });
  }

  @Auth('super_admin')
  @Get()
  list() {
    return this.plans.find({ order: { sortOrder: 'ASC', priceMonthly: 'ASC' } });
  }

  @Auth('super_admin')
  @Post()
  async create(@Body() dto: UpsertPlanDto) {
    const existing = await this.plans.findOne({ where: { slug: dto.slug } });
    if (existing) {
      await this.plans.update(existing.id, dto);
      return this.plans.findOne({ where: { id: existing.id } });
    }
    const p = this.plans.create(dto);
    return this.plans.save(p);
  }

  @Auth('super_admin')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<UpsertPlanDto>) {
    await this.plans.update(id, dto);
    return this.plans.findOne({ where: { id } });
  }

  @Auth('super_admin')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.plans.delete(id);
    return { ok: true };
  }

  /** Super admin atribui plano a um mentor */
  @Auth('super_admin')
  @Post('assign/:mentorId')
  async assign(@Param('mentorId') mentorId: string, @Body() body: { planId: string | null; expiresAt?: string }) {
    await this.users.update(mentorId, {
      planId: body.planId || null,
      planExpiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    } as any);
    return this.users.findOne({ where: { id: mentorId } });
  }
}
