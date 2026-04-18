import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsEmail, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { EventsService } from './events.service';

class PublicRegisterDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() role?: string;
}

class NpsSubmitDto {
  @IsInt() @Min(0) @Max(10) score: number;
  @IsOptional() @IsString() comment?: string;
}

/** Endpoints públicos sem auth — inscrição, ticket e NPS. */
@Controller('public/events')
export class PublicEventsController {
  constructor(private svc: EventsService) {}

  @Get(':slug')
  async info(@Param('slug') slug: string) {
    // Reaproveita publicRegister (sem efeito) — mas precisamos de método dedicado:
    const event = await this.svc['events'].findOne({ where: { slug } });
    if (!event) return { ok: false };
    const count = await this.svc['regs'].count({ where: { eventId: event.id } });
    return {
      id: event.id, name: event.name, description: event.description, slug: event.slug,
      location: event.location, virtualUrl: event.virtualUrl, modality: event.modality,
      startsAt: event.startsAt, endsAt: event.endsAt, capacity: event.capacity,
      coverImageUrl: event.coverImageUrl, isActive: event.isActive, status: event.status,
      registrations: count,
    };
  }

  @Post(':slug/register')
  register(@Param('slug') slug: string, @Body() dto: PublicRegisterDto) {
    return this.svc.publicRegister(slug, dto);
  }

  @Get('ticket/:ticketCode')
  ticket(@Param('ticketCode') ticketCode: string) {
    return this.svc.getRegistrationByTicket(ticketCode);
  }

  @Post('nps/:ticketCode')
  submitNps(@Param('ticketCode') ticketCode: string, @Body() dto: NpsSubmitDto) {
    return this.svc.submitNps(ticketCode, dto);
  }
}
