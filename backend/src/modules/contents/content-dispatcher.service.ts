import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, IsNull } from 'typeorm';
import { Content } from '../../entities/content.entity';
import { Lead } from '../../entities/lead.entity';
import { User, UserRole } from '../../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { WhatsappService } from '../integrations/whatsapp.service';
import { PlansService } from '../plans/plans.service';

/**
 * Worker que roda a cada 5min:
 * 1. Procura conteúdos com scheduledAt <= now e published=true que ainda não foram entregues
 * 2. Notifica leads/mentorados elegíveis (audience) via in-app + email + whatsapp (se plano permitir)
 *
 * Marcamos entregue gravando scheduledAt como null após disparo (idempotente).
 */
@Injectable()
export class ContentDispatcher {
  private readonly logger = new Logger(ContentDispatcher.name);

  constructor(
    @InjectRepository(Content) private contents: Repository<Content>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectRepository(User) private users: Repository<User>,
    private notifs: NotificationsService,
    private whatsapp: WhatsappService,
    private plans: PlansService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async dispatchScheduled() {
    const now = new Date();
    const due = await this.contents
      .createQueryBuilder('c')
      .where('c.published = true')
      .andWhere('c.scheduledAt IS NOT NULL')
      .andWhere('c.scheduledAt <= :now', { now })
      .getMany();

    if (!due.length) return;
    this.logger.log(`Despachando ${due.length} conteúdo(s) agendado(s)`);

    for (const content of due) {
      try {
        await this.dispatchContent(content);
        // marca entregue (limpa scheduledAt para não disparar de novo)
        content.scheduledAt = null as any;
        await this.contents.save(content);
      } catch (e: any) {
        this.logger.error(`Falha ao dispatch ${content.id}: ${e.message}`);
      }
    }
  }

  private async dispatchContent(content: Content) {
    const audience = typeof content.audience === 'string' ? content.audience : 'all';
    // Busca destinatários (leads do mentor)
    const leads = await this.leads.find({ where: { mentorId: content.mentorId } });
    const targets = leads.filter((l) => {
      if (audience === 'all') return true;
      if (audience === 'prospects') return !l.userId;
      if (audience === 'clients') return !!l.userId;
      return true;
    });

    const allowWhatsapp = await this.plans.hasFeature(content.mentorId, 'allowWhatsapp').catch(() => false);

    for (const lead of targets) {
      // In-app + email (se houver userId e email)
      if (lead.userId) {
        await this.notifs.create({
          userId: lead.userId,
          type: 'content',
          title: `Novo conteúdo: ${content.title}`,
          body: content.body?.slice(0, 200),
          link: content.url || `/me/contents`,
          email: lead.email,
        }).catch(() => {});
      }
      // WhatsApp
      if (allowWhatsapp && lead.phone) {
        const msg = `📚 *${content.title}*\n\n${content.body?.slice(0, 300) || ''}${content.url ? `\n\n🔗 ${content.url}` : ''}`;
        await this.whatsapp.sendText(content.mentorId, lead.phone, msg).catch(() => {});
      }
    }
  }
}
