import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Content } from '../../entities/content.entity';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';

@Controller('contents')
export class ContentsController {
  constructor(@InjectRepository(Content) private contents: Repository<Content>) {}

  /** Lista para mentor — todos os conteúdos, inclusive rascunhos */
  @Auth('mentor', 'super_admin')
  @Get()
  list(@TenantId() mentorId: string, @Query('audience') audience?: string) {
    return this.contents.find({ where: { mentorId }, order: { createdAt: 'DESC' } });
  }

  /** Lista para mentorado/prospect — somente publicados e com scheduledAt <= now */
  @Auth('mentorado', 'prospect')
  @Get('feed')
  async feed(@TenantId() mentorId: string) {
    const now = new Date();
    const qb = this.contents.createQueryBuilder('c')
      .where('c.mentorId = :mentorId', { mentorId })
      .andWhere('c.published = true')
      .andWhere('(c.scheduledAt IS NULL OR c.scheduledAt <= :now)', { now })
      .orderBy('c.createdAt', 'DESC');
    return qb.getMany();
  }

  @Auth('mentor', 'super_admin')
  @Post()
  create(@TenantId() mentorId: string, @Body() dto: any) {
    return this.contents.save(this.contents.create({ ...dto, mentorId }));
  }

  @Auth('mentor', 'super_admin')
  @Patch(':id')
  async update(@TenantId() mentorId: string, @Param('id') id: string, @Body() dto: any) {
    await this.contents.update({ id, mentorId } as any, dto);
    return this.contents.findOne({ where: { id, mentorId } });
  }

  @Auth('mentor', 'super_admin')
  @Delete(':id')
  async delete(@TenantId() mentorId: string, @Param('id') id: string) {
    await this.contents.delete({ id, mentorId } as any);
    return { ok: true };
  }
}
