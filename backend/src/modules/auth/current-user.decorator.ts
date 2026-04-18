import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.user;
});

/**
 * Resolve o mentorId no contexto multi-tenant:
 * - se for MENTOR ou SUPER_ADMIN → seu próprio id
 * - se for PROSPECT/MENTORADO → seu mentorId
 */
export const TenantId = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  const u = req.user;
  if (!u) return null;
  if (u.role === 'mentor' || u.role === 'super_admin') return u.sub;
  if (u.role === 'mentor_team') return u.parentMentorId;
  return u.mentorId;
});
