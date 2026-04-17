import { Controller, Get, Patch, Param, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../entities/notification.entity';
import { Auth } from '../auth/auth.decorators';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(@InjectRepository(Notification) private notifs: Repository<Notification>) {}

  @Auth('mentor', 'super_admin', 'mentorado', 'prospect')
  @Get()
  list(@CurrentUser() u: any) {
    return this.notifs.find({ where: { userId: u.sub }, order: { createdAt: 'DESC' }, take: 50 });
  }

  @Auth('mentor', 'super_admin', 'mentorado', 'prospect')
  @Get('unread-count')
  async unread(@CurrentUser() u: any) {
    const count = await this.notifs.count({ where: { userId: u.sub, read: false } });
    return { count };
  }

  @Auth('mentor', 'super_admin', 'mentorado', 'prospect')
  @Patch(':id/read')
  async markRead(@CurrentUser() u: any, @Param('id') id: string) {
    await this.notifs.update({ id, userId: u.sub } as any, { read: true });
    return { ok: true };
  }

  @Auth('mentor', 'super_admin', 'mentorado', 'prospect')
  @Post('read-all')
  async readAll(@CurrentUser() u: any) {
    await this.notifs.update({ userId: u.sub, read: false } as any, { read: true });
    return { ok: true };
  }
}
