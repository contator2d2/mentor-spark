import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';
import { Company } from '../../entities/company.entity';
import { Lead } from '../../entities/lead.entity';
import { Meeting } from '../../entities/meeting.entity';
import { Contract } from '../../entities/contract.entity';
import { AuthService } from '../auth/auth.service';
import { User, UserRole, UserStatus } from '../../entities/user.entity';

@ApiTags('companies')
@ApiBearerAuth()
@Controller('companies')
export class CompaniesController {
  constructor(
    @InjectRepository(Company) private companies: Repository<Company>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectRepository(Meeting) private meetings: Repository<Meeting>,
    @InjectRepository(Contract) private contracts: Repository<Contract>,
    @InjectRepository(User) private users: Repository<User>,
    private auth: AuthService,
  ) {}

  @Auth('mentor', 'super_admin')
  @Get()
  list(@TenantId() mentorId: string) {
    return this.companies.find({ where: { mentorId }, order: { updatedAt: 'DESC' } });
  }

  @Auth('mentor', 'super_admin')
  @Post()
  async create(@TenantId() mentorId: string, @Body() dto: Partial<Company>) {
    if (!dto.legalName) throw new BadRequestException('legalName é obrigatório');
    const c = this.companies.create({ ...dto, mentorId });
    return this.companies.save(c);
  }

  @Auth('mentor', 'super_admin')
  @Get(':id')
  async get(@TenantId() mentorId: string, @Param('id') id: string) {
    const company = await this.companies.findOne({ where: { id, mentorId } });
    if (!company) throw new BadRequestException('Empresa não encontrada');

    const partners = await this.leads.find({
      where: { companyId: id, mentorId },
      order: { createdAt: 'ASC' },
    });

    const partnerIds = partners.map((p) => p.id);
    const meetings = partnerIds.length
      ? await this.meetings
          .createQueryBuilder('m')
          .where('m.mentorId = :mentorId', { mentorId })
          .andWhere('m.leadId IN (:...ids)', { ids: partnerIds })
          .orderBy('m.scheduledAt', 'DESC')
          .getMany()
      : [];

    const contracts = partnerIds.length
      ? await this.contracts
          .createQueryBuilder('c')
          .where('c.mentorId = :mentorId', { mentorId })
          .andWhere('c.leadId IN (:...ids)', { ids: partnerIds })
          .orderBy('c.createdAt', 'DESC')
          .getMany()
      : [];

    // Anota acesso (se cada sócio tem usuário ativo)
    const emails = partners.map((p) => p.email);
    const usersFound = emails.length
      ? await this.users.find({ where: emails.map((email) => ({ email })) })
      : [];
    const userByEmail = new Map(usersFound.map((u) => [u.email, u]));

    return {
      company,
      partners: partners.map((p) => ({
        ...p,
        hasAccess: !!userByEmail.get(p.email),
        accessRole: userByEmail.get(p.email)?.role || null,
      })),
      meetings,
      contracts,
      stats: {
        partnersCount: partners.length,
        meetingsCount: meetings.length,
        contractsCount: contracts.length,
      },
    };
  }

  @Auth('mentor', 'super_admin')
  @Patch(':id')
  async update(@TenantId() mentorId: string, @Param('id') id: string, @Body() dto: Partial<Company>) {
    const c = await this.companies.findOne({ where: { id, mentorId } });
    if (!c) throw new BadRequestException('Empresa não encontrada');
    await this.companies.update(id, dto);
    return this.companies.findOne({ where: { id } });
  }

  @Auth('mentor', 'super_admin')
  @Delete(':id')
  async remove(@TenantId() mentorId: string, @Param('id') id: string) {
    const c = await this.companies.findOne({ where: { id, mentorId } });
    if (!c) throw new BadRequestException('Empresa não encontrada');
    await this.companies.delete(id);
    return { ok: true };
  }

  /**
   * Adiciona um novo sócio à empresa.
   * - Cria um Lead vinculado à empresa
   * - Se grantAccess=true, cria usuário PROSPECT e envia email com senha
   */
  @Auth('mentor', 'super_admin')
  @Post(':id/partners')
  async addPartner(
    @TenantId() mentorId: string,
    @Param('id') companyId: string,
    @Body() dto: {
      name: string;
      email: string;
      phone?: string;
      partnerRole?: string;
      partnerShare?: number;
      cpf?: string;
      grantAccess?: boolean;
    },
  ) {
    const company = await this.companies.findOne({ where: { id: companyId, mentorId } });
    if (!company) throw new BadRequestException('Empresa não encontrada');
    if (!dto.name || !dto.email) throw new BadRequestException('Nome e email são obrigatórios');

    const email = dto.email.toLowerCase();

    // Cria/recupera usuário se grantAccess
    let userId: string | undefined;
    if (dto.grantAccess) {
      const created = await this.auth.createProspectUser({
        mentorId,
        name: dto.name,
        email,
        phone: dto.phone,
        company: company.legalName,
      });
      userId = created.user.id;
      if (created.generatedPassword) {
        const mentor = await this.users.findOne({ where: { id: mentorId } });
        await this.auth.sendWelcomeEmail(email, dto.name, created.generatedPassword, mentor?.brandName || 'MentorFlow');
      }
    }

    const lead = this.leads.create({
      mentorId,
      userId,
      name: dto.name,
      email,
      phone: dto.phone,
      company: company.legalName,
      companyId,
      isPartner: true,
      partnerRole: dto.partnerRole,
      partnerShare: dto.partnerShare,
      cpf: dto.cpf,
      source: 'manual-partner',
    });
    await this.leads.save(lead);
    return lead;
  }

  /** Libera acesso a um sócio existente que ainda não tem login */
  @Auth('mentor', 'super_admin')
  @Post('partners/:leadId/grant-access')
  async grantAccess(@TenantId() mentorId: string, @Param('leadId') leadId: string) {
    const lead = await this.leads.findOne({ where: { id: leadId, mentorId } });
    if (!lead) throw new BadRequestException('Sócio não encontrado');

    const existing = await this.users.findOne({ where: { email: lead.email } });
    if (existing) {
      if (existing.mentorId && existing.mentorId !== mentorId && existing.role !== UserRole.PROSPECT) {
        throw new BadRequestException('Email já pertence a outro mentor.');
      }
      await this.users.update(existing.id, { mentorId, status: UserStatus.ACTIVE });
      await this.leads.update(leadId, { userId: existing.id });
      return { ok: true, userId: existing.id, sentEmail: false };
    }

    const created = await this.auth.createProspectUser({
      mentorId,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
    });
    if (created.generatedPassword) {
      const mentor = await this.users.findOne({ where: { id: mentorId } });
      await this.auth.sendWelcomeEmail(lead.email, lead.name, created.generatedPassword, mentor?.brandName || 'MentorFlow');
    }
    await this.leads.update(leadId, { userId: created.user.id });
    return { ok: true, userId: created.user.id, sentEmail: !!created.generatedPassword };
  }
}
