 import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Demand, DemandStatus } from '../../entities/demand.entity';
import { DemandVersion } from '../../entities/demand-version.entity';
import { DemandComment } from '../../entities/demand-comment.entity';
 import { User } from '../../entities/user.entity';
import { AiService } from '../ai/ai.service';
 import { MailService } from '../../shared/mail.service';
 import { WhatsappService } from '../integrations/whatsapp.service';

@Injectable()
export class DemandsService {
   private readonly logger = new Logger(DemandsService.name);
 
  constructor(
    @InjectRepository(Demand) private repo: Repository<Demand>,
    @InjectRepository(DemandVersion) private versions: Repository<DemandVersion>,
    @InjectRepository(DemandComment) private comments: Repository<DemandComment>,
     @InjectRepository(User) private users: Repository<User>,
    private ai: AiService,
     private mail: MailService,
     private whatsapp: WhatsappService,
  ) {}

   async list(mentorId: string, user?: any) {
     const where: any = { mentorId };
 
     // Se for agência, filtra apenas as que ela é responsável
     if (user?.role === 'mentor_team' && user?.teamRole === 'agency') {
       where.agencyId = user.sub;
     }
 
     return this.repo.find({
       where,
       relations: ['responsible', 'agency'],
       order: { createdAt: 'DESC' },
     });
   }

  async findOne(mentorId: string, id: string) {
    const demand = await this.repo.findOne({
      where: { id, mentorId },
      relations: ['responsible', 'agency'],
    });
    if (!demand) throw new NotFoundException('Demanda não encontrada');
    
    const versions = await this.versions.find({
      where: { demandId: id },
      relations: ['creator'],
      order: { versionNumber: 'DESC' },
    });

    const comments = await this.comments.find({
      where: { demandId: id },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });

    return { ...demand, versions, comments };
  }

  async create(mentorId: string, dto: any) {
    const demand = this.repo.create({
      ...dto,
      mentorId,
      status: DemandStatus.NEW,
      desiredDeadline: dto.desiredDeadline ? new Date(dto.desiredDeadline) : undefined,
    });
    return this.repo.save(demand);
  }

   async update(mentorId: string, id: string, dto: any) {
     const demand = await this.repo.findOne({ where: { id, mentorId }, relations: ['agency'] });
     if (!demand) throw new NotFoundException();
     
     const oldStatus = demand.status;
     const oldAgencyId = demand.agencyId;
 
     if (dto.desiredDeadline) dto.desiredDeadline = new Date(dto.desiredDeadline);
     if (dto.definedDeadline) dto.definedDeadline = new Date(dto.definedDeadline);
     
     Object.assign(demand, dto);
     const updated = await this.repo.save(demand);
 
     if (updated.agencyId) {
       if (oldStatus !== updated.status) {
         await this.notifyAgency(mentorId, updated, 'Alteração de Status', `O status da demanda "${updated.title}" foi alterado para: ${updated.status}.`);
       } else if (!oldAgencyId && updated.agencyId) {
         await this.notifyAgency(mentorId, updated, 'Nova Demanda Atribuída', `Você foi definido como responsável pela demanda: ${updated.title}.`);
       }
     }
 
     return updated;
   }

  async delete(mentorId: string, id: string) {
    await this.repo.delete({ id, mentorId } as any);
    return { ok: true };
  }

  async addVersion(mentorId: string, demandId: string, userId: string, dto: any) {
    const demand = await this.repo.findOne({ where: { id: demandId, mentorId } });
    if (!demand) throw new NotFoundException();

    const last = await this.versions.findOne({
      where: { demandId },
      order: { versionNumber: 'DESC' },
    });
    const nextVersion = (last?.versionNumber ?? 0) + 1;

    const version = this.versions.create({
      demandId,
      createdByUserId: userId,
      versionNumber: nextVersion,
      files: dto.files,
      comment: dto.comment,
    });

    await this.versions.save(version);
    
    if (demand.status === DemandStatus.PRODUCTION || demand.status === DemandStatus.ADJUSTMENTS) {
        await this.repo.update(demandId, { status: DemandStatus.WAITING_FEEDBACK });
    }

    return version;
  }

   async addComment(mentorId: string, demandId: string, userId: string, dto: any) {
     const demand = await this.repo.findOne({ where: { id: demandId, mentorId }, relations: ['agency'] });
     if (!demand) throw new NotFoundException();
 
     const comment = this.comments.create({
       demandId,
       userId,
       text: dto.text,
       attachments: dto.attachments,
     });
 
     const saved = await this.comments.save(comment);
 
     // Se quem comentou não foi a agência, notifica a agência
     if (demand.agencyId && demand.agencyId !== userId) {
       await this.notifyAgency(mentorId, demand, 'Novo Comentário', `Um novo comentário foi adicionado na demanda "${demand.title}".`);
     }
 
     return saved;
   }
 
   private async notifyAgency(mentorId: string, demand: Demand, title: string, message: string) {
     try {
       const [mentor, agency] = await Promise.all([
         this.users.findOne({ where: { id: mentorId } }),
         this.users.findOne({ where: { id: demand.agencyId } }),
       ]);
 
       if (!agency || !mentor) return;
 
       // Email
       if (agency.email) {
         const baseUrl = process.env.FRONTEND_URL || 'https://app.gleego.com.br';
         const loginUrl = mentor.customDomain 
           ? `https://${mentor.customDomain}/login`
           : `${baseUrl}/login`;
 
         const html = this.mail.generateStandardTemplate({
           brandName: mentor.brandName || mentor.name,
           brandLogoUrl: mentor.brandLogoUrl,
           brandPrimaryColor: mentor.brandPrimaryColor,
           firstName: agency.name.split(' ')[0],
           message: `${message}<br><br><b>Demanda:</b> ${demand.title}<br><b>Status:</b> ${demand.status}`,
           email: agency.email,
           loginUrl,
         });
 
         await this.mail.send({
           to: agency.email,
           subject: `[${mentor.brandName || 'Mentor'}] ${title}`,
           html,
         }).catch(e => this.logger.error(`Erro email agência: ${e.message}`));
       }
 
       // WhatsApp
       if (agency.phone) {
         const waMessage = `🔔 *${title}*\n\nOlá ${agency.name.split(' ')[0]},\n\n${message}\n\n*Demanda:* ${demand.title}\n*Status:* ${demand.status.toUpperCase()}\n\nEquipe ${mentor.brandName || mentor.name}`;
         await this.whatsapp.sendText(mentorId, agency.phone, waMessage).catch(e => this.logger.error(`Erro WhatsApp agência: ${e.message}`));
       }
     } catch (err) {
       this.logger.error(`Erro geral notifyAgency: ${err.message}`);
     }
   }

  async generateBriefing(mentorId: string, dto: { title: string; type: string; description?: string }) {
    const prompt = `Gerar um briefing detalhado para uma demanda de marketing do tipo "${dto.type}".
Título: ${dto.title}
Descrição inicial: ${dto.description || 'Não informada'}

Retorne um JSON com os campos: objective, targetAudience, essentialItems (lista), style (descrição do tom/estilo).`;

    const raw = await this.ai.chat('Você é um especialista em marketing e produção de conteúdo.', prompt, { mentorId, useCase: 'demand_briefing' });
    try {
      const jsonStr = raw.replace(/^```json\s*|```$/g, '').trim();
      return JSON.parse(jsonStr);
    } catch {
      return { objective: raw };
    }
  }
}
