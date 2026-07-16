import { Body, Controller, Delete, Get, Param, Post, Put, Req } from '@nestjs/common';
import { Request } from 'express';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';
import { EventPaymentsService } from './event-payments.service';
import { EventCouponsService } from './event-coupons.service';
import { PaymentProviderType, PaymentProviderStatus } from '../../entities/mentor-payment-provider.entity';

/** Endpoints autenticados (mentor): config de provedores + lotes. */
@Controller('event-payments')
export class EventPaymentsController {
  constructor(private svc: EventPaymentsService, private couponsSvc: EventCouponsService) {}

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

  // ===== Cupons =====
  @Auth('mentor', 'super_admin')
  @Get('events/:eventId/coupons')
  listCoupons(@Param('eventId') eventId: string) {
    return this.couponsSvc.list(eventId);
  }

  @Auth('mentor', 'super_admin')
  @Post('events/:eventId/coupons')
  createCoupon(@TenantId() mentorId: string, @Param('eventId') eventId: string, @Body() dto: any) {
    return this.couponsSvc.create(mentorId, eventId, dto);
  }

  @Auth('mentor', 'super_admin')
  @Put('coupons/:id')
  updateCoupon(@Param('id') id: string, @Body() dto: any) {
    return this.couponsSvc.update(id, dto);
  }

  @Auth('mentor', 'super_admin')
  @Delete('coupons/:id')
  deleteCoupon(@Param('id') id: string) {
    return this.couponsSvc.remove(id);
  }
}

/** Endpoints públicos: webhooks e status. */
@Controller('public/event-payments')
export class PublicEventPaymentsController {
  constructor(private svc: EventPaymentsService, private couponsSvc: EventCouponsService) {}

  @Post('webhook/asaas')
  async asaas(@Body() body: any, @Req() req: Request) {
    const token = (req.headers['asaas-access-token'] || req.headers['asaas-token'] || '') as string;
    try {
      return await this.svc.handleAsaasWebhook(body, token);
    } catch (e: any) {
      // NUNCA lançamos 5xx para o Asaas — se der erro, respondemos 200 com ignored
      // para não deixar o webhook em status "Interrompido".
      return { ok: true, ignored: 'internal error', error: e?.message };
    }
  }

  /** Ping público (GET) — usado para validar que a URL responde antes de ativar no Asaas. */
  @Get('webhook/asaas')
  asaasPing() {
    return { ok: true, service: 'asaas-webhook', ts: new Date().toISOString() };
  }

  /** Endpoint de teste chamado pela UI do mentor: dispara um POST fake no próprio webhook. */
  @Post('webhook/asaas/test')
  asaasTest(@Body() body: { token?: string }) {
    return {
      ok: true,
      received: true,
      tokenReceived: !!body?.token,
      message: 'Endpoint acessível. Se você conseguiu chamar isto, o Asaas também conseguirá.',
    };
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

  /** Valida cupom em tempo real (usado no formulário público antes de submeter). */
  @Post('coupons/validate')
  async validateCoupon(@Body() dto: { eventId: string; code: string; tierId: string; email: string; cpfCnpj?: string }) {
    const tier = await this.svc['tiers'].findOne({ where: { id: dto.tierId } });
    if (!tier) return { valid: false, message: 'Lote inválido' };
    try {
      const r = await this.couponsSvc.validateAndApply(dto.eventId, dto.code, tier, {
        email: dto.email,
        cpfCnpj: dto.cpfCnpj,
      });
      return {
        valid: true,
        code: r.coupon.code,
        discountType: r.coupon.discountType,
        discountValue: r.coupon.discountValue,
        discountCents: r.discountCents,
        originalCents: r.originalCents,
        finalCents: r.finalCents,
      };
    } catch (e: any) {
      return { valid: false, message: e.message };
    }
  }
}
