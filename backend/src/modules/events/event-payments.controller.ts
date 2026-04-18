import { Body, Controller, Delete, Get, Param, Post, Put, Req } from '@nestjs/common';
import { Request } from 'express';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';
import { EventPaymentsService } from './event-payments.service';
import { PaymentProviderType, PaymentProviderStatus } from '../../entities/mentor-payment-provider.entity';

/** Endpoints autenticados (mentor): config de provedores + lotes. */
@Controller('event-payments')
export class EventPaymentsController {
  constructor(private svc: EventPaymentsService) {}

  // ===== Provedores =====
  @Auth('mentor', 'super_admin')
  @Get('providers')
  listProviders(@TenantId() mentorId: string) {
    return this.svc.listProviders(mentorId);
  }

  @Auth('mentor', 'super_admin')
  @Post('providers')
  upsertProvider(
    @TenantId() mentorId: string,
    @Body()
    dto: {
      type: PaymentProviderType;
      label?: string;
      apiKey?: string;
      environment?: string;
      manualInstructions?: string;
      manualCheckoutUrl?: string;
      status?: PaymentProviderStatus;
    },
  ) {
    return this.svc.upsertProvider(mentorId, dto);
  }

  @Auth('mentor', 'super_admin')
  @Delete('providers/:id')
  deleteProvider(@TenantId() mentorId: string, @Param('id') id: string) {
    return this.svc.deleteProvider(mentorId, id);
  }

  // ===== Lotes =====
  @Auth('mentor', 'super_admin')
  @Get('events/:eventId/tiers')
  listTiers(@Param('eventId') eventId: string) {
    return this.svc.listTiers(eventId);
  }

  @Auth('mentor', 'super_admin')
  @Post('events/:eventId/tiers')
  createTier(@Param('eventId') eventId: string, @Body() dto: any) {
    return this.svc.createTier(eventId, dto);
  }

  @Auth('mentor', 'super_admin')
  @Put('tiers/:id')
  updateTier(@Param('id') id: string, @Body() dto: any) {
    return this.svc.updateTier(id, dto);
  }

  @Auth('mentor', 'super_admin')
  @Delete('tiers/:id')
  deleteTier(@Param('id') id: string) {
    return this.svc.deleteTier(id);
  }

  // ===== Cobranças do evento =====
  @Auth('mentor', 'super_admin')
  @Get('events/:eventId')
  payments(@Param('eventId') eventId: string) {
    return this.svc.getEventPayments(eventId);
  }

  @Auth('mentor', 'super_admin')
  @Post(':paymentId/mark-paid')
  markPaid(@TenantId() mentorId: string, @Param('paymentId') paymentId: string) {
    return this.svc.markPaymentManually(mentorId, paymentId);
  }
}

/** Endpoints públicos: webhooks e status. */
@Controller('public/event-payments')
export class PublicEventPaymentsController {
  constructor(private svc: EventPaymentsService) {}

  @Post('webhook/asaas')
  asaas(@Body() body: any) {
    return this.svc.handleAsaasWebhook(body);
  }

  @Post('webhook/mercado_pago')
  mp(@Body() body: any, @Req() req: Request) {
    return this.svc.handleMercadoPagoWebhook(body, req.query);
  }

  @Post('webhook/stripe')
  stripe(@Body() body: any) {
    return this.svc.handleStripeWebhook(body);
  }

  @Get('registration/:ticketCode/payments')
  byTicket(@Param('ticketCode') ticketCode: string) {
    return this.svc['regs']
      .findOne({ where: { ticketCode } })
      .then((reg) => (reg ? this.svc.getPaymentsForRegistration(reg.id) : []));
  }
}
