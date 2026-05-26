 import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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
  private lastNotificationMap = new Map<string, number>();
  
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
 
    // Se for agência e não for admin, filtra apenas as que ela é responsável
    if (user?.role === 'mentor_team' && user?.teamRole === 'agency' && user?.admin !== true) {
      where.agencyId = user.sub;
    }
 
     const demands = await this.repo.find({
       where,
       relations: ['responsible', 'agency'],
       order: { createdAt: 'DESC' },
     });

     // Popular múltiplos responsáveis
     const allResponsibleIds = Array.from(new Set(demands.flatMap(d => d.responsibleIds || [])));
     if (allResponsibleIds.length > 0) {
       const users = await this.users.find({
         where: { id: In(allResponsibleIds) },
       });
       const userMap = new Map(users.map(u => [u.id, u]));
       return demands.map(d => ({
         ...d,
         responsibles: (d.responsibleIds || []).map(id => userMap.get(id)).filter(Boolean),
       }));
     }

     return demands;
   }

  async findOne(mentorId: string, id: string) {
    const demand = await this.repo.findOne({
      where: { id, mentorId },
      relations: ['responsible', 'agency'],
    });
    if (!demand) throw new NotFoundException('Demanda não encontrada');

    let responsibles: User[] = [];
    if (demand.responsibleIds && demand.responsibleIds.length > 0) {
      responsibles = await this.users.find({
        where: { id: In(demand.responsibleIds) },
      });
    }


    
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

    return { ...demand, versions, comments, responsibles };
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
      const demand = await this.repo.findOne({ where: { id, mentorId }, relations: ['agency', 'responsible'] });
     if (!demand) throw new NotFoundException();
     
     const oldStatus = demand.status;
     const oldAgencyId = demand.agencyId;
 
     if (dto.desiredDeadline) dto.desiredDeadline = new Date(dto.desiredDeadline);
     if (dto.definedDeadline) dto.definedDeadline = new Date(dto.definedDeadline);
     
     Object.assign(demand, dto);
     const updated = await this.repo.save(demand);
 
     if (updated.agencyId || updated.responsibleId) {
       if (oldStatus !== updated.status) {
         await this.notifyAgency(mentorId, updated, 'Alteração de Status', `O status da demanda "${updated.title}" foi alterado para: ${updated.status}.`);
        } else if ((!oldAgencyId && updated.agencyId) || (!demand.responsibleId && updated.responsibleId)) {
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
    const demand = await this.repo.findOne({ where: { id: demandId, mentorId }, relations: ['responsible', 'agency'] });
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
    
    const updatedDemand = { ...demand, status: DemandStatus.WAITING_FEEDBACK };
    if (demand.status === DemandStatus.PRODUCTION || demand.status === DemandStatus.ADJUSTMENTS) {
        await this.repo.update(demandId, { status: DemandStatus.WAITING_FEEDBACK });
        // Notifica o responsável original/mentor que uma nova prova subiu
        if (demand.responsibleId) {
          await this.notifyAgency(mentorId, updatedDemand as any, 'Nova Prova Enviada', `Uma nova versão/prova foi enviada para a demanda "${demand.title}".`);
        }
    }

    return version;
  }

   async addComment(mentorId: string, demandId: string, userId: string, dto: any) {
      const demand = await this.repo.findOne({ where: { id: demandId, mentorId }, relations: ['agency', 'responsible'] });
     if (!demand) throw new NotFoundException();
 
     const comment = this.comments.create({
       demandId,
       userId,
       text: dto.text,
       attachments: dto.attachments,
     });
 
     const saved = await this.comments.save(comment);
 
      // Notifica a outra parte (se mentor comentou, notifica agência; se agência comentou, notifica mentor/responsável)
      const attachmentInfo = (dto.attachments && dto.attachments.length > 0) ? ` (com ${dto.attachments.length} anexo(s))` : '';
      
      if (demand.agencyId && demand.agencyId !== userId) {
        await this.notifyAgency(mentorId, demand, 'Novo Comentário', `Um novo comentário foi adicionado na demanda "${demand.title}"${attachmentInfo}.`);
      } else if (demand.responsibleId && demand.responsibleId !== userId) {
        await this.notifyAgency(mentorId, demand, 'Novo Comentário', `A agência adicionou um comentário na demanda "${demand.title}"${attachmentInfo}.`);
      }
 
     return saved;
   }
 
    private async notifyAgency(mentorId: string, demand: Demand, title: string, message: string) {
      try {
        if (demand.notificationsEnabled === false) {
          this.logger.log(`Notificações desativadas para a demanda ${demand.id}`);
          return;
        }

        const mentor = await this.users.findOne({ where: { id: mentorId } });
        if (!mentor) return;

        const settings = mentor.demandNotificationSettings || { notifyVia: 'both' };
        
        // Anti-spam / Controle de Timer
        const isOverdue = demand.definedDeadline && new Date(demand.definedDeadline).getTime() < Date.now();
        const intervalMs = isOverdue 
          ? (settings.overdueReminderFrequencyHours || 24) * 3600000 
          : 60000; // 1 minuto para movimentações normais

        const lockKey = `${mentorId}:${demand.id}:${title}`;
        const lastSent = this.lastNotificationMap.get(lockKey);
        const now = Date.now();
        
        if (lastSent && now - lastSent < intervalMs) {
          this.logger.warn(`Notificação ignorada (intervalo de ${intervalMs/60000}min não atingido) para demanda ${demand.id}: ${title}`);
          return;
        }
        this.lastNotificationMap.set(lockKey, now);

        const [agency, responsibles] = await Promise.all([
          this.users.findOne({ where: { id: demand.agencyId } }),
          demand.responsibleIds && demand.responsibleIds.length > 0 
            ? this.users.find({ where: { id: In(demand.responsibleIds) } })
            : (demand.responsibleId ? this.users.find({ where: { id: demand.responsibleId } }) : Promise.resolve([])),
        ]);
        
        // Define o alvo da notificação
        const targets = [agency, ...responsibles].filter(t => t && t.id);
        
        const baseUrl = process.env.FRONTEND_URL || 'https://app.gleego.com.br';
        const demandUrl = mentor.customDomain 
          ? `https://${mentor.customDomain}/app/demands/${demand.id}`
          : `${baseUrl}/app/demands/${demand.id}`;

        for (const target of targets) {
          if (!target) continue;

          // Usa as configurações do mentor já carregadas acima
          const notifyVia = settings.notifyVia || 'both';

          // Email
          if (target.email && (notifyVia === 'email' || notifyVia === 'both')) {
            const html = this.mail.generateStandardTemplate({
              brandName: mentor.brandName || mentor.name,
              brandLogoUrl: mentor.brandLogoUrl,
              brandPrimaryColor: mentor.brandPrimaryColor,
              firstName: target.name.split(' ')[0],
              message: `${message}<br><br><b>Demanda:</b> ${demand.title}<br><b>Status:</b> ${demand.status}`,
              email: target.email,
              loginUrl: demandUrl,
            });

            await this.mail.send({
              to: target.email,
              subject: `[${mentor.brandName || 'Mentor'}] ${title}`,
              html,
            }).catch(e => this.logger.error(`Erro email: ${e.message}`));
          }

          // WhatsApp
          if (target.phone && (notifyVia === 'whatsapp' || notifyVia === 'both')) {
            let publicSuffix = '';
            if (demand.status === DemandStatus.WAITING_FEEDBACK) {
              const publicUrl = `${baseUrl}/demands/public/${demand.id}?token=${demand.id}`;
              publicSuffix = `\n\n📢 *Link para o Cliente:* ${publicUrl}`;
            }
            
            const waMessage = `🔔 *${title}*\n\nOlá ${target.name.split(' ')[0]},\n\n${message}\n\n*Demanda:* ${demand.title}\n*Status:* ${demand.status.toUpperCase()}\n\n🔗 *Acessar Painel:* ${demandUrl}${publicSuffix}\n\nEquipe ${mentor.brandName || mentor.name}`;
            await this.whatsapp.sendText(mentorId, target.phone, waMessage).catch(e => this.logger.error(`Erro WhatsApp: ${e.message}`));
          }
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

  async findOnePublic(id: string) {
    const demand = await this.repo.findOne({
      where: { id },
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

  async reviewPublic(id: string, dto: any) {
    const demand = await this.repo.findOne({ where: { id }, relations: ['responsible', 'agency'] });
    if (!demand) throw new NotFoundException();

    const oldStatus = demand.status;
    demand.status = dto.status;
    const updated = await this.repo.save(demand);

    if (dto.comment) {
      // Adiciona comentário do "Cliente (Via Link Público)"
      // Como não temos um userId autenticado, usamos o id do mentor/responsável ou um sistema fixo
      const comment = this.comments.create({
        demandId: id,
        userId: demand.responsibleId || demand.mentorId, // Atribui ao responsável como se fosse nota
        text: `REVISÃO PÚBLICA (${dto.status === DemandStatus.APPROVED ? 'APROVADO' : 'AJUSTES'}): ${dto.comment}`,
      });
      await this.comments.save(comment);
    }

    // Notifica agência sobre a decisão do cliente
    if (demand.agencyId) {
      const action = dto.status === DemandStatus.APPROVED ? 'Aprovada' : 'Ajustes Solicitados';
      await this.notifyAgency(demand.mentorId, updated, `Revisão de Cliente: ${action}`, `O cliente revisou a demanda "${demand.title}" via link público e marcou como: ${action}.`);
    }

    return updated;
  }
}
