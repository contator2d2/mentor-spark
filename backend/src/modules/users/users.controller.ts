import { Body, Controller, Get, Put, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Auth } from '../auth/auth.decorators';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('me')
export class UsersController {
  constructor(@InjectRepository(User) private users: Repository<User>) {}

  @Auth('mentor', 'super_admin', 'mentorado', 'prospect')
  @Get()
  async me(@CurrentUser() u: any) {
    const user = await this.users.findOne({ where: { id: u.sub } });
    if (!user) return null;
    // Se for mentorado/prospect, devolve também o branding do mentor
    if ((user.role === 'mentorado' || user.role === 'prospect') && user.mentorId) {
      const mentor = await this.users.findOne({ where: { id: user.mentorId } });
      return {
        ...user,
        tenantBrand: mentor
          ? {
              brandName: mentor.brandName || mentor.name,
              brandLogoUrl: mentor.brandLogoUrl,
              brandPrimaryColor: mentor.brandPrimaryColor,
              brandAccentColor: mentor.brandAccentColor,
              slug: mentor.slug,
            }
          : null,
      };
    }
    return user;
  }

  @Auth('mentor', 'super_admin')
  @Put('brand')
  async updateBrand(
    @CurrentUser() u: any,
    @Body()
    dto: {
      brandName?: string;
      brandLogoUrl?: string;
      brandPrimaryColor?: string;
      brandAccentColor?: string;
      customDomain?: string;
      slug?: string;
    },
  ) {
    const patch: any = { ...dto };
    if (patch.customDomain) patch.customDomain = patch.customDomain.toLowerCase().trim();
    if (patch.slug) {
      patch.slug = patch.slug
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);
    }
    await this.users.update(u.sub, patch);
    return this.users.findOne({ where: { id: u.sub } });
  }

  @Auth('mentor', 'super_admin')
  @Post('onboarding/complete')
  async completeOnboarding(@CurrentUser() u: any, @Body() dto: any) {
    await this.users.update(u.sub, { ...dto, onboardingCompleted: true });
    return this.users.findOne({ where: { id: u.sub } });
  }
}
