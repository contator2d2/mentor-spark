import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter() {
    if (this.transporter) return this.transporter;
    const host = process.env.SMTP_HOST;
    if (!host) {
      this.logger.warn('SMTP não configurado — emails serão apenas logados.');
      return null;
    }
    this.transporter = nodemailer.createTransport({
      host,
      port: +(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
    return this.transporter;
  }

  async send(opts: { to: string; subject: string; html: string; text?: string }) {
    const t = this.getTransporter();
    if (!t) {
      this.logger.log(`[MOCK EMAIL] to=${opts.to} subject="${opts.subject}"`);
      return { mocked: true };
    }
    const info = await t.sendMail({
      from: process.env.SMTP_FROM || 'noreply@mentorflow.local',
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    return { messageId: info.messageId };
  }
}
