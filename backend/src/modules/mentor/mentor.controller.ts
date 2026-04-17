import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { User, UserRole, UserStatus } from '../../entities/user.entity';
import { Auth } from '../auth/auth.decorators';
import { CurrentUser, TenantId } from '../auth/current-user.decorator';
import { MailService } from '../../shared/mail.service';

class CreateMentoradoDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional() @IsString()
  phone?: string;

  @IsOptional() @IsString()
  company?: string;

  @IsOptional() @IsString()
  password?: string;
}

@Controller('mentor')
export class MentorController {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private mail: MailService,
  ) {}

  /** Lista mentorados (e prospects) deste mentor */
  @Auth('mentor', 'super_admin')
  @Get('mentorados')
  async list(@TenantId() mentorId: string) {
    const list = await this.users.find({
      where: [
        { mentorId, role: UserRole.MENTORADO },
        { mentorId, role: UserRole.PROSPECT },
      ],
      order: { createdAt: 'DESC' },
    });
    return list.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      company: u.company,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
    }));
  }

  /** Convida (cria) mentorado neste tenant. */
  @Auth('mentor', 'super_admin')
  @Post('mentorados')
  async create(@CurrentUser() me: any, @TenantId() mentorId: string, @Body() dto: CreateMentoradoDto) {
    if (!dto.email || !dto.name) throw new BadRequestException('Nome e email são obrigatórios');
    const email = dto.email.toLowerCase().trim();
    const existing = await this.users.findOne({ where: { email } });
    if (existing) {
      if (existing.mentorId && existing.mentorId !== mentorId) {
        throw new BadRequestException('Este email já pertence a outro mentor');
      }
      // Já existe — promove a MENTORADO neste tenant
      await this.users.update(existing.id, {
        mentorId,
        role: UserRole.MENTORADO,
        status: UserStatus.ACTIVE,
      });
      return { id: existing.id, email, reused: true };
    }

    const tempPassword = dto.password || uuid().slice(0, 8);
    const user = this.users.create({
      email,
      name: dto.name,
      phone: dto.phone,
      company: dto.company,
      passwordHash: await bcrypt.hash(tempPassword, 10),
      role: UserRole.MENTORADO,
      status: UserStatus.ACTIVE,
      mentorId,
    });
    await this.users.save(user);

    // Email de boas-vindas
    const mentor = await this.users.findOne({ where: { id: mentorId } });
    const brand = mentor?.brandName || mentor?.name || 'MentorFlow';
    const appUrl = process.env.APP_URL || 'http://localhost:8080';
    await this.mail.send({
      to: email,
      subject: `Bem-vindo a ${brand}`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
          <h1 style="font-size:22px;margin:0 0 16px">Olá, ${dto.name} 👋</h1>
          <p>Você foi convidado(a) por <b>${mentor?.name || brand}</b> para fazer parte de <b>${brand}</b>.</p>
          <p><b>Email:</b> ${email}<br/><b>Senha temporária:</b> ${tempPassword}</p>
          <p><a href="${appUrl}/login" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Acessar plataforma</a></p>
          <p style="color:#64748b;font-size:13px;margin-top:24px">Recomendamos alterar a senha no primeiro acesso.</p>
        </div>
      `,
    });

    return { id: user.id, email, reused: false, tempPassword };
  }

  @Auth('mentor', 'super_admin')
  @Patch('mentorados/:id')
  async update(@TenantId() mentorId: string, @Param('id') id: string, @Body() dto: any) {
    const u = await this.users.findOne({ where: { id, mentorId } });
    if (!u) throw new BadRequestException('Mentorado não encontrado');
    const allowed = ['name', 'phone', 'company', 'status'];
    const patch: any = {};
    for (const k of allowed) if (k in dto) patch[k] = dto[k];
    await this.users.update(id, patch);
    return this.users.findOne({ where: { id } });
  }

  @Auth('mentor', 'super_admin')
  @Delete('mentorados/:id')
  async remove(@TenantId() mentorId: string, @Param('id') id: string) {
    const u = await this.users.findOne({ where: { id, mentorId } });
    if (!u) throw new BadRequestException('Mentorado não encontrado');
    // Não deleta de fato — suspende e desvincula apenas se for mentorado
    await this.users.update(id, { status: UserStatus.SUSPENDED });
    return { ok: true };
  }
}
