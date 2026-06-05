import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { User, UserRole, UserStatus } from '../../entities/user.entity';
import { MailService } from '../../shared/mail.service';
import { WhatsappService } from '../integrations/whatsapp.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private jwt: JwtService,
    private mail: MailService,
    private whatsapp: WhatsappService,
  ) {}

  private slugify(s: string) {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  }

  /** Gera uma senha temporária legível: 8 chars (letras maiúsculas+números, sem 0/O/I/1) */
  private generateTempPassword(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
    return out;
  }

  private publicBrand(mentor?: User | null) {
    if (!mentor) return null;
    return {
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
    };
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
    const tenantMentorId = user.role === UserRole.MENTOR_TEAM
      ? user.parentMentorId || user.mentorId
      : user.role === UserRole.MENTORADO || user.role === UserRole.PROSPECT
        ? user.mentorId
        : null;
    const mentor = tenantMentorId ? await this.users.findOne({ where: { id: tenantMentorId } }) : null;

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
        mustChangePassword: user.mustChangePassword,
        tenantBrand: this.publicBrand(mentor),
      },
    };
  }

  /**
   * Cria usuário PROSPECT.
   * - Se `password` for informado: usa essa senha (definida pelo próprio usuário no auto-cadastro), sem mustChangePassword.
   * - Se não: gera senha temporária e marca mustChangePassword=true (fluxo do mentor cadastrando manualmente).
   */
  async createProspectUser(params: {
    mentorId: string;
    name: string;
    email: string;
    phone?: string;
    company?: string;
    revenue?: number;
    role?: UserRole;
    password?: string;
  }) {
    const existing = await this.users.findOne({ where: { email: params.email.toLowerCase() } });
    if (existing) {
      // Já existe, retorna sem criar de novo
      return { user: existing, generatedPassword: null as string | null, userChosePassword: false };
    }
    const userChosePassword = !!(params.password && params.password.length >= 8);
    const passwordToUse = userChosePassword ? params.password! : this.generateTempPassword();
    const user = this.users.create({
      email: params.email.toLowerCase(),
      passwordHash: await bcrypt.hash(passwordToUse, 10),
      name: params.name,
      phone: params.phone,
      company: params.company,
      revenue: params.revenue,
      role: params.role || UserRole.PROSPECT,
      status: UserStatus.ACTIVE,
      mentorId: params.mentorId,
      mustChangePassword: !userChosePassword,
    });
    await this.users.save(user);
    return {
      user,
      generatedPassword: userChosePassword ? null : passwordToUse,
      userChosePassword,
    };
  }

  /**
   * Envia credenciais de acesso por WhatsApp (preferencial) e email (registro formal).
   * Falhas em um canal não bloqueiam o outro.
   */
   async sendWelcomeCredentials(opts: {
     mentorId?: string;
     email: string;
     name: string;
     password: string;
     brandName: string;
     phone?: string;
   }) {
     let appUrl = process.env.APP_URL || 'http://localhost:8080';
     let mentor: User | null = null;
     if (opts.mentorId) {
       mentor = await this.users.findOne({ where: { id: opts.mentorId } });
       if (mentor?.customDomain) {
         appUrl = `https://${mentor.customDomain}`;
       }
     }
     const loginUrl = `${appUrl.replace(/\/$/, '')}/login`;
     const firstName = (opts.name || '').split(' ')[0];
     const brandName = mentor?.brandName || opts.brandName;
 
     // 1) Email (sempre tenta — registro formal)
     try {
       const html = this.mail.generateStandardTemplate({
         brandName,
         brandLogoUrl: mentor?.brandLogoUrl,
         brandPrimaryColor: mentor?.brandPrimaryColor,
         firstName,
         message: `Sua conta em <b>${brandName}</b> foi criada. Use as credenciais abaixo para acessar a plataforma.`,
         email: opts.email,
         password: opts.password,
         loginUrl,
       });
 
       await this.mail.send({
         to: opts.email,
         subject: `Seu acesso a ${brandName}`,
         html,
       });
     } catch (e) {
       // segue o jogo, WhatsApp ainda pode entregar
     }
 
     // 2) WhatsApp (se telefone + integração disponível)
     if (opts.phone && opts.mentorId) {
       try {
         const text =
           `Olá ${firstName}! 👋\n\n` +
           `Sua conta em *${brandName}* foi criada.\n\n` +
           `🔑 *Acesso:*\n` +
           `Email: ${opts.email}\n` +
           `Senha temporária: *${opts.password}*\n\n` +
           `🔗 ${loginUrl}\n\n` +
           `_Por segurança, você precisará criar uma nova senha no primeiro acesso._`;
         await this.whatsapp.sendText(opts.mentorId, opts.phone, text);
       } catch {
         // ignora — email já foi enviado
       }
     }
 
     // marca timestamp
     await this.users.update({ email: opts.email.toLowerCase() }, { credentialsSentAt: new Date() });
   }

   /** Compat: mantém o nome antigo. */
   async sendWelcomeEmail(email: string, name: string, password: string, brandName: string, mentorId?: string) {
     return this.sendWelcomeCredentials({ email, name, password, brandName, mentorId });
   }

  /**
   * Envia mensagem de boas-vindas SEM credenciais (quando o usuário definiu a própria senha).
   */
   async sendWelcomeNotice(opts: {
     mentorId?: string;
     email: string;
     name: string;
     brandName: string;
     phone?: string;
   }) {
     let appUrl = process.env.APP_URL || 'http://localhost:8080';
     let mentor: User | null = null;
     if (opts.mentorId) {
       mentor = await this.users.findOne({ where: { id: opts.mentorId } });
       if (mentor?.customDomain) {
         appUrl = `https://${mentor.customDomain}`;
       }
     }
     const loginUrl = `${appUrl.replace(/\/$/, '')}/login`;
     const firstName = (opts.name || '').split(' ')[0];
     const brandName = mentor?.brandName || opts.brandName;
 
     try {
       const html = this.mail.generateStandardTemplate({
         brandName,
         brandLogoUrl: mentor?.brandLogoUrl,
         brandPrimaryColor: mentor?.brandPrimaryColor,
         firstName,
         message: `Sua conta em <b>${brandName}</b> foi criada com sucesso. Seja bem-vindo(a)!`,
         email: opts.email,
         loginUrl,
       });
 
       await this.mail.send({
         to: opts.email,
         subject: `Bem-vindo a ${brandName}`,
         html,
       });
     } catch {}
 
     if (opts.phone && opts.mentorId) {
       try {
         const text =
           `Olá ${firstName}! 👋\n\n` +
           `Sua conta em *${brandName}* foi criada com sucesso.\n\n` +
           `Use o email *${opts.email}* e a senha que você cadastrou para entrar.\n\n` +
           `🔗 ${loginUrl}`;
         await this.whatsapp.sendText(opts.mentorId, opts.phone, text);
       } catch {}
     }
 
     await this.users.update({ email: opts.email.toLowerCase() }, { credentialsSentAt: new Date() });
   }

  /** Troca de senha autenticada (usada no primeiro login forçado e em alterações voluntárias). */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Nova senha precisa ter pelo menos 8 caracteres');
    }
    // placeholder kept
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.id = :id', { id: userId })
      .getOne();
    if (!user) throw new UnauthorizedException('Usuário não encontrado');
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Senha atual incorreta');
    await this.users.update(userId, {
      passwordHash: await bcrypt.hash(newPassword, 10),
      mustChangePassword: false,
    });
    return { ok: true };
  }

  /**
   * Reset de senha pelo super admin.
   * Gera nova senha temporária, marca mustChangePassword=true e envia por email/WhatsApp.
   */
  async adminResetPassword(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuário não encontrado');
    const newPassword = this.generateTempPassword();
    await this.users.update(userId, {
      passwordHash: await bcrypt.hash(newPassword, 10),
      mustChangePassword: true,
    });
    await this.sendWelcomeCredentials({
      mentorId: user.mentorId || user.id,
      email: user.email,
      name: user.name,
      password: newPassword,
      brandName: user.brandName || 'MentorFlow',
      phone: user.phone,
    });
    return { ok: true, tempPassword: newPassword };
  }

  /**
   * Gera um JWT para o super admin "logar como" outro usuário (impersonate).
   * Útil para suporte e debug. Não exige senha.
   */
  async adminImpersonate(targetUserId: string) {
    const user = await this.users.findOne({ where: { id: targetUserId } });
    if (!user) throw new UnauthorizedException('Usuário não encontrado');
    const access_token = this.jwt.sign({
      sub: user.id,
      role: user.role,
      mentorId: user.mentorId,
      parentMentorId: user.parentMentorId,
      impersonated: true,
    });
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
        mentorId: user.mentorId,
      },
    };
  }

  /**
   * Cadastro público auto-serviço de mentorado/lead vindo de link/QR.
   * Cria User PROSPECT com senha temporária e dispara credenciais por WhatsApp+email.
   */
  async selfSignupProspect(opts: {
    mentorId: string;
    mentorBrand: string;
    name: string;
    email: string;
    phone?: string;
    company?: string;
  }) {
    const created = await this.createProspectUser({
      mentorId: opts.mentorId,
      name: opts.name,
      email: opts.email,
      phone: opts.phone,
      company: opts.company,
    });
    if (created.generatedPassword) {
      await this.sendWelcomeCredentials({
        mentorId: opts.mentorId,
        email: opts.email,
        name: opts.name,
        password: created.generatedPassword,
        brandName: opts.mentorBrand,
        phone: opts.phone,
      });
    }
    return { user: created.user, accountCreated: !!created.generatedPassword };
  }
}
