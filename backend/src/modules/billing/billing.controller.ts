import { Body, Controller, Get, Post, Req, Headers, BadRequestException, RawBodyRequest } from '@nestjs/common';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';
import { BillingService } from './billing.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private billing: BillingService) {}

  @ApiBearerAuth()
  @Auth('mentor', 'super_admin')
  @Post('checkout')
  checkout(@TenantId() mentorId: string, @Body() body: { planId: string; successUrl?: string; cancelUrl?: string }) {
    const appUrl = process.env.APP_URL || 'http://localhost:8080';
    return this.billing.createCheckoutSession(
      mentorId,
      body.planId,
      body.successUrl || `${appUrl}/app/admin/plans?status=success`,
      body.cancelUrl || `${appUrl}/app/admin/plans?status=cancel`,
    );
  }

  @ApiBearerAuth()
  @Auth('mentor', 'super_admin')
  @Post('portal')
  portal(@TenantId() mentorId: string, @Body() body: { returnUrl?: string }) {
    const appUrl = process.env.APP_URL || 'http://localhost:8080';
    return this.billing.createPortalSession(mentorId, body.returnUrl || `${appUrl}/app/admin/plans`);
  }

  @ApiBearerAuth()
  @Auth('mentor', 'super_admin')
  @Get('me')
  me(@TenantId() mentorId: string) {
    return this.billing.getMentorSubscription(mentorId);
  }

  /** Webhook público — verifica assinatura via STRIPE_WEBHOOK_SECRET se houver */
  @Post('webhook')
  async webhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') sig: string) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    let event: any;
    if (secret && sig) {
      // Verificação manual de assinatura (HMAC) — sem dep do SDK
      const raw = (req as any).rawBody || JSON.stringify(req.body);
      const crypto = require('crypto');
      const parts: any = {};
      sig.split(',').forEach((p) => {
        const [k, v] = p.split('=');
        parts[k] = v;
      });
      const signedPayload = `${parts.t}.${raw.toString()}`;
      const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
      if (parts.v1 !== expected) throw new BadRequestException('Assinatura Stripe inválida');
      event = typeof req.body === 'object' ? req.body : JSON.parse(raw.toString());
    } else {
      event = req.body;
    }
    return this.billing.handleWebhook(event);
  }
}
