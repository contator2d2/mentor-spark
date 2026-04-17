import { Body, Controller, Get, Put } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Auth } from '../auth/auth.decorators';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('me')
export class UsersController {
  constructor(@InjectRepository(User) private users: Repository<User>) {}

  @Auth('mentor', 'super_admin', 'mentorado', 'prospect')
  @Get()
  async me(@CurrentUser() u: any) {
    return this.users.findOne({ where: { id: u.sub } });
  }

  @Auth('mentor', 'super_admin')
  @Put('brand')
  async updateBrand(@CurrentUser() u: any, @Body() dto: { brandName?: string; brandLogoUrl?: string }) {
    await this.users.update(u.sub, dto);
    return this.users.findOne({ where: { id: u.sub } });
  }
}
