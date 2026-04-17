import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushSubscription } from '../../entities/push-subscription.entity';
import { Auth } from '../auth/auth.decorators';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('push')
@ApiBearerAuth()
@Controller('push')
export class PushController {
  constructor(@InjectRepository(PushSubscription) private subs: Repository<PushSubscription>) {}

  /** Devolve a public key VAPID pra o frontend assinar */
  @Get('vapid-public')
  vapidPublic() {
    return { key: process.env.VAPID_PUBLIC_KEY || '' };
  }

  @Auth('mentor', 'super_admin', 'mentorado', 'prospect')
  @Post('subscribe')
  async subscribe(@CurrentUser() u: any, @Body() body: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string }) {
    if (!body?.endpoint) return { ok: false };
    let s = await this.subs.findOne({ where: { endpoint: body.endpoint } });
    if (!s) s = this.subs.create({ endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth, userId: u.sub, userAgent: body.userAgent });
    else { s.p256dh = body.keys.p256dh; s.auth = body.keys.auth; s.userId = u.sub; }
    await this.subs.save(s);
    return { ok: true };
  }

  @Auth('mentor', 'super_admin', 'mentorado', 'prospect')
  @Post('unsubscribe')
  async unsubscribe(@Body() body: { endpoint: string }) {
    await this.subs.delete({ endpoint: body.endpoint });
    return { ok: true };
  }
}
