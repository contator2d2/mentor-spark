import { Body, Controller, Get, Post, HttpCode } from '@nestjs/common';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { Auth } from './auth.decorators';
import { CurrentUser } from './current-user.decorator';
import { User } from '../../entities/user.entity';
import { ApiTags } from '@nestjs/swagger';

class SignUpDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsOptional() @IsString() brandName?: string;
}

class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

class ChangePasswordDto {
  @IsString() currentPassword: string;
  @IsString() @MinLength(8) newPassword: string;
}

class ForgotPasswordDto {
  @IsEmail() email: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    @InjectRepository(User) private users: Repository<User>,
  ) {}

  @Post('signup-mentor')
  signUpMentor(@Body() dto: SignUpDto) {
    return this.auth.signUpMentor(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  /** Solicitação pública de redefinição de senha (gera senha temporária e envia por email/WhatsApp). */
  @Post('forgot-password')
  @HttpCode(200)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.requestPasswordReset(dto.email);
  }

  /** Troca de senha autenticada (usada no primeiro login forçado). */
  @Auth('mentor', 'super_admin', 'mentorado', 'prospect', 'mentor_team')
  @Post('change-password')
  @HttpCode(200)
  changePassword(@CurrentUser() u: any, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(u.sub, dto.currentPassword, dto.newPassword);
  }

  /** Alias compatível com clientes que chamam /auth/me */
  @Auth('mentor', 'super_admin', 'mentorado', 'prospect', 'mentor_team')
  @Get('me')
  async me(@CurrentUser() u: any) {
    const user = await this.users.findOne({ where: { id: u.sub } });
    if (!user) return null;

    const tenantMentorId =
      user.role === 'mentor_team'
        ? user.parentMentorId || user.mentorId
        : user.role === 'mentorado' || user.role === 'prospect'
          ? user.mentorId
          : null;

    if (tenantMentorId) {
      const mentor = await this.users.findOne({ where: { id: tenantMentorId } });
      return {
        ...user,
        mentorId: tenantMentorId,
        parentMentorId: user.parentMentorId,
        teamRole: user.teamRole,
        tenantBrand: mentor
          ? {
              id: mentor.id,
              brandName: mentor.brandName || mentor.name,
              brandLogoUrl: mentor.brandLogoUrl,
              brandBannerUrl: mentor.brandBannerUrl,
              brandMobileBannerUrl: mentor.brandMobileBannerUrl,
              brandPrimaryColor: mentor.brandPrimaryColor,
              brandAccentColor: mentor.brandAccentColor,
              brandTheme: mentor.brandTheme,
              brandHighlightTheme: mentor.brandHighlightTheme,
              brandDarkBannerUrl: mentor.brandDarkBannerUrl,
              brandDarkLogoUrl: mentor.brandDarkLogoUrl,
              slug: mentor.slug,
            }
          : null,
      };
    }
    return user;
  }
}
