import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlansService } from './plans.service';
import { Plan } from '../../entities/plan.entity';

export const FEATURE_KEY = 'requiredFeature';
/**
 * Marca um endpoint como exigindo uma feature do plano.
 * Use com @UseGuards(FeatureGuard) ou globalmente.
 *
 * Ex: @RequireFeature('allowCommunity')
 */
export const RequireFeature = (feature: keyof Plan) => SetMetadata(FEATURE_KEY, feature);

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(private reflector: Reflector, private plans: PlansService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<keyof Plan>(FEATURE_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!feature) return true;

    const req = ctx.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return true; // outro guard cuida da auth

    // super_admin tem acesso total
    if (user.role === 'super_admin') return true;

    // Para mentorado/team, usa o mentorId; para mentor, o próprio id
    const mentorId = user.role === 'mentor' ? (user.sub || user.id) : user.mentorId;
    if (!mentorId) return true;

    const ok = await this.plans.hasFeature(mentorId, feature);
    if (!ok) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'PlanFeatureRequired',
        feature,
        message: `Seu plano atual não inclui esta funcionalidade (${String(feature)}). Faça upgrade para acessar.`,
      });
    }
    return true;
  }
}
