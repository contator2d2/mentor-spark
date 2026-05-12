import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';
import { TeamMember, TeamRole, TeamStatus } from '../../entities/team-member.entity';
import { User, UserRole, UserStatus } from '../../entities/user.entity';
import { Plan } from '../../entities/plan.entity';
import { MailService } from '../../shared/mail.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('team')
@ApiBearerAuth()
@Controller('team')
export class TeamController {
  constructor(
    @InjectRepository(TeamMember) private members: Repository<TeamMember>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Plan) private plans: Repository<Plan>,
    private mail: MailService,
  ) {}

  @Auth('mentor', 'super_admin', 'mentor_team')
  @Get()
  list(@TenantId() mentorId: string) {
    return this.members.find({ where: { mentorId }, order: { createdAt: 'ASC' } });
  }

  @Auth('mentor', 'super_admin', 'mentor_team')
  @Get('limits')
  async limits(@TenantId() mentorId: string) {
    const mentor = await this.users.findOne({ where: { id: mentorId } });
    const plan = mentor?.planId ? await this.plans.findOne({ where: { id: mentor.planId } }) : null;
    const used = await this.members.count({ where: { mentorId } });
    return {
      used,
      max: plan?.maxTeamMembers ?? 0,
      planName: plan?.name || 'Sem plano',
      canAdd: (plan?.maxTeamMembers ?? 0) === -1 || used < (plan?.maxTeamMembers ?? 0),
    };
  }

  @Auth('mentor', 'super_admin')
  @Post()
  async create(@TenantId() mentorId: string, @Body() dto: { name: string; email: string; phone?: string; role: TeamRole }) {
    if (!dto.name || !dto.email || !dto.role) throw new BadRequestException('name, email e role obrigatórios');

    const mentor = await this.users.findOne({ where: { id: mentorId } });
    const plan = mentor?.planId ? await this.plans.findOne({ where: { id: mentor.planId } }) : null;
    const used = await this.members.count({ where: { mentorId } });
    const max = plan?.maxTeamMembers ?? 0;
    if (max !== -1 && used >= max) {
      throw new BadRequestException(`Limite do plano atingido (${used}/${max} membros). Faça upgrade para adicionar mais.`);
    }

    const email = dto.email.toLowerCase().trim();
    const exists = await this.users.findOne({ where: { email } });
    if (exists) throw new BadRequestException('Já existe um usuário com este email');

    const password = uuid().slice(0, 10);
    const user = await this.users.save(this.users.create({
      name: dto.name,
      email,
      phone: dto.phone,
      passwordHash: await bcrypt.hash(password, 10),
      role: UserRole.MENTOR_TEAM,
      status: UserStatus.ACTIVE,
      parentMentorId: mentorId,
      teamRole: dto.role,
    }));

    const member = await this.members.save(this.members.create({
      mentorId, userId: user.id, name: dto.name, email, phone: dto.phone, role: dto.role, status: TeamStatus.ACTIVE,
    }));

     // Email de boas vindas - resolve custom domain se houver
     let appUrl = process.env.APP_URL || 'http://localhost:8080';
     if (mentor?.customDomain) {
       appUrl = `https://${mentor.customDomain}`;
     }
     const loginUrl = `${appUrl.replace(/\/$/, '')}/login`;
     const brandName = mentor?.brandName || mentor?.name || 'MentorFlow';
     const firstName = (dto.name || '').split(' ')[0];
 
     const html = this.mail.generateStandardTemplate({
       brandName,
       brandLogoUrl: mentor?.brandLogoUrl,
       brandPrimaryColor: mentor?.brandPrimaryColor,
       firstName,
       message: `Você foi adicionado como <b>${this.roleLabel(dto.role)}</b> na equipe de <b>${brandName}</b>. Seja bem-vindo(a) ao time!`,
       email,
       password,
       loginUrl,
     });
 
     this.mail.send({
       to: email,
       subject: `Você foi convidado para a equipe de ${brandName}`,
       html,
     }).catch(() => null);

    return member;
  }

  @Auth('mentor', 'super_admin')
  @Patch(':id')
  async update(@TenantId() mentorId: string, @Param('id') id: string, @Body() dto: { role?: TeamRole; status?: TeamStatus; name?: string; phone?: string }) {
    const m = await this.members.findOne({ where: { id, mentorId } });
    if (!m) throw new BadRequestException('Membro não encontrado');
    await this.members.update(id, dto);
    if (dto.role) await this.users.update(m.userId, { teamRole: dto.role });
    if (dto.status === TeamStatus.SUSPENDED) await this.users.update(m.userId, { status: UserStatus.SUSPENDED });
    if (dto.status === TeamStatus.ACTIVE) await this.users.update(m.userId, { status: UserStatus.ACTIVE });
    return this.members.findOne({ where: { id } });
  }

  @Auth('mentor', 'super_admin')
  @Delete(':id')
  async remove(@TenantId() mentorId: string, @Param('id') id: string) {
    const m = await this.members.findOne({ where: { id, mentorId } });
    if (!m) return { ok: true };
    await this.members.delete(id);
    await this.users.delete(m.userId);
    return { ok: true };
  }

  private roleLabel(r: TeamRole) {
    return { admin: 'Administrador', editor: 'Editor de conteúdo', attendant: 'Atendente' }[r] || r;
  }
}
