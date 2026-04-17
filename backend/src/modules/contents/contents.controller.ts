import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Content } from '../../entities/content.entity';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';

@Controller('contents')
export class ContentsController {
  constructor(@InjectRepository(Content) private contents: Repository<Content>) {}

  @Auth('mentor', 'super_admin', 'mentorado', 'prospect')
  @Get()
  list(@TenantId() mentorId: string) {
    return this.contents.find({ where: { mentorId, published: true }, order: { createdAt: 'DESC' } });
  }

  @Auth('mentor', 'super_admin')
  @Post()
  create(@TenantId() mentorId: string, @Body() dto: any) {
    return this.contents.save(this.contents.create({ ...dto, mentorId }));
  }

  @Auth('mentor', 'super_admin')
  @Delete(':id')
  async delete(@TenantId() mentorId: string, @Param('id') id: string) {
    await this.contents.delete({ id, mentorId } as any);
    return { ok: true };
  }
}
