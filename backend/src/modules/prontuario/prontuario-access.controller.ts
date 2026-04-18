import { Body, Controller, Get, Param, Post, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';
import { Lead } from '../../entities/lead.entity';
import { User, UserRole, UserStatus } from '../../entities/user.entity';
import { AuthService } from '../auth/auth.service';

/**
 * Gerenciamento de acesso do mentorado ao app a partir do prontuário:
 * - Habilitar/desabilitar conta
 * - Definir senha padrão (forçando troca no 1º login)
 * - Reenviar credenciais por WhatsApp/email
 * - Alterar permissões/role
 */
@Controller('prontuario')
export class ProntuarioAccessController {
  constructor(
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectRepository(User) private users: Repository<User>,
    private authService: AuthService,
  ) {}

  /** Status do acesso do mentorado (existe user? está ativo? precisa trocar senha?) */
  @Auth('mentor', 'super_admin')
  @Get(':leadId/access')
  async getAccess(@TenantId() mentorId: string, @Param('leadId') leadId: string) {
    const lead = await this.leads.findOne({ where: { id: leadId, mentorId } });
    if (!lead) throw new NotFoundException('Lead não encontrado');

    let user: User | null = null;
    if (lead.userId) {
      user = await this.users.findOne({ where: { id: lead.userId } });
    }
    if (!user) {
      user = await this.users.findOne({ where: { email: lead.email.toLowerCase(), mentorId } });
      if (user && !lead.userId) {
        await this.leads.update(lead.id, { userId: user.id });
      }
    }

    return {
      hasAccess: !!user,
      lead: { id: lead.id, name: lead.name, email: lead.email, phone: lead.phone },
      user: user
        ? {
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status,
            mustChangePassword: user.mustChangePassword,
            credentialsSentAt: user.credentialsSentAt,
            createdAt: user.createdAt,
          }
        : null,
    };
  }

  /**
   * Habilita acesso ao app:
   * - Cria conta MENTORADO se não existir
   * - Define senha padrão (mínimo 8 chars). Se omitida, gera temporária
   * - Marca mustChangePassword=true (troca obrigatória no 1º login)
   * - Reenvia credenciais por WhatsApp+email
   */
  @Auth('mentor', 'super_admin')
  @Post(':leadId/access/enable')
  async enable(
    @TenantId() mentorId: string,
    @Param('leadId') leadId: string,
    @Body() body: { defaultPassword?: string; role?: 'mentorado' | 'prospect'; sendCredentials?: boolean },
  ) {
    const lead = await this.leads.findOne({ where: { id: leadId, mentorId } });
    if (!lead) throw new NotFoundException('Lead não encontrado');

    const password = (body.defaultPassword?.trim()) || this.generateTempPassword();
    if (password.length < 8) throw new BadRequestException('Senha precisa ter pelo menos 8 caracteres');

    const role = body.role === 'prospect' ? UserRole.PROSPECT : UserRole.MENTORADO;
    const sendCredentials = body.sendCredentials !== false;

    let user: User | null = lead.userId
      ? await this.users.findOne({ where: { id: lead.userId } })
      : await this.users.findOne({ where: { email: lead.email.toLowerCase() } });

    if (user) {
      // Atualiza senha e força troca
      await this.users.update(user.id, {
        passwordHash: await bcrypt.hash(password, 10),
        mustChangePassword: true,
        status: UserStatus.ACTIVE,
        role,
        mentorId,
      });
      user = await this.users.findOne({ where: { id: user.id } });
    } else {
      user = this.users.create({
        email: lead.email.toLowerCase(),
        passwordHash: await bcrypt.hash(password, 10),
        name: lead.name,
        phone: lead.phone,
        role,
        status: UserStatus.ACTIVE,
        mentorId,
        mustChangePassword: true,
      });
      await this.users.save(user);
    }

    if (!lead.userId) await this.leads.update(lead.id, { userId: user!.id });

    if (sendCredentials) {
      const mentor = await this.users.findOne({ where: { id: mentorId } });
      await this.authService.sendWelcomeCredentials({
        mentorId,
        email: lead.email,
        name: lead.name,
        password,
        brandName: mentor?.brandName || mentor?.name || 'sua plataforma',
        phone: lead.phone,
      });
    }

    return { ok: true, password, sentCredentials: sendCredentials };
  }

  /** Desabilita o acesso (suspend) — não apaga o usuário. */
  @Auth('mentor', 'super_admin')
  @Post(':leadId/access/disable')
  async disable(@TenantId() mentorId: string, @Param('leadId') leadId: string) {
    const lead = await this.leads.findOne({ where: { id: leadId, mentorId } });
    if (!lead || !lead.userId) throw new NotFoundException('Acesso não encontrado');
    await this.users.update(lead.userId, { status: UserStatus.SUSPENDED });
    return { ok: true };
  }

  /** Reativa o acesso de um usuário previamente suspenso. */
  @Auth('mentor', 'super_admin')
  @Post(':leadId/access/reactivate')
  async reactivate(@TenantId() mentorId: string, @Param('leadId') leadId: string) {
    const lead = await this.leads.findOne({ where: { id: leadId, mentorId } });
    if (!lead || !lead.userId) throw new NotFoundException('Acesso não encontrado');
    await this.users.update(lead.userId, { status: UserStatus.ACTIVE });
    return { ok: true };
  }

  /** Reenvia credenciais (gera nova senha temporária). */
  @Auth('mentor', 'super_admin')
  @Post(':leadId/access/resend')
  async resend(@TenantId() mentorId: string, @Param('leadId') leadId: string) {
    return this.enable(mentorId, leadId, { sendCredentials: true });
  }

  /** Altera a permissão/role do usuário (mentorado ou prospect). */
  @Auth('mentor', 'super_admin')
  @Post(':leadId/access/role')
  async changeRole(
    @TenantId() mentorId: string,
    @Param('leadId') leadId: string,
    @Body() body: { role: 'mentorado' | 'prospect' },
  ) {
    const lead = await this.leads.findOne({ where: { id: leadId, mentorId } });
    if (!lead || !lead.userId) throw new NotFoundException('Acesso não encontrado');
    const role = body.role === 'prospect' ? UserRole.PROSPECT : UserRole.MENTORADO;
    await this.users.update(lead.userId, { role });
    return { ok: true };
  }

  private generateTempPassword(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
    return out;
  }
}
