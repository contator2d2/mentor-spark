import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Plan } from '../../entities/plan.entity';
import { User } from '../../entities/user.entity';
import { Auth } from '../auth/auth.decorators';
import { CurrentUser } from '../auth/current-user.decorator';
import { PlansService } from './plans.service';

class UpsertPlanDto {
  @IsString() slug: string;
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() stripePriceId?: string;
  @IsOptional() @IsNumber() priceMonthly?: number;

  // Limites (-1 = ilimitado)
  @IsOptional() @IsInt() @Min(-1) maxMentorados?: number;
  @IsOptional() @IsInt() @Min(-1) maxLeads?: number;
  @IsOptional() @IsInt() @Min(-1) maxAiMessagesMonth?: number;
  @IsOptional() @IsInt() @Min(-1) maxTeamMembers?: number;
  @IsOptional() @IsInt() @Min(-1) maxKanbanBoards?: number;

  // Módulos / features
  @IsOptional() @IsBoolean() allowWhatsapp?: boolean;
  @IsOptional() @IsBoolean() allowAi?: boolean;
  @IsOptional() @IsBoolean() allowCustomDomain?: boolean;
  @IsOptional() @IsBoolean() allowMeetings?: boolean;
  @IsOptional() @IsBoolean() allowGoogleCalendar?: boolean;
  @IsOptional() @IsBoolean() allowAutomations?: boolean;
  @IsOptional() @IsBoolean() allowLandingBuilder?: boolean;
  @IsOptional() @IsBoolean() allowMessaging?: boolean;
  @IsOptional() @IsBoolean() allowScheduling?: boolean;
  @IsOptional() @IsBoolean() allowMentorBilling?: boolean;
  @IsOptional() @IsBoolean() allowTrails?: boolean;
  @IsOptional() @IsBoolean() allowCommunity?: boolean;
  @IsOptional() @IsBoolean() allowAdvancedAnalytics?: boolean;

  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}

@Controller('plans')
export class PlansController {
  constructor(
    @InjectRepository(Plan) private plans: Repository<Plan>,
    @InjectRepository(User) private users: Repository<User>,
    private plansSvc: PlansService,
  ) {}

  /** Features do plano do mentor logado (para gating de UI) */
  @Auth('mentor', 'super_admin', 'mentor_team', 'mentorado', 'prospect')
  @Get('me/features')
  async myFeatures(@CurrentUser() u: any) {
    // super_admin e mentorado/team usam o mentorId apropriado
    const mentorId = u.role === 'mentor' ? u.sub : u.parentMentorId || u.mentorId || u.sub;
    if (u.role === 'super_admin') {
      // super admin vê tudo liberado
      return {
        plan: null,
        isExpired: false,
        features: this.allFeaturesTrue(),
      };
    }
    const { plan, isExpired } = await this.plansSvc.getMentorPlan(mentorId);
    const features = this.computeFeatures(plan, isExpired);
    return {
      plan: plan ? { id: plan.id, slug: plan.slug, name: plan.name } : null,
      isExpired,
      features,
    };
  }

  private allFeaturesTrue() {
    return {
      allowAi: true, allowWhatsapp: true, allowMeetings: true, allowCommunity: true,
      allowTrails: true, allowScheduling: true, allowMentorBilling: true,
      allowAutomations: true, allowLandingBuilder: true, allowAdvancedAnalytics: true,
      allowMessaging: true, allowGoogleCalendar: true, allowCustomDomain: true,
    };
  }

  private computeFeatures(plan: Plan | null, isExpired: boolean) {
    if (!plan) {
      // sem plano = trial liberado (alinhar com PlansService.hasFeature)
      return this.allFeaturesTrue();
    }
    if (isExpired) {
      return Object.fromEntries(Object.keys(this.allFeaturesTrue()).map((k) => [k, false]));
    }
    return {
      allowAi: !!plan.allowAi,
      allowWhatsapp: !!plan.allowWhatsapp,
      allowMeetings: !!plan.allowMeetings,
      allowCommunity: !!plan.allowCommunity,
      allowTrails: !!plan.allowTrails,
      allowScheduling: !!plan.allowScheduling,
      allowMentorBilling: !!plan.allowMentorBilling,
      allowAutomations: !!plan.allowAutomations,
      allowLandingBuilder: !!plan.allowLandingBuilder,
      allowAdvancedAnalytics: !!plan.allowAdvancedAnalytics,
      allowMessaging: !!plan.allowMessaging,
      allowGoogleCalendar: !!plan.allowGoogleCalendar,
      allowCustomDomain: !!plan.allowCustomDomain,
    };
  }

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
