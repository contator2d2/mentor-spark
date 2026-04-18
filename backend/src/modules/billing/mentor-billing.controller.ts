import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { CurrentUser } from '../auth/current-user.decorator';
import { Auth } from '../auth/auth.decorators';
import { MentorBillingService } from './mentor-billing.service';
import { ChargeStatus } from '../../entities/charge.entity';
import { FeatureGuard, RequireFeature } from '../plans/feature.guard';

/** Resolve o id do mentor a partir do JWT payload (sub) ou do mentorId em caso de team. */
function resolveMentorId(u: any): string {
  if (!u) return '';
  if (u.role === 'mentor' || u.role === 'super_admin') return u.sub || u.id;
  if (u.role === 'mentor_team') return u.parentMentorId || u.mentorId;
  return u.mentorId || u.sub || u.id;
}

@Controller('mentor-billing')
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireFeature('allowMentorBilling')
export class MentorBillingController {
  constructor(private svc: MentorBillingService) {}

  // ---------- Subscriptions ----------
  @Get('subscriptions')
  listSubs(@CurrentUser() u: any, @Query('leadId') leadId?: string) {
    return this.svc.listSubscriptions(resolveMentorId(u), leadId);
  }

  @Post('subscriptions')
  createSub(@CurrentUser() u: any, @Body() body: any) {
    return this.svc.createSubscription(resolveMentorId(u), body);
  }

  @Delete('subscriptions/:id')
  cancelSub(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.cancelSubscription(resolveMentorId(u), id);
  }

  // ---------- Charges ----------
  @Get('charges')
  listCharges(@CurrentUser() u: any, @Query() q: any) {
    return this.svc.listCharges(resolveMentorId(u), { status: q.status, leadId: q.leadId });
  }

  @Get('charges/:id')
  getCharge(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.getCharge(resolveMentorId(u), id);
  }

  @Post('charges')
  createCharge(@CurrentUser() u: any, @Body() body: any) {
    return this.svc.createCharge(resolveMentorId(u), body);
  }

  @Patch('charges/:id')
  updateCharge(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.updateCharge(resolveMentorId(u), id, body);
  }

  @Patch('charges/:id/paid')
  markPaid(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.markPaid(resolveMentorId(u), id);
  }

  @Delete('charges/:id')
  cancelCharge(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.cancelCharge(resolveMentorId(u), id);
  }

  @Post('charges/:id/invoice')
  attachInvoice(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.attachInvoice(resolveMentorId(u), id, body);
  }

  @Post('charges/:id/remind')
  sendReminder(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.sendReminder(resolveMentorId(u), id);
  }

  // ---------- Templates personalizáveis ----------
  @Get('templates')
  listTemplates(@CurrentUser() u: any) {
    return this.svc.listBillingTemplates(resolveMentorId(u));
  }

  @Post('templates')
  upsertTemplate(@CurrentUser() u: any, @Body() body: { key: string; body: string }) {
    return this.svc.upsertBillingTemplate(resolveMentorId(u), body.key, body.body);
  }
}

/** Endpoints para o app do MENTORADO ver suas próprias cobranças */
@Controller('me/financeiro')
export class MentoradoFinanceiroController {
  constructor(private svc: MentorBillingService) {}

  @Auth('mentorado', 'prospect')
  @Get()
  list(@CurrentUser() u: any) {
    return this.svc.listForMentorado(u.sub || u.id);
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
