import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Availability } from '../../entities/availability.entity';
import { Booking, BookingStatus } from '../../entities/booking.entity';
import { User } from '../../entities/user.entity';
import { WhatsappService } from '../integrations/whatsapp.service';
import { GoogleCalendarService } from '../integrations/google-calendar.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(
    @InjectRepository(Availability) private avail: Repository<Availability>,
    @InjectRepository(Booking) private bookings: Repository<Booking>,
    @InjectRepository(User) private users: Repository<User>,
    private whatsapp: WhatsappService,
    private google: GoogleCalendarService,
    private notifications: NotificationsService,
  ) {}

  // ---------- Availability CRUD ----------
  async listForMentor(mentorId: string) {
    try {
      return await this.avail.find({ where: { mentorId }, order: { createdAt: 'DESC' } });
    } catch (e: any) {
      this.logger.warn(`listForMentor falhou: ${e?.message}. Retornando lista vazia.`);
      return [];
    }
  }

  async createAvailability(mentorId: string, dto: Partial<Availability>) {
    const a = this.avail.create({
      ...dto,
      mentorId,
      slug: dto.slug || randomBytes(4).toString('hex'),
    });
    return this.avail.save(a);
  }

  async updateAvailability(mentorId: string, id: string, dto: Partial<Availability>) {
    const a = await this.avail.findOne({ where: { id, mentorId } });
    if (!a) throw new NotFoundException();
    Object.assign(a, dto);
    return this.avail.save(a);
  }

  async deleteAvailability(mentorId: string, id: string) {
    await this.avail.delete({ id, mentorId } as any);
    return { ok: true };
  }

  // ---------- Public booking ----------
  async getPublicByMentorSlug(slug: string) {
    const mentor = await this.users.findOne({ where: { slug } });
    if (!mentor) throw new NotFoundException('Mentor não encontrado');
    const availabilities = await this.avail.find({ where: { mentorId: mentor.id, active: true } });
    return {
      mentor: { id: mentor.id, name: mentor.name, brandName: mentor.brandName, brandLogoUrl: mentor.brandLogoUrl },
      availabilities,
    };
  }

  /** Calcula slots disponíveis para uma availability em um intervalo de datas */
  async getAvailableSlots(availabilityId: string, fromIso: string, toIso: string) {
    const a = await this.avail.findOne({ where: { id: availabilityId, active: true } });
    if (!a) throw new NotFoundException();

    const from = new Date(fromIso);
    const to = new Date(toIso);
    const minNotice = new Date(Date.now() + a.minNoticeHours * 3_600_000);
    const maxFuture = new Date(Date.now() + a.maxAdvanceDays * 86_400_000);

    // Busca bookings já existentes no período para esse mentor
    const existing = await this.bookings.find({
      where: { mentorId: a.mentorId, status: BookingStatus.CONFIRMED },
    });

    const slots: { start: string; end: string }[] = [];
    const cursor = new Date(from);
    cursor.setHours(0, 0, 0, 0);

    while (cursor <= to) {
      const dow = cursor.getDay();
      const ranges = a.weeklyHours?.[String(dow)] || [];
      const dateStr = cursor.toISOString().slice(0, 10);
      const isBlocked = a.blockedDates?.includes(dateStr);

      if (!isBlocked && ranges.length) {
        for (const [startH, endH] of ranges) {
          const [sh, sm] = startH.split(':').map(Number);
          const [eh, em] = endH.split(':').map(Number);
          const dayStart = new Date(cursor);
          dayStart.setHours(sh, sm, 0, 0);
          const dayEnd = new Date(cursor);
          dayEnd.setHours(eh, em, 0, 0);

          let slotStart = new Date(dayStart);
          while (slotStart.getTime() + a.durationMinutes * 60_000 <= dayEnd.getTime()) {
            const slotEnd = new Date(slotStart.getTime() + a.durationMinutes * 60_000);
            const inRange = slotStart >= minNotice && slotStart <= maxFuture;
            const conflicts = existing.some(b =>
              !(b.endsAt.getTime() <= slotStart.getTime() || b.startsAt.getTime() >= slotEnd.getTime())
            );
            if (inRange && !conflicts) {
              slots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() });
            }
            slotStart = new Date(slotStart.getTime() + (a.durationMinutes + a.bufferMinutes) * 60_000);
          }
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return slots;
  }

  async createBooking(dto: {
    availabilityId: string;
    startsAt: string;
    guestName: string;
    guestEmail: string;
    guestPhone?: string;
    notes?: string;
  }) {
    const a = await this.avail.findOne({ where: { id: dto.availabilityId, active: true } });
    if (!a) throw new NotFoundException();

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(startsAt.getTime() + a.durationMinutes * 60_000);

    // Re-valida conflito
    const conflict = await this.bookings
      .createQueryBuilder('b')
      .where('b.mentorId = :m AND b.status = :s', { m: a.mentorId, s: BookingStatus.CONFIRMED })
      .andWhere('NOT (b.endsAt <= :s1 OR b.startsAt >= :s2)', { s1: startsAt, s2: endsAt })
      .getOne();
    if (conflict) throw new BadRequestException('Horário não está mais disponível');

    const status = a.requireApproval ? BookingStatus.PENDING : BookingStatus.CONFIRMED;
    let meetingUrl: string | undefined;
    let googleEventId: string | undefined;

    if (status === BookingStatus.CONFIRMED && a.autoMeetLink) {
      try {
        const ev = await this.google.createEvent(a.mentorId, {
          summary: `${a.title} - ${dto.guestName}`,
          description: dto.notes,
          startsAt,
          endsAt,
          attendeeEmail: dto.guestEmail,
        });
        meetingUrl = ev?.hangoutLink || ev?.htmlLink;
        googleEventId = ev?.id;
      } catch (e: any) {
        this.logger.warn(`Google Calendar event falhou: ${e.message}`);
      }
    }

    const booking = this.bookings.create({
      mentorId: a.mentorId,
      availabilityId: a.id,
      guestName: dto.guestName,
      guestEmail: dto.guestEmail,
      guestPhone: dto.guestPhone,
      notes: dto.notes,
      startsAt,
      endsAt,
      status,
      meetingUrl,
      googleEventId,
      cancelToken: randomBytes(16).toString('hex'),
    });
    const saved = await this.bookings.save(booking);

    // Notificações
    await this.notifications.create({
      userId: a.mentorId,
      type: 'booking',
      title: status === BookingStatus.PENDING ? 'Nova solicitação de agendamento' : 'Novo agendamento confirmado',
      body: `${dto.guestName} - ${startsAt.toLocaleString('pt-BR')}`,
    });

    if (dto.guestPhone) {
      const link = meetingUrl ? `\n📹 Link da reunião: ${meetingUrl}` : '';
      await this.whatsapp.sendText(
        a.mentorId,
        dto.guestPhone,
        `Olá ${dto.guestName.split(' ')[0]}! Seu agendamento "${a.title}" foi ${status === BookingStatus.PENDING ? 'recebido (aguardando confirmação)' : 'confirmado'} para ${startsAt.toLocaleString('pt-BR')}.${link}`,
      ).catch(() => null);
    }

    return saved;
  }

  async listBookings(mentorId: string, filter?: { from?: string; to?: string; status?: BookingStatus }) {
    const qb = this.bookings.createQueryBuilder('b').where('b.mentorId = :m', { m: mentorId });
    if (filter?.from) qb.andWhere('b.startsAt >= :f', { f: filter.from });
    if (filter?.to) qb.andWhere('b.startsAt <= :t', { t: filter.to });
    if (filter?.status) qb.andWhere('b.status = :s', { s: filter.status });
    return qb.orderBy('b.startsAt', 'ASC').getMany();
  }

  async updateBookingStatus(mentorId: string, id: string, status: BookingStatus) {
    const b = await this.bookings.findOne({ where: { id, mentorId } });
    if (!b) throw new NotFoundException();
    b.status = status;
    return this.bookings.save(b);
  }

  async cancelByToken(token: string) {
    const b = await this.bookings.findOne({ where: { cancelToken: token } });
    if (!b) throw new NotFoundException();
    b.status = BookingStatus.CANCELLED;
    if (b.googleEventId) {
      try { await this.google.deleteEvent(b.mentorId, b.googleEventId); } catch {}
    }
    return this.bookings.save(b);
  }

  /** Lembretes 24h e 1h antes via WhatsApp */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async sendReminders() {
    const now = Date.now();

    // 24h
    const in24h = new Date(now + 24 * 3600_000);
    const in23h = new Date(now + 23 * 3600_000);
    const upcoming24 = await this.bookings.createQueryBuilder('b')
      .where('b.status = :s AND b.startsAt BETWEEN :a AND :b AND b.reminderSentAt IS NULL',
        { s: BookingStatus.CONFIRMED, a: in23h, b: in24h })
      .getMany();
    for (const b of upcoming24) {
      if (b.guestPhone) {
        await this.whatsapp.sendText(
          b.mentorId,
          b.guestPhone,
          `📅 Lembrete: você tem um agendamento amanhã (${b.startsAt.toLocaleString('pt-BR')}). ${b.meetingUrl ? `Link: ${b.meetingUrl}` : ''}`,
        ).catch(() => null);
      }
      b.reminderSentAt = new Date();
      await this.bookings.save(b);
    }

    // 1h antes
    const in1h = new Date(now + 60 * 60_000);
    const in50m = new Date(now + 50 * 60_000);
    const upcoming1h = await this.bookings.createQueryBuilder('b')
      .where('b.status = :s AND b.startsAt BETWEEN :a AND :b AND b.reminder1hSentAt IS NULL',
        { s: BookingStatus.CONFIRMED, a: in50m, b: in1h })
      .getMany();
    for (const b of upcoming1h) {
      if (b.guestPhone) {
        await this.whatsapp.sendText(
          b.mentorId,
          b.guestPhone,
          `⏰ Sua reunião começa em 1h (${b.startsAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}). ${b.meetingUrl ? `\n📹 Acesse: ${b.meetingUrl}` : ''}`,
        ).catch(() => null);
      }
      b.reminder1hSentAt = new Date();
      await this.bookings.save(b);
    }
  }
}
