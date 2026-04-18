import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStage } from '../../entities/lead.entity';
import { AuthService } from '../auth/auth.service';
import { User, UserStatus } from '../../entities/user.entity';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectRepository(User) private users: Repository<User>,
    private authService: AuthService,
  ) {}

  list(mentorId: string, filter?: { stage?: LeadStage; q?: string }) {
    const qb = this.leads.createQueryBuilder('l').where('l.mentorId = :mentorId', { mentorId }).orderBy('l.updatedAt', 'DESC');
    if (filter?.stage) qb.andWhere('l.stage = :stage', { stage: filter.stage });
    if (filter?.q) qb.andWhere('(l.name ILIKE :q OR l.email ILIKE :q OR l.company ILIKE :q)', { q: `%${filter.q}%` });
    return qb.getMany();
  }

  async getById(mentorId: string, id: string) {
    const lead = await this.leads.findOne({ where: { id, mentorId } });
    if (!lead) throw new NotFoundException('Lead não encontrado');
    return lead;
  }

  async update(mentorId: string, id: string, dto: Partial<Lead>) {
    await this.getById(mentorId, id);
    await this.leads.update(id, dto);
    return this.getById(mentorId, id);
  }

  async createFromCapture(params: {
    mentorId: string;
    mentorBrand: string;
    name: string;
    email: string;
    phone?: string;
    company?: string;
    revenue?: number;
    source?: string;
    eventId?: string;
  }) {
    // Cria usuário PROSPECT + envia email com senha
    const { user, generatedPassword } = await this.authService.createProspectUser({
      mentorId: params.mentorId,
      name: params.name,
      email: params.email,
      phone: params.phone,
      company: params.company,
      revenue: params.revenue,
    });

    // Verifica se já existe lead com o mesmo email para este mentor
    let lead = await this.leads.findOne({ where: { mentorId: params.mentorId, email: params.email.toLowerCase() } });
    if (!lead) {
      lead = this.leads.create({
        mentorId: params.mentorId,
        userId: user.id,
        name: params.name,
        email: params.email.toLowerCase(),
        phone: params.phone,
        company: params.company,
        revenue: params.revenue,
        source: params.source || 'capture',
        eventId: params.eventId,
        stage: LeadStage.NEW,
      });
      await this.leads.save(lead);
    } else if (params.eventId && !lead.eventId) {
      lead.eventId = params.eventId;
      await this.leads.save(lead);
    }

    if (generatedPassword) {
      await this.authService.sendWelcomeEmail(params.email, params.name, generatedPassword, params.mentorBrand);
    }

    return { lead, accountCreated: !!generatedPassword };
  }

  async stats(mentorId: string) {
    const counts = await this.leads
      .createQueryBuilder('l')
      .select('l.stage', 'stage')
      .addSelect('COUNT(*)', 'count')
      .where('l.mentorId = :mentorId', { mentorId })
      .groupBy('l.stage')
      .getRawMany();
    const byStage: Record<string, number> = {};
    counts.forEach((r) => (byStage[r.stage] = +r.count));
    const total = Object.values(byStage).reduce((a, b) => a + b, 0);
    const clients = byStage[LeadStage.CLIENT] || 0;
    return { total, byStage, conversion: total ? Math.round((clients / total) * 1000) / 10 : 0 };
  }
}
