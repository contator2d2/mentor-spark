import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { CurrentUser } from '../auth/current-user.decorator';
import { Auth } from '../auth/auth.decorators';
import { MentorBillingService } from './mentor-billing.service';
import { ChargeStatus } from '../../entities/charge.entity';
import { FeatureGuard, RequireFeature } from '../plans/feature.guard';

@Controller('mentor-billing')
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireFeature('allowMentorBilling')
export class MentorBillingController {
  constructor(private svc: MentorBillingService) {}

  // ---------- Subscriptions ----------
  @Get('subscriptions')
  listSubs(@CurrentUser() u: any, @Query('leadId') leadId?: string) {
    return this.svc.listSubscriptions(u.id, leadId);
  }

  @Post('subscriptions')
  createSub(@CurrentUser() u: any, @Body() body: any) { return this.svc.createSubscription(u.id, body); }

  @Delete('subscriptions/:id')
  cancelSub(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.cancelSubscription(u.id, id); }

  // ---------- Charges ----------
  @Get('charges')
  listCharges(@CurrentUser() u: any, @Query() q: any) {
    return this.svc.listCharges(u.id, { status: q.status, leadId: q.leadId });
  }

  @Get('charges/:id')
  getCharge(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.getCharge(u.id, id);
  }

  @Post('charges')
  createCharge(@CurrentUser() u: any, @Body() body: any) { return this.svc.createCharge(u.id, body); }

  @Patch('charges/:id')
  updateCharge(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.updateCharge(u.id, id, body);
  }

  @Patch('charges/:id/paid')
  markPaid(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.markPaid(u.id, id); }

  @Delete('charges/:id')
  cancelCharge(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.cancelCharge(u.id, id); }

  @Post('charges/:id/invoice')
  attachInvoice(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.attachInvoice(u.id, id, body);
  }

  @Post('charges/:id/remind')
  sendReminder(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.sendReminder(u.id, id);
  }

  // ---------- Templates personalizáveis ----------
  @Get('templates')
  listTemplates(@CurrentUser() u: any) { return this.svc.listBillingTemplates(u.id); }

  @Post('templates')
  upsertTemplate(@CurrentUser() u: any, @Body() body: { key: string; body: string }) {
    return this.svc.upsertBillingTemplate(u.id, body.key, body.body);
  }
}

/** Endpoints para o app do MENTORADO ver suas próprias cobranças */
@Controller('me/financeiro')
export class MentoradoFinanceiroController {
  constructor(private svc: MentorBillingService) {}

  @Auth('mentorado', 'prospect')
  @Get()
  list(@CurrentUser() u: any) {
    return this.svc.listForMentorado(u.id);
  }
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
