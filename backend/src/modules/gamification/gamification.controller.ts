import { Controller, Get, Param } from '@nestjs/common';
import { Auth } from '../auth/auth.decorators';
import { CurrentUser, TenantId } from '../auth/current-user.decorator';
import { GamificationService } from './gamification.service';

@Controller('gamification')
export class GamificationController {
  constructor(private gs: GamificationService) {}

  @Auth('mentorado', 'prospect')
  @Get('me')
  async me(@CurrentUser() u: any) {
    const p = await this.gs.getOrCreate(u.sub, u.mentorId);
    return { ...p, allBadges: GamificationService.BADGES };
  }

  @Auth('mentor', 'super_admin')
  @Get('leaderboard')
  leaderboard(@TenantId() mentorId: string) {
    return this.gs.leaderboard(mentorId);
  }
}
