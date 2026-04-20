import { Controller, Get, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, Not, Repository } from 'typeorm';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';
import { Meeting } from '../../entities/meeting.entity';
import { Task } from '../../entities/task.entity';
import { Booking } from '../../entities/booking.entity';
import { CaptureEvent } from '../../entities/capture-event.entity';
import { Lead } from '../../entities/lead.entity';

export type CalendarEventKind = 'meeting' | 'task' | 'event' | 'booking';

export interface CalendarEvent {
  id: string;
  kind: CalendarEventKind;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  status?: string;
  color: string; // semantic class name for UI (e.g. 'primary' | 'accent' | 'warning' | 'success' | 'destructive')
  url?: string;
  meta?: Record<string, any>;
}

const COLORS: Record<CalendarEventKind, string> = {
  meeting: 'primary',
  task: 'warning',
  event: 'accent',
  booking: 'success',
};

@Controller('calendar')
export class CalendarController {
  constructor(
    @InjectRepository(Meeting) private meetings: Repository<Meeting>,
    @InjectRepository(Task) private tasks: Repository<Task>,
    @InjectRepository(Booking) private bookings: Repository<Booking>,
    @InjectRepository(CaptureEvent) private events: Repository<CaptureEvent>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
  ) {}

  /**
   * Agenda global agregando reuniões, tarefas com dueDate, bookings (agenda pública)
   * e eventos de captação. Filtros opcionais por tipo via ?kinds=meeting,task,event,booking
   */
  @Auth('mentor', 'super_admin')
  @Get()
  async list(
    @TenantId() mentorId: string,
    @Query('from') fromStr?: string,
    @Query('to') toStr?: string,
    @Query('kinds') kindsStr?: string,
  ): Promise<CalendarEvent[]> {
    const now = new Date();
    const from = fromStr ? new Date(fromStr) : new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = toStr ? new Date(toStr) : new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);
    const kinds = new Set<CalendarEventKind>(
      (kindsStr ? kindsStr.split(',') : ['meeting', 'task', 'event', 'booking']).map((k) => k.trim()) as CalendarEventKind[],
    );

    const out: CalendarEvent[] = [];

    // Leads para enriquecer títulos
    const leadIds = new Set<string>();

    if (kinds.has('meeting')) {
      const list = await this.meetings.find({
        where: { mentorId, scheduledAt: Between(from, to) },
        order: { scheduledAt: 'ASC' },
      });
      list.forEach((m) => {
        if (m.leadId) leadIds.add(m.leadId);
        const end = m.scheduledEnd
          ? m.scheduledEnd
          : m.durationMinutes
            ? new Date(new Date(m.scheduledAt).getTime() + m.durationMinutes * 60_000)
            : undefined;
        out.push({
          id: `meeting:${m.id}`,
          kind: 'meeting',
          title: m.title,
          start: new Date(m.scheduledAt).toISOString(),
          end: end ? new Date(end).toISOString() : undefined,
          status: m.status,
          color: COLORS.meeting,
          url: `/app/meetings/${m.id}`,
          meta: { leadId: m.leadId, platform: m.platform, meetingUrl: m.meetingUrl },
        });
      });
    }

    if (kinds.has('task')) {
      const list = await this.tasks.find({
        where: { mentorId, dueDate: Between(from, to) },
        order: { dueDate: 'ASC' },
      });
      list.forEach((t) => {
        if (t.leadId) leadIds.add(t.leadId);
        out.push({
          id: `task:${t.id}`,
          kind: 'task',
          title: t.title,
          start: new Date(t.dueDate as Date).toISOString(),
          allDay: true,
          status: t.status,
          color: t.status === 'done' ? 'success' : t.priority === 'urgent' ? 'destructive' : COLORS.task,
          url: `/app/tasks`,
          meta: { leadId: t.leadId, priority: t.priority },
        });
      });
    }

    if (kinds.has('event')) {
      const list = await this.events.find({
        where: { mentorId, startsAt: Between(from, to) },
        order: { startsAt: 'ASC' },
      });
      list.forEach((e) => {
        out.push({
          id: `event:${e.id}`,
          kind: 'event',
          title: e.name,
          start: new Date(e.startsAt as Date).toISOString(),
          end: e.endsAt ? new Date(e.endsAt).toISOString() : undefined,
          status: e.status,
          color: COLORS.event,
          url: `/app/events/${e.id}`,
          meta: { modality: e.modality, location: e.location },
        });
      });
    }

    if (kinds.has('booking')) {
      const list = await this.bookings.find({
        where: { mentorId, startsAt: Between(from, to) },
        order: { startsAt: 'ASC' },
      });
      list.forEach((b) => {
        if (b.leadId) leadIds.add(b.leadId);
        out.push({
          id: `booking:${b.id}`,
          kind: 'booking',
          title: `${b.guestName} (agendamento)`,
          start: new Date(b.startsAt).toISOString(),
          end: new Date(b.endsAt).toISOString(),
          status: b.status,
          color: b.status === 'cancelled' ? 'destructive' : COLORS.booking,
          url: `/app/scheduling/bookings`,
          meta: { guestEmail: b.guestEmail, guestPhone: b.guestPhone, leadId: b.leadId },
        });
      });
    }

    if (leadIds.size) {
      const leads = await this.leads.find({ where: { mentorId } });
      const map = new Map(leads.map((l) => [l.id, l]));
      out.forEach((ev) => {
        const lid = ev.meta?.leadId;
        if (lid && map.has(lid)) {
          (ev.meta as any).leadName = map.get(lid)!.name;
        }
      });
    }

    return out.sort((a, b) => a.start.localeCompare(b.start));
  }
}
