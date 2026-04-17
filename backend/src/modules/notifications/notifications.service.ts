import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../entities/notification.entity';
import { MailService } from '../../shared/mail.service';
import { PushService } from '../push/push.service';

/**
 * Cria notificação in-app + email (opcional) + push (se assinado).
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification) private repo: Repository<Notification>,
    private mail: MailService,
    private push: PushService,
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

    if (data.email) {
      this.mail.send({
        to: data.email,
        subject: data.title,
        html: `<p>${data.body || data.title}</p>${data.link ? `<p><a href="${data.link}">Ver mais</a></p>` : ''}`,
      }).catch((e) => this.logger.warn(`Email falhou: ${e.message}`));
    }

    this.push.sendToUser(data.userId, {
      title: data.title,
      body: data.body,
      url: data.link,
    }).catch((e) => this.logger.warn(`Push falhou: ${e.message}`));

    return notif;
  }
}
