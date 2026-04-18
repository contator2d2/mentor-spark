import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../../entities/message.entity';
import { MessageTemplate, MessageTemplateCategory } from '../../entities/message-template.entity';
import { MessageBroadcast } from '../../entities/message-broadcast.entity';
import { Lead } from '../../entities/lead.entity';
import { User } from '../../entities/user.entity';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { MailService } from '../../shared/mail.service';
import { IntegrationsModule } from '../integrations/integrations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MessageChannel } from '../../entities/message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, MessageTemplate, MessageBroadcast, Lead, User]),
    IntegrationsModule,
    NotificationsModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService, MailService],
  exports: [MessagesService],
})
export class MessagesModule implements OnModuleInit {
  constructor(@InjectRepository(MessageTemplate) private templates: Repository<MessageTemplate>) {}

  async onModuleInit() {
    const count = await this.templates.count({ where: { isLibrary: true } });
    if (count > 0) return;
    const seeds = LIBRARY_SEEDS;
    for (const s of seeds) {
      await this.templates.save(this.templates.create({ ...s, isLibrary: true, mentorId: null, enabled: true }));
    }
  }
}

const LIBRARY_SEEDS: Array<Partial<MessageTemplate>> = [
  // WhatsApp
  { name: 'Boas-vindas (WhatsApp)', channel: MessageChannel.WHATSAPP, category: MessageTemplateCategory.WELCOME,
    body: 'Olá {{primeiro_nome}}! Aqui é {{mentor}}. Que bom te ter por aqui 🙌\n\nEm breve te envio mais informações. Qualquer dúvida, é só responder esta mensagem.' },
  { name: 'Follow-up 24h (WhatsApp)', channel: MessageChannel.WHATSAPP, category: MessageTemplateCategory.FOLLOWUP,
    body: 'Oi {{primeiro_nome}}, tudo bem? Passando para saber se conseguiu ver o material que enviei. Posso te ajudar com algo?' },
  { name: 'Confirmação de evento (WhatsApp)', channel: MessageChannel.WHATSAPP, category: MessageTemplateCategory.EVENT,
    body: 'Olá {{primeiro_nome}}! Sua presença no evento está confirmada ✅\n\nAcesse seu ingresso: {{link_ingresso}}\nAté lá!' },
  { name: 'Lembrete 1h antes (WhatsApp)', channel: MessageChannel.WHATSAPP, category: MessageTemplateCategory.REMINDER,
    body: '{{primeiro_nome}}, em 1h começamos! Já está tudo pronto? Qualquer dúvida, me chame por aqui.' },
  { name: 'Reengajamento (WhatsApp)', channel: MessageChannel.WHATSAPP, category: MessageTemplateCategory.REENGAGE,
    body: 'Oi {{primeiro_nome}}! Faz um tempo que não falamos. Quero entender se ainda faz sentido conversarmos sobre {{empresa}}. Topa marcar 15 min?' },
  { name: 'Agradecimento pós-reunião (WhatsApp)', channel: MessageChannel.WHATSAPP, category: MessageTemplateCategory.THANKYOU,
    body: '{{primeiro_nome}}, obrigado pela conversa hoje! Em breve te envio o resumo e os próximos passos.' },
  { name: 'Convite para diagnóstico (WhatsApp)', channel: MessageChannel.WHATSAPP, category: MessageTemplateCategory.SALES,
    body: 'Oi {{primeiro_nome}}! Preparei um diagnóstico rápido (5 min) para entender melhor o momento da {{empresa}}. Posso te enviar o link?' },

  // Email
  { name: 'Boas-vindas (Email)', channel: MessageChannel.EMAIL, category: MessageTemplateCategory.WELCOME,
    subject: 'Bem-vindo(a), {{primeiro_nome}}!',
    body: 'Olá {{primeiro_nome}},\n\nÉ um prazer ter você por aqui. Sou {{mentor}} e vou te acompanhar nessa jornada.\n\nEm breve compartilho os próximos passos.\n\nAbraço,\n{{mentor}}' },
  { name: 'Follow-up de proposta (Email)', channel: MessageChannel.EMAIL, category: MessageTemplateCategory.FOLLOWUP,
    subject: 'Sobre nossa proposta — {{empresa}}',
    body: 'Olá {{primeiro_nome}},\n\nGostaria de saber se conseguiu analisar a proposta. Estou à disposição para esclarecer qualquer ponto.\n\nAbraço,\n{{mentor}}' },
  { name: 'Convite para evento (Email)', channel: MessageChannel.EMAIL, category: MessageTemplateCategory.EVENT,
    subject: 'Você está convidado(a)',
    body: 'Olá {{primeiro_nome}},\n\nQuero te convidar para um evento que estou organizando. Acredito que pode agregar muito ao momento da {{empresa}}.\n\nGarante sua vaga: {{link_evento}}\n\nAbraço,\n{{mentor}}' },

  // In-app
  { name: 'Notificação de conteúdo liberado', channel: MessageChannel.IN_APP, category: MessageTemplateCategory.ONBOARDING,
    subject: 'Novo conteúdo disponível',
    body: 'Olá {{primeiro_nome}}! Liberei um novo conteúdo para você. Acesse a área de conteúdos para ver.' },
  { name: 'Lembrete de teste pendente', channel: MessageChannel.IN_APP, category: MessageTemplateCategory.REMINDER,
    subject: 'Você tem um teste pendente',
    body: '{{primeiro_nome}}, você tem um teste aguardando resposta. Leva poucos minutos!' },
];
