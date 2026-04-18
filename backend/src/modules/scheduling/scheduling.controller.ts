import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { CurrentUser } from '../auth/current-user.decorator';
import { SchedulingService } from './scheduling.service';
import { BookingStatus } from '../../entities/booking.entity';

@Controller('scheduling')
@UseGuards(JwtAuthGuard)
export class SchedulingController {
  constructor(private svc: SchedulingService) {}

  @Get('availabilities')
  list(@CurrentUser() u: any) { return this.svc.listForMentor(u.id); }

  @Post('availabilities')
  create(@CurrentUser() u: any, @Body() body: any) { return this.svc.createAvailability(u.id, body); }

  @Patch('availabilities/:id')
  update(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.updateAvailability(u.id, id, body);
  }

  @Delete('availabilities/:id')
  remove(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteAvailability(u.id, id); }

  @Get('bookings')
  bookings(@CurrentUser() u: any, @Query() q: any) {
    return this.svc.listBookings(u.id, { from: q.from, to: q.to, status: q.status });
  }

  @Patch('bookings/:id/status')
  setStatus(@CurrentUser() u: any, @Param('id') id: string, @Body() body: { status: BookingStatus }) {
    return this.svc.updateBookingStatus(u.id, id, body.status);
  }
}

@Controller('public/scheduling')
export class PublicSchedulingController {
  constructor(private svc: SchedulingService) {}

  @Get('mentor/:slug')
  mentor(@Param('slug') slug: string) { return this.svc.getPublicByMentorSlug(slug); }

  @Get('slots/:availabilityId')
  slots(@Param('availabilityId') id: string, @Query('from') from: string, @Query('to') to: string) {
    return this.svc.getAvailableSlots(id, from, to);
  }

  @Post('book')
  book(@Body() body: any) { return this.svc.createBooking(body); }

  @Post('cancel/:token')
  cancel(@Param('token') t: string) { return this.svc.cancelByToken(t); }
}
