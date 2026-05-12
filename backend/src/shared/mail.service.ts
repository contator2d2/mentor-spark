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

   async send(opts: { to: string; subject: string; html: string; text?: string; from?: string }) {
    const t = this.getTransporter();
    if (!t) {
      this.logger.log(`[MOCK EMAIL] to=${opts.to} subject="${opts.subject}"`);
      return { mocked: true };
    }
    const info = await t.sendMail({
       from: opts.from || process.env.SMTP_FROM || 'noreply@mentorflow.local',
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    return { messageId: info.messageId };
  }

   generateStandardTemplate(opts: {
     brandName: string;
     brandLogoUrl?: string;
     brandPrimaryColor?: string;
     firstName: string;
     message: string;
     email: string;
     password?: string;
     loginUrl: string;
     footerText?: string;
   }) {
     const primaryColor = opts.brandPrimaryColor || '#0f172a';
     let contentSection = '';
     if (opts.password) {
       contentSection = `
         <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; margin: 32px 0; border: 1px solid #e2e8f0;">
           <p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Suas credenciais:</p>
           <p style="margin: 0 0 8px 0; font-size: 16px; color: #1e293b;"><strong>E-mail:</strong> ${opts.email}</p>
           <p style="margin: 0; font-size: 16px; color: #1e293b;"><strong>Senha temporária:</strong> <code style="background: #ffffff; padding: 4px 10px; border-radius: 6px; font-weight: bold; border: 1px solid #cbd5e1; letter-spacing: 1px; color: ${primaryColor};">${opts.password}</code></p>
         </div>`;
     } else if (opts.message.includes('Use o email') || opts.message.includes('Use o e-mail')) {
       // Se a mensagem já contém a instrução de login, não adicionamos de novo
       contentSection = '';
     } else if (opts.email && opts.loginUrl) {
       // Para outros emails que podem precisar de um lembrete de acesso, mas de forma discreta
       contentSection = `<div style="margin: 24px 0; padding-top: 24px; border-top: 1px solid #f1f5f9; font-size: 14px; color: #64748b;">
         Acesse sua conta em <a href="${opts.loginUrl}" style="color: ${primaryColor}; text-decoration: underline;">${opts.loginUrl}</a> usando seu e-mail <b>${opts.email}</b>.
       </div>`;
     }

     const logoSection = opts.brandLogoUrl
       ? `<img src="${opts.brandLogoUrl}" alt="${opts.brandName}" style="max-height: 48px; max-width: 200px; margin-bottom: 16px;">`
       : `<h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">${opts.brandName}</h2>`;

     const securityNote = opts.password
       ? `<p style="color: #64748b; font-size: 13px; margin-top: 40px; text-align: center; font-style: italic;">
           Por segurança, você será solicitado a criar uma nova senha pessoal no seu primeiro acesso.
         </p>`
       : '';

     return `
       <div style="background-color: #f8fafc; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
         <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
           <!-- Header -->
           <div style="background-color: ${primaryColor}; padding: 40px 32px; text-align: center;">
             ${logoSection}
           </div>
           
           <!-- Content -->
           <div style="padding: 40px; color: #334155; line-height: 1.6;">
             <h1 style="font-size: 26px; margin-top: 0; color: #0f172a; font-weight: 700; letter-spacing: -0.025em;">Olá, ${opts.firstName} 👋</h1>
             <div style="font-size: 17px; color: #475569;">${opts.message}</div>
             
             ${contentSection}
             
             <div style="text-align: center; margin: 40px 0;">
               <a href="${opts.loginUrl}" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                 Acessar Plataforma
               </a>
             </div>
             
             ${securityNote}
           </div>
           
           <!-- Footer -->
           <div style="background: #f8fafc; padding: 32px; text-align: center; border-top: 1px solid #f1f5f9;">
             <p style="margin: 0; color: #94a3b8; font-size: 13px; font-weight: 500;">
               © 2026 ${opts.brandName}. ${opts.footerText || 'Todos os direitos reservados.'}
             </p>
           </div>
         </div>
       </div>
     `;
   }
}
