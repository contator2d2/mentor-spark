import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, IsNull } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CaptureEvent, EventStatus } from '../../entities/capture-event.entity';
import { EventRegistration, RegistrationStatus, RegistrationPaymentStatus } from '../../entities/event-registration.entity';
import { EventAction, EventActionType } from '../../entities/event-action.entity';
import { Lead, LeadStage } from '../../entities/lead.entity';
import { TestTemplate } from '../../entities/test-template.entity';
import { TestAssignment } from '../../entities/test-assignment.entity';
import { User } from '../../entities/user.entity';
import { Company } from '../../entities/company.entity';
import { EventTicketTier } from '../../entities/event-ticket-tier.entity';
import { MailService } from '../../shared/mail.service';
import { WhatsappService } from '../integrations/whatsapp.service';
import { PushService } from '../push/push.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LeadsService } from '../leads/leads.service';
import { AiService } from '../ai/ai.service';
import { EventPaymentsService } from './event-payments.service';

function makeSlug(name: string) {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${base || 'evento'}-${rand}`;
}

function makeTicketCode() {
  // 10 chars, fácil de digitar caso scanner falhe
  return Math.random().toString(36).slice(2, 7).toUpperCase() + Math.random().toString(36).slice(2, 7).toUpperCase();
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectRepository(CaptureEvent) private events: Repository<CaptureEvent>,
    @InjectRepository(EventRegistration) private regs: Repository<EventRegistration>,
    @InjectRepository(EventAction) private actions: Repository<EventAction>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectRepository(TestTemplate) private testTemplates: Repository<TestTemplate>,
    @InjectRepository(TestAssignment) private assignments: Repository<TestAssignment>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Company) private companies: Repository<Company>,
    @InjectRepository(EventTicketTier) private tiers: Repository<EventTicketTier>,
    private mail: MailService,
    private whatsapp: WhatsappService,
    private push: PushService,
    private notifications: NotificationsService,
    private leadsService: LeadsService,
    private ai: AiService,
    @Inject(forwardRef(() => EventPaymentsService)) private paymentsSvc: EventPaymentsService,
  ) {}

  // ==================== CRUD ====================
  async list(mentorId: string) {
    const list = await this.events.find({ where: { mentorId }, order: { createdAt: 'DESC' } });
    return Promise.all(
      list.map(async (e) => {
        const total = await this.regs.count({ where: { eventId: e.id } });
        const checkedIn = await this.regs.count({ where: { eventId: e.id, status: RegistrationStatus.CHECKED_IN } });
        const leadsCount = await this.leads.count({ where: { eventId: e.id } });
        const converted = await this.leads.createQueryBuilder('l')
          .where('l.eventId = :id', { id: e.id })
          .andWhere('l.stage = :s', { s: 'client' })
          .getCount();
        return { ...e, registrationsCount: total, checkedInCount: checkedIn, leadsCount, convertedCount: converted };
      }),
    );
  }

  async get(mentorId: string, id: string) {
    const e = await this.events.findOne({ where: { id, mentorId } });
    if (!e) throw new NotFoundException('Evento não encontrado');
    return e;
  }

  async create(mentorId: string, dto: any) {
    const ev = this.events.create({
      mentorId,
      name: dto.name,
      description: dto.description,
      location: dto.location,
      virtualUrl: dto.virtualUrl,
      modality: dto.modality || 'physical',
      status: dto.status || EventStatus.PUBLISHED,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      notes: dto.notes,
      capacity: dto.capacity,
      npsEnabled: dto.npsEnabled ?? true,
      npsDelayHours: dto.npsDelayHours ?? 2,
      npsQuestion: dto.npsQuestion,
      defaultTestTemplateId: dto.defaultTestTemplateId,
      coverImageUrl: dto.coverImageUrl,
      isActive: dto.isActive ?? true,
      isPaid: dto.isPaid ?? false,
      paymentMode: dto.paymentMode || 'optional',
      paymentProviderId: dto.paymentProviderId || null,
      currency: dto.currency || 'BRL',
      slug: makeSlug(dto.name),
    });
    return this.events.save(ev);
  }

  async update(mentorId: string, id: string, dto: any) {
    const e = await this.get(mentorId, id);
    const patch: any = { ...dto };
    if (dto.startsAt !== undefined) patch.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.endsAt !== undefined) patch.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    delete patch.id; delete patch.mentorId; delete patch.slug;
    await this.events.update(id, patch);
    return this.events.findOne({ where: { id } });
  }

  async remove(mentorId: string, id: string) {
    await this.get(mentorId, id);
    await this.regs.delete({ eventId: id });
    await this.actions.delete({ eventId: id });
    await this.events.delete(id);
    return { ok: true };
  }

  // ==================== Inscrições ====================
  async listRegistrations(mentorId: string, eventId: string) {
    await this.get(mentorId, eventId);
    return this.regs.find({ where: { eventId }, order: { createdAt: 'DESC' } });
  }

  /** Inscrição via formulário público */
  async publicRegister(
    eventSlug: string,
    dto: { name: string; email: string; phone?: string; company?: string; role?: string; tierId?: string; cpfCnpj?: string },
  ) {
    const event = await this.events.findOne({ where: { slug: eventSlug } });
    if (!event) throw new NotFoundException('Evento não encontrado');
    if (!event.isActive || event.status === EventStatus.CANCELLED) {
      throw new BadRequestException('Inscrições encerradas para este evento');
    }
    if (event.capacity) {
      const count = await this.regs.count({ where: { eventId: event.id } });
      if (count >= event.capacity) throw new BadRequestException('Evento lotado');
    }

    // Resolve lote (se evento pago)
    let tier: EventTicketTier | null = null;
    if (event.isPaid) {
      const allTiers = await this.tiers.find({ where: { eventId: event.id, isActive: true }, order: { position: 'ASC' } });
      if (dto.tierId) {
        tier = allTiers.find((t) => t.id === dto.tierId) || null;
        if (!tier) throw new BadRequestException('Lote inválido');
      } else if (allTiers.length > 0) {
        tier = allTiers[0];
      }
      if (tier?.quantity && tier.sold >= tier.quantity) {
        throw new BadRequestException('Lote esgotado');
      }
      if (tier?.availableUntil && new Date(tier.availableUntil) < new Date()) {
        throw new BadRequestException('Lote expirado');
      }
    }

    const email = dto.email.trim().toLowerCase();
    let reg = await this.regs.findOne({ where: { eventId: event.id, email } });
    if (reg) {
      // já inscrito → retorna ticket existente (idempotente). Se evento pago e ainda não pago,
      // tenta gerar checkout novamente.
      let payment = null;
      if (event.isPaid && tier && reg.paymentStatus !== RegistrationPaymentStatus.PAID) {
        payment = await this.paymentsSvc
          .createCheckout({ registration: reg, event, tier, payerCpfCnpj: dto.cpfCnpj })
          .catch((e) => ({ error: e.message }));
      }
      return { event, registration: reg, tier, payment };
    }

    reg = this.regs.create({
      eventId: event.id,
      mentorId: event.mentorId,
      name: dto.name,
      email,
      phone: dto.phone,
      company: dto.company,
      role: dto.role,
      ticketCode: makeTicketCode(),
      status: RegistrationStatus.REGISTERED,
      tierId: tier?.id,
      currency: tier?.currency || event.currency || 'BRL',
      paymentStatus: event.isPaid && tier && tier.priceCents > 0
        ? RegistrationPaymentStatus.PENDING
        : RegistrationPaymentStatus.NOT_REQUIRED,
    });
    await this.regs.save(reg);

    // Gera cobrança se for pago
    let payment = null;
    if (event.isPaid && tier && tier.priceCents > 0) {
      payment = await this.paymentsSvc
        .createCheckout({ registration: reg, event, tier, payerCpfCnpj: dto.cpfCnpj })
        .catch((e) => {
          this.logger.warn(`Checkout falhou: ${e.message}`);
          return { error: e.message };
        });
    }

    // dispara confirmação em background (sem bloquear UI)
    this.sendConfirmation(event, reg).catch((e) => this.logger.warn(`confirmação falhou: ${e.message}`));

    return { event, registration: reg, tier, payment };
  }

  async getRegistrationByTicket(ticketCode: string) {
    const reg = await this.regs.findOne({ where: { ticketCode } });
    if (!reg) throw new NotFoundException('Ticket inválido');
    const event = await this.events.findOne({ where: { id: reg.eventId } });
    return { event, registration: reg };
  }

  async checkIn(mentorId: string, ticketCode: string) {
    const reg = await this.regs.findOne({ where: { ticketCode, mentorId } });
    if (!reg) throw new NotFoundException('Ticket não encontrado');
    if (reg.status === RegistrationStatus.CHECKED_IN) {
      return { ok: true, alreadyCheckedIn: true, registration: reg };
    }
    reg.status = RegistrationStatus.CHECKED_IN;
    reg.checkedInAt = new Date();
    await this.regs.save(reg);
    await this.actions.save(this.actions.create({
      eventId: reg.eventId,
      registrationId: reg.id,
      type: EventActionType.CHECKIN,
      status: 'ok',
      message: `Check-in: ${reg.name}`,
    }));
    return { ok: true, registration: reg };
  }

  async setRegistrationStatus(mentorId: string, eventId: string, regId: string, status: RegistrationStatus) {
    await this.get(mentorId, eventId);
    const reg = await this.regs.findOne({ where: { id: regId, eventId } });
    if (!reg) throw new NotFoundException('Inscrição não encontrada');
    reg.status = status;
    if (status === RegistrationStatus.CHECKED_IN && !reg.checkedInAt) reg.checkedInAt = new Date();
    return this.regs.save(reg);
  }

  async deleteRegistration(mentorId: string, eventId: string, regId: string) {
    await this.get(mentorId, eventId);
    await this.regs.delete({ id: regId, eventId });
    return { ok: true };
  }

  // ==================== Notificações ====================
  private buildPublicBaseUrl() {
    return process.env.PUBLIC_APP_URL || 'http://localhost:5173';
  }

  private async sendConfirmation(event: CaptureEvent, reg: EventRegistration) {
    const baseUrl = this.buildPublicBaseUrl();
    const ticketUrl = `${baseUrl}/e/${event.slug}/ticket/${reg.ticketCode}`;
    const subject = `✅ Inscrição confirmada — ${event.name}`;
    const html = `
      <h2>Sua inscrição está confirmada!</h2>
      <p>Olá ${reg.name},</p>
      <p>Você está inscrito no evento <b>${event.name}</b>.</p>
      ${event.startsAt ? `<p><b>Quando:</b> ${new Date(event.startsAt).toLocaleString('pt-BR')}</p>` : ''}
      ${event.location ? `<p><b>Onde:</b> ${event.location}</p>` : ''}
      ${event.virtualUrl ? `<p><b>Sala virtual:</b> <a href="${event.virtualUrl}">${event.virtualUrl}</a></p>` : ''}
      <p>Apresente o QR code abaixo no dia para fazer check-in:</p>
      <p><a href="${ticketUrl}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Abrir meu ingresso</a></p>
      <p style="color:#666;font-size:12px">Código: ${reg.ticketCode}</p>
    `;
    await this.mail.send({ to: reg.email, subject, html }).catch(() => null);

    if (reg.phone) {
      await this.whatsapp.sendText(event.mentorId, reg.phone,
        `✅ Inscrição confirmada em *${event.name}*!\n\n${event.startsAt ? `📅 ${new Date(event.startsAt).toLocaleString('pt-BR')}\n` : ''}${event.location ? `📍 ${event.location}\n` : ''}\n🎟️ Seu ingresso: ${ticketUrl}\nCódigo: ${reg.ticketCode}`,
      ).catch(() => null);
    }

    reg.notificationsSent = { ...(reg.notificationsSent || {}), confirmation: new Date().toISOString() };
    await this.regs.save(reg);

    await this.actions.save(this.actions.create({
      eventId: event.id,
      registrationId: reg.id,
      type: EventActionType.CONFIRMATION,
      channel: 'email+whatsapp',
      status: 'ok',
    }));
  }

  /** Disparo manual em massa: lembrete, custom message, etc. */
  async broadcast(mentorId: string, eventId: string, dto: { subject: string; message: string; channels: string[]; onlyStatus?: RegistrationStatus[] }) {
    const event = await this.get(mentorId, eventId);
    const where: any = { eventId };
    const list = await this.regs.find({ where });
    const targets = dto.onlyStatus?.length ? list.filter((r) => dto.onlyStatus!.includes(r.status)) : list;

    let sent = 0; let failed = 0;
    for (const reg of targets) {
      try {
        const personalized = dto.message.replace(/\{\{nome\}\}/g, reg.name).replace(/\{\{evento\}\}/g, event.name);
        if (dto.channels.includes('email')) {
          await this.mail.send({ to: reg.email, subject: dto.subject, html: `<p>${personalized.replace(/\n/g, '<br>')}</p>` }).catch(() => null);
        }
        if (dto.channels.includes('whatsapp') && reg.phone) {
          await this.whatsapp.sendText(mentorId, reg.phone, personalized).catch(() => null);
        }
        sent++;
      } catch { failed++; }
    }
    await this.actions.save(this.actions.create({
      eventId, type: EventActionType.REMINDER, channel: dto.channels.join('+'), status: 'ok',
      message: `Broadcast: ${sent} enviados, ${failed} falhas`,
    }));
    return { sent, failed, total: targets.length };
  }

  // ==================== Pós-evento: NPS ====================
  /** Cron a cada 10min: dispara NPS para eventos finalizados há X horas. */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async scheduleNpsCron() {
    try {
      const now = new Date();
      const events = await this.events.find({
        where: { npsEnabled: true, status: EventStatus.PUBLISHED },
      });
      for (const ev of events) {
        if (!ev.endsAt) continue;
        const triggerAt = new Date(ev.endsAt.getTime() + ev.npsDelayHours * 3600 * 1000);
        if (triggerAt > now) continue;
        // dispara para quem fez check-in e ainda não recebeu NPS
        const pendings = await this.regs.find({
          where: { eventId: ev.id, status: RegistrationStatus.CHECKED_IN, npsSentAt: IsNull() },
        });
        for (const reg of pendings) {
          await this.sendNps(ev, reg).catch((e) => this.logger.warn(`NPS falhou: ${e.message}`));
        }
      }
    } catch (e: any) {
      this.logger.error(`scheduleNpsCron erro: ${e.message}`);
    }
  }

  async sendNpsManual(mentorId: string, eventId: string) {
    const ev = await this.get(mentorId, eventId);
    const list = await this.regs.find({ where: { eventId, status: RegistrationStatus.CHECKED_IN } });
    let sent = 0;
    for (const reg of list) {
      try { await this.sendNps(ev, reg); sent++; } catch {}
    }
    return { sent, total: list.length };
  }

  private async sendNps(event: CaptureEvent, reg: EventRegistration) {
    const baseUrl = this.buildPublicBaseUrl();
    const url = `${baseUrl}/e/${event.slug}/nps/${reg.ticketCode}`;
    const question = event.npsQuestion || `De 0 a 10, o quanto você recomendaria "${event.name}" para um amigo?`;
    const subject = `Sua opinião sobre ${event.name}`;
    const html = `
      <h2>Como foi sua experiência?</h2>
      <p>Olá ${reg.name},</p>
      <p>${question}</p>
      <p><a href="${url}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Responder agora</a></p>
      <p style="color:#666;font-size:12px">Leva menos de 30 segundos.</p>
    `;
    await this.mail.send({ to: reg.email, subject, html }).catch(() => null);
    if (reg.phone) {
      await this.whatsapp.sendText(event.mentorId, reg.phone, `${question}\n\nResponda em: ${url}`).catch(() => null);
    }
    reg.npsSentAt = new Date();
    await this.regs.save(reg);
    await this.actions.save(this.actions.create({
      eventId: event.id, registrationId: reg.id, type: EventActionType.NPS_SENT, channel: 'email+whatsapp', status: 'ok',
    }));
  }

  async submitNps(ticketCode: string, dto: { score: number; comment?: string }) {
    if (dto.score < 0 || dto.score > 10) throw new BadRequestException('Score deve estar entre 0 e 10');
    const reg = await this.regs.findOne({ where: { ticketCode } });
    if (!reg) throw new NotFoundException('Ticket inválido');
    reg.npsScore = dto.score;
    reg.npsComment = dto.comment;
    reg.npsAnsweredAt = new Date();
    await this.regs.save(reg);
    return { ok: true };
  }

  async npsSummary(mentorId: string, eventId: string) {
    await this.get(mentorId, eventId);
    const responses = await this.regs.find({ where: { eventId } });
    const answered = responses.filter((r) => r.npsScore !== null && r.npsScore !== undefined);
    const sent = responses.filter((r) => !!r.npsSentAt);
    const promoters = answered.filter((r) => r.npsScore! >= 9).length;
    const detractors = answered.filter((r) => r.npsScore! <= 6).length;
    const passives = answered.filter((r) => r.npsScore! >= 7 && r.npsScore! <= 8).length;
    const nps = answered.length ? Math.round(((promoters - detractors) / answered.length) * 100) : 0;
    return {
      sent: sent.length,
      answered: answered.length,
      promoters, passives, detractors,
      nps,
      comments: answered.filter((r) => r.npsComment).map((r) => ({ name: r.name, score: r.npsScore, comment: r.npsComment })),
    };
  }

  // ==================== Pós-evento: Ações ====================
  async sendTestToAll(mentorId: string, eventId: string, testTemplateId: string, opts?: { onlyCheckedIn?: boolean }) {
    const ev = await this.get(mentorId, eventId);
    const tpl = await this.testTemplates.findOne({ where: { id: testTemplateId, mentorId } });
    if (!tpl) throw new NotFoundException('Teste não encontrado');
    const list = await this.regs.find({
      where: opts?.onlyCheckedIn ? { eventId, status: RegistrationStatus.CHECKED_IN } : { eventId },
    });
    const baseUrl = this.buildPublicBaseUrl();
    const mentor = await this.users.findOne({ where: { id: mentorId } });
    let sent = 0;
    for (const reg of list) {
      try {
        const link = `${baseUrl}/c/${mentor?.slug || mentorId}/test/${tpl.id}?reg=${reg.ticketCode}`;
        await this.mail.send({
          to: reg.email,
          subject: `📝 ${tpl.title} — para você do evento ${ev.name}`,
          html: `<p>Olá ${reg.name},</p><p>Como prometido no <b>${ev.name}</b>, segue o teste/diagnóstico:</p><p><b>${tpl.title}</b></p><p>${tpl.description || ''}</p><p><a href="${link}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Iniciar teste</a></p>`,
        }).catch(() => null);
        if (reg.phone) {
          await this.whatsapp.sendText(mentorId, reg.phone, `📝 *${tpl.title}*\nComo prometido no ${ev.name}, faça seu teste:\n${link}`).catch(() => null);
        }
        await this.actions.save(this.actions.create({
          eventId, registrationId: reg.id, type: EventActionType.TEST_SENT, channel: 'email+whatsapp', status: 'ok',
          metadata: { testTemplateId },
        }));
        sent++;
      } catch (e: any) {
        await this.actions.save(this.actions.create({
          eventId, registrationId: reg.id, type: EventActionType.TEST_SENT, status: 'failed', message: e.message,
        }));
      }
    }
    return { sent, total: list.length };
  }

  async sendMeetingLinkToAll(mentorId: string, eventId: string, opts?: { onlyCheckedIn?: boolean; bookingUrl?: string }) {
    const ev = await this.get(mentorId, eventId);
    const mentor = await this.users.findOne({ where: { id: mentorId } });
    const baseUrl = this.buildPublicBaseUrl();
    const bookingUrl = opts?.bookingUrl || `${baseUrl}/c/${mentor?.slug || mentorId}?event=${ev.slug}&book=1`;
    const list = await this.regs.find({
      where: opts?.onlyCheckedIn ? { eventId, status: RegistrationStatus.CHECKED_IN } : { eventId },
    });
    let sent = 0;
    for (const reg of list) {
      try {
        await this.mail.send({
          to: reg.email,
          subject: `📅 Vamos conversar? Agende uma sessão 1:1 — ${ev.name}`,
          html: `<p>Olá ${reg.name},</p><p>Foi um prazer ter você no <b>${ev.name}</b>!</p><p>Quer aprofundar o que conversamos? Agende uma sessão 1:1 comigo:</p><p><a href="${bookingUrl}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Agendar 1:1</a></p>`,
        }).catch(() => null);
        if (reg.phone) {
          await this.whatsapp.sendText(mentorId, reg.phone, `Olá ${reg.name}! Foi top te ver no *${ev.name}*. Quer agendar uma 1:1?\n${bookingUrl}`).catch(() => null);
        }
        await this.actions.save(this.actions.create({
          eventId, registrationId: reg.id, type: EventActionType.MEETING_LINK_SENT, channel: 'email+whatsapp', status: 'ok',
        }));
        sent++;
      } catch {}
    }
    return { sent, total: list.length };
  }

  async sendCompanyAnalysisToAll(mentorId: string, eventId: string) {
    const ev = await this.get(mentorId, eventId);
    const list = await this.regs.find({ where: { eventId } });
    const targets = list.filter((r) => !!r.company);
    let sent = 0;
    for (const reg of targets) {
      try {
        // Gera dossiê IA simples baseado no nome da empresa
        const sys = 'Você é um consultor de negócios sênior. Escreva em português do Brasil, tom profissional e direto.';
        const prompt = `Crie um mini-dossiê estratégico (300 palavras max) sobre a empresa "${reg.company}". Inclua: 1) setor provável, 2) oportunidades de mentoria, 3) dores comuns nesse segmento, 4) três perguntas estratégicas que um mentor faria.`;
        const dossier = await this.ai.chat(sys, prompt).catch(() => 'Dossiê não disponível neste momento.');
        await this.mail.send({
          to: reg.email,
          subject: `🎁 Análise estratégica gratuita: ${reg.company}`,
          html: `<p>Olá ${reg.name},</p><p>Como brinde pelo evento <b>${ev.name}</b>, preparei uma análise estratégica inicial sobre <b>${reg.company}</b>:</p><div style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap">${dossier}</div><p>Quer aprofundar? Responda este email!</p>`,
        }).catch(() => null);
        await this.actions.save(this.actions.create({
          eventId, registrationId: reg.id, type: EventActionType.COMPANY_ANALYSIS_SENT, channel: 'email', status: 'ok',
        }));
        sent++;
      } catch (e: any) {
        await this.actions.save(this.actions.create({
          eventId, registrationId: reg.id, type: EventActionType.COMPANY_ANALYSIS_SENT, status: 'failed', message: e.message,
        }));
      }
    }
    return { sent, total: targets.length, eligible: targets.length };
  }

  /** Converte inscrito em lead/mentorado */
  async convertToLead(mentorId: string, eventId: string, regId: string) {
    const ev = await this.get(mentorId, eventId);
    const reg = await this.regs.findOne({ where: { id: regId, eventId } });
    if (!reg) throw new NotFoundException('Inscrição não encontrada');
    if (reg.leadId) {
      const existing = await this.leads.findOne({ where: { id: reg.leadId } });
      if (existing) return { lead: existing, alreadyConverted: true };
    }
    const mentor = await this.users.findOne({ where: { id: mentorId } });
    const result = await this.leadsService.createFromCapture({
      mentorId,
      mentorBrand: mentor?.brandName || 'MentorFlow',
      name: reg.name,
      email: reg.email,
      phone: reg.phone,
      company: reg.company,
      source: `event:${ev.slug}`,
      eventId: ev.id,
    });
    reg.leadId = result.lead.id;
    await this.regs.save(reg);
    return { lead: result.lead };
  }

  // ==================== Histórico ====================
  async listActions(mentorId: string, eventId: string) {
    await this.get(mentorId, eventId);
    return this.actions.find({ where: { eventId }, order: { createdAt: 'DESC' }, take: 100 });
  }
}
