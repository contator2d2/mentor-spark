import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { CurrentUser } from '../auth/current-user.decorator';
import { SchedulingService } from './scheduling.service';
import { BookingStatus } from '../../entities/booking.entity';
import { FeatureGuard, RequireFeature } from '../plans/feature.guard';
import { userId } from '../auth/user-id.util';

@Controller('scheduling')
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireFeature('allowScheduling')
export class SchedulingController {
  constructor(private svc: SchedulingService) {}

  @Get('availabilities')
  list(@CurrentUser() u: any) { return this.svc.listForMentor(userId(u)); }

  @Post('availabilities')
  create(@CurrentUser() u: any, @Body() body: any) { return this.svc.createAvailability(userId(u), body); }

  @Patch('availabilities/:id')
  update(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.updateAvailability(userId(u), id, body);
  }

  @Delete('availabilities/:id')
  remove(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteAvailability(userId(u), id); }

  @Get('bookings')
  bookings(@CurrentUser() u: any, @Query() q: any) {
    return this.svc.listBookings(userId(u), { from: q.from, to: q.to, status: q.status });
  }

  @Patch('bookings/:id/status')
  setStatus(@CurrentUser() u: any, @Param('id') id: string, @Body() body: { status: BookingStatus }) {
    return this.svc.updateBookingStatus(userId(u), id, body.status);
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
