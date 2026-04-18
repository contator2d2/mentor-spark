import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { CurrentUser } from '../auth/current-user.decorator';
import { MentorBillingService } from './mentor-billing.service';
import { ChargeStatus } from '../../entities/charge.entity';

@Controller('mentor-billing')
@UseGuards(JwtAuthGuard)
export class MentorBillingController {
  constructor(private svc: MentorBillingService) {}

  @Get('subscriptions')
  listSubs(@CurrentUser() u: any) { return this.svc.listSubscriptions(u.id); }

  @Post('subscriptions')
  createSub(@CurrentUser() u: any, @Body() body: any) { return this.svc.createSubscription(u.id, body); }

  @Delete('subscriptions/:id')
  cancelSub(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.cancelSubscription(u.id, id); }

  @Get('charges')
  listCharges(@CurrentUser() u: any, @Query() q: any) {
    return this.svc.listCharges(u.id, { status: q.status, leadId: q.leadId });
  }

  @Post('charges')
  createCharge(@CurrentUser() u: any, @Body() body: any) { return this.svc.createCharge(u.id, body); }

  @Patch('charges/:id/paid')
  markPaid(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.markPaid(u.id, id); }

  @Delete('charges/:id')
  cancelCharge(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.cancelCharge(u.id, id); }
}

/** Webhook público (Asaas chama sem auth — token é do super admin no painel Asaas) */
@Controller('webhooks/asaas')
export class AsaasWebhookController {
  constructor(private svc: MentorBillingService) {}

  @Post()
  async handle(@Req() req: any, @Body() body: any) {
    return this.svc.handleAsaasWebhook(body);
  }
}
