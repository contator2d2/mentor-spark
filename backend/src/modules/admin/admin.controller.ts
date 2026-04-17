import { Controller, Get, Param, Patch, Body } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from '../../entities/user.entity';
import { Auth } from '../auth/auth.decorators';

@Controller('admin')
export class AdminController {
  constructor(@InjectRepository(User) private users: Repository<User>) {}

  @Auth('super_admin')
  @Get('mentors')
  list() {
    return this.users.find({ where: { role: UserRole.MENTOR }, order: { createdAt: 'DESC' } });
  }

  @Auth('super_admin')
  @Patch('mentors/:id/status')
  async setStatus(@Param('id') id: string, @Body() body: { status: UserStatus }) {
    await this.users.update(id, { status: body.status });
    return this.users.findOne({ where: { id } });
  }
}
