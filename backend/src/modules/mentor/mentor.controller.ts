import { BadRequestException, Body, Controller, Delete, Get, Logger, Param, Patch, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { Lead, LeadStage } from '../../entities/lead.entity';
import { User, UserRole, UserStatus } from '../../entities/user.entity';
import { Auth } from '../auth/auth.decorators';
import { CurrentUser, TenantId } from '../auth/current-user.decorator';
import { MailService } from '../../shared/mail.service';
import { PlansService } from '../plans/plans.service';
import { WhatsappService } from '../integrations/whatsapp.service';

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
  private readonly logger = new Logger(MentorController.name);

  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
    private mail: MailService,
    private plans: PlansService,
    private whatsapp: WhatsappService,
  ) {}

  /** Lista mentorados (e prospects) deste mentor */
  @Auth('mentor', 'super_admin')
  @Get('mentorados')
  async list(@CurrentUser() me: any, @TenantId() mentorId: string) {
    if (!mentorId) {
      this.logger.warn(`[mentorados.list] mentorId vazio para user=${me?.sub} role=${me?.role}`);
      return [];
    }

    const [list, leads] = await Promise.all([
      this.users.find({
        where: [
          { mentorId, role: UserRole.MENTORADO },
          { mentorId, role: UserRole.PROSPECT },
        ],
        order: { createdAt: 'DESC' },
      }),
      this.leads.find({ where: { mentorId } }),
    ]);

    const leadByUserId = new Map(leads.filter((lead) => lead.userId).map((lead) => [lead.userId as string, lead.id]));
    const leadByEmail = new Map(leads.map((lead) => [lead.email.toLowerCase(), lead.id]));

    return list.map((u) => ({
      id: u.id,
      leadId: leadByUserId.get(u.id) || leadByEmail.get(u.email.toLowerCase()) || null,
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
    this.logger.log(`[mentorados.create] user=${me?.sub} role=${me?.role} mentorId=${mentorId} email=${dto?.email}`);

    if (!mentorId) {
      throw new BadRequestException('Não foi possível identificar o mentor (mentorId vazio). Faça logout/login novamente.');
    }
    if (!dto?.email || !dto?.name) {
      throw new BadRequestException('Nome e email são obrigatórios');
    }

    const limit = await this.plans.getLimit(mentorId, 'maxMentorados');
    if (limit >= 0) {
      const current = await this.users.count({ where: { mentorId, role: UserRole.MENTORADO } });
      if (current >= limit) {
        throw new BadRequestException(`Limite do plano atingido: ${limit} mentorados. Faça upgrade para adicionar mais.`);
      }
    }

    const email = dto.email.toLowerCase().trim();
    const existing = await this.users.findOne({ where: { email } });
    if (existing) {
      if (existing.role === UserRole.MENTOR || existing.role === UserRole.SUPER_ADMIN) {
        throw new BadRequestException('Este email pertence a um mentor/admin e não pode ser convertido em mentorado');
      }
      if (existing.mentorId && existing.mentorId !== mentorId) {
        throw new BadRequestException('Este email já pertence a outro mentor');
      }

      await this.users.update(existing.id, {
        mentorId,
        role: UserRole.MENTORADO,
        status: UserStatus.ACTIVE,
        name: dto.name || existing.name,
        phone: dto.phone ?? existing.phone ?? null,
        company: dto.company ?? existing.company ?? null,
      });

      let lead = await this.leads.findOne({
        where: [
          { mentorId, userId: existing.id },
          { mentorId, email },
        ],
      });

      if (!lead) {
        lead = await this.leads.save(
          this.leads.create({
            mentorId,
            userId: existing.id,
            name: dto.name || existing.name,
            email,
            phone: dto.phone ?? existing.phone,
            company: dto.company ?? existing.company,
            source: 'manual',
            stage: LeadStage.CLIENT,
          }),
        );
      } else {
        lead.userId = existing.id;
        lead.name = dto.name || lead.name;
        lead.phone = dto.phone ?? lead.phone;
        lead.company = dto.company ?? lead.company;
        await this.leads.save(lead);
      }

      return { id: existing.id, leadId: lead.id, email, reused: true };
    }

    const tempPassword = dto.password || uuid().slice(0, 8);
    const user = this.users.create({
      email,
      name: dto.name,
      phone: dto.phone || null,
      company: dto.company || null,
      passwordHash: await bcrypt.hash(tempPassword, 10),
      role: UserRole.MENTORADO,
      status: UserStatus.ACTIVE,
      mentorId,
    });
    await this.users.save(user);

    const lead = await this.leads.save(
      this.leads.create({
        mentorId,
        userId: user.id,
        name: dto.name,
        email,
        phone: dto.phone,
        company: dto.company,
        source: 'manual',
        stage: LeadStage.CLIENT,
      }),
    );

    const mentor = await this.users.findOne({ where: { id: mentorId } });
    const brand = mentor?.brandName || mentor?.name || 'MentorFlow';
    const appUrl = process.env.APP_URL || 'http://localhost:8080';
    try {
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
    } catch (e: any) {
      this.logger.warn(`[mentorados.create] falha ao enviar email: ${e.message}`);
    }

    if (dto.phone) {
      try {
        await this.whatsapp.sendText(
          mentorId,
          dto.phone,
          `Olá ${dto.name}! Você foi convidado(a) para ${brand}.\n\nEmail: ${email}\nSenha: ${tempPassword}\n\nAcesse: ${appUrl}/login`,
        );
      } catch (e: any) {
        this.logger.warn(`[mentorados.create] falha WhatsApp: ${e.message}`);
      }
    }

    return { id: user.id, leadId: lead.id, email, reused: false, tempPassword };
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
    await this.users.update(id, { status: UserStatus.SUSPENDED });
    return { ok: true };
  }
}
