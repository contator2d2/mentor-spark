import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushSubscription } from '../../entities/push-subscription.entity';

/**
 * Web Push via VAPID.
 * Usa o pacote web-push se disponível; caso contrário, faz log e segue.
 * Configure VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…).
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private webpush: any = null;
  private configured = false;

  constructor(@InjectRepository(PushSubscription) private subs: Repository<PushSubscription>) {
    try {
      this.webpush = require('web-push');
      const pub = process.env.VAPID_PUBLIC_KEY;
      const priv = process.env.VAPID_PRIVATE_KEY;
      const subj = process.env.VAPID_SUBJECT || 'mailto:noreply@mentorflow.local';
      if (pub && priv) {
        this.webpush.setVapidDetails(subj, pub, priv);
        this.configured = true;
      } else {
        this.logger.warn('VAPID keys ausentes — push apenas in-app (sem entrega).');
      }
    } catch {
      this.logger.warn('Pacote web-push não instalado — push apenas in-app.');
    }
  }

  async sendToUser(userId: string, payload: { title: string; body?: string; url?: string }) {
    if (!this.configured) return;
    const list = await this.subs.find({ where: { userId } });
    for (const s of list) {
      try {
        await this.webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        );
      } catch (e: any) {
        // 410 = inscrição expirada → remove
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await this.subs.delete({ id: s.id });
        } else {
          this.logger.warn(`push falhou: ${e.message}`);
        }
      }
    }
  }
}
