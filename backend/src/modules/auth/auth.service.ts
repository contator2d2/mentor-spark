import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

import { User, UserRole, UserStatus } from '../../entities/user.entity';
import { MailService } from '../../shared/mail.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private jwt: JwtService,
    private mail: MailService,
  ) {}

  private slugify(s: string) {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  }

  async signUpMentor(dto: { name: string; email: string; password: string; brandName?: string }) {
    const existing = await this.users.findOne({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email já cadastrado');
    const baseSlug = this.slugify(dto.name) || `mentor-${Date.now()}`;
    let slug = baseSlug;
    let i = 1;
    while (await this.users.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${i++}`;
    }
    const user = this.users.create({
      email: dto.email.toLowerCase(),
      passwordHash: await bcrypt.hash(dto.password, 10),
      name: dto.name,
      brandName: dto.brandName || dto.name,
      role: UserRole.MENTOR,
      // Auto-ativa o mentor — onboarding define o resto do branding
      status: UserStatus.ACTIVE,
      onboardingCompleted: false,
      slug,
    });
    await this.users.save(user);
    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = await this.jwt.signAsync(payload);
    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        slug: user.slug,
        brandName: user.brandName,
        brandLogoUrl: user.brandLogoUrl,
        brandPrimaryColor: user.brandPrimaryColor,
        brandAccentColor: user.brandAccentColor,
        onboardingCompleted: user.onboardingCompleted,
      },
      message: 'Cadastro concluído. Bem-vindo!',
    };
  }

  async login(email: string, password: string) {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email: email.toLowerCase() })
      .getOne();
    if (!user) throw new UnauthorizedException('Credenciais inválidas');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciais inválidas');
    if (user.status === UserStatus.PENDING) throw new UnauthorizedException('Conta aguardando aprovação');
    if (user.status === UserStatus.SUSPENDED) throw new UnauthorizedException('Conta suspensa');

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      mentorId: user.mentorId,
      parentMentorId: user.parentMentorId,
      teamRole: user.teamRole,
    };
    return {
      access_token: await this.jwt.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        slug: user.slug,
        brandName: user.brandName,
        brandLogoUrl: user.brandLogoUrl,
        brandPrimaryColor: user.brandPrimaryColor,
        brandAccentColor: user.brandAccentColor,
        onboardingCompleted: user.onboardingCompleted,
        mentorId: user.mentorId,
        parentMentorId: user.parentMentorId,
        teamRole: user.teamRole,
      },
    };
  }

  async createProspectUser(params: { mentorId: string; name: string; email: string; phone?: string; company?: string; revenue?: number }) {
    const existing = await this.users.findOne({ where: { email: params.email.toLowerCase() } });
    if (existing) {
      // Já existe, retorna sem criar de novo
      return { user: existing, generatedPassword: null as string | null };
    }
    const generatedPassword = uuid().slice(0, 8);
    const user = this.users.create({
      email: params.email.toLowerCase(),
      passwordHash: await bcrypt.hash(generatedPassword, 10),
      name: params.name,
      phone: params.phone,
      company: params.company,
      revenue: params.revenue,
      role: UserRole.PROSPECT,
      status: UserStatus.ACTIVE,
      mentorId: params.mentorId,
    });
    await this.users.save(user);
    return { user, generatedPassword };
  }

  async sendWelcomeEmail(email: string, name: string, password: string, brandName: string) {
    const appUrl = process.env.APP_URL || 'http://localhost:8080';
    await this.mail.send({
      to: email,
      subject: `Bem-vindo a ${brandName}`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
          <h1 style="font-size:22px;margin:0 0 16px">Olá, ${name} 👋</h1>
          <p>Sua conta em <b>${brandName}</b> foi criada. Acesse com:</p>
          <p><b>Email:</b> ${email}<br/><b>Senha temporária:</b> ${password}</p>
          <p><a href="${appUrl}/login" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Acessar plataforma</a></p>
          <p style="color:#64748b;font-size:13px;margin-top:24px">Recomendamos alterar sua senha no primeiro acesso.</p>
        </div>
      `,
    });
  }
}
