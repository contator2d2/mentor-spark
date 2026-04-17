import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, IsNull } from 'typeorm';
import { Notification } from '../../entities/notification.entity';
import { MailService } from '../../shared/mail.service';

/**
 * Serviço de criação + despacho de notificações.
 * Cria a notificação in-app e, opcionalmente, envia por email/WhatsApp.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification) private repo: Repository<Notification>,
    private mail: MailService,
  ) {}

  async create(data: {
    userId: string;
    type: string;
    title: string;
    body?: string;
    link?: string;
    email?: string; // se informado, envia email
  }) {
    const notif = await this.repo.save(this.repo.create({
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body,
      link: data.link,
    }));

    // Disparo email (fire-and-forget)
    if (data.email) {
      this.mail.send({
        to: data.email,
        subject: data.title,
        html: `<p>${data.body || data.title}</p>${data.link ? `<p><a href="${data.link}">Ver mais</a></p>` : ''}`,
      }).catch((e) => this.logger.warn(`Email falhou: ${e.message}`));
    }

    return notif;
  }
}
