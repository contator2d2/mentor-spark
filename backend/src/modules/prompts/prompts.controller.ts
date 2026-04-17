import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prompt } from '../../entities/prompt.entity';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';

@Controller('prompts')
export class PromptsController {
  constructor(@InjectRepository(Prompt) private repo: Repository<Prompt>) {}

  @Auth('mentor', 'super_admin')
  @Get()
  list(@TenantId() mentorId: string) {
    return this.repo.find({ where: { mentorId }, order: { createdAt: 'DESC' } });
  }

  @Auth('mentor', 'super_admin')
  @Post()
  create(@TenantId() mentorId: string, @Body() dto: { title: string; body: string; category?: string }) {
    return this.repo.save(this.repo.create({ ...dto, mentorId }));
  }

  @Auth('mentor', 'super_admin')
  @Put(':id')
  async update(@TenantId() mentorId: string, @Param('id') id: string, @Body() dto: { title?: string; body?: string; category?: string }) {
    await this.repo.update({ id, mentorId } as any, dto);
    return this.repo.findOne({ where: { id, mentorId } });
  }

  @Auth('mentor', 'super_admin')
  @Delete(':id')
  async delete(@TenantId() mentorId: string, @Param('id') id: string) {
    await this.repo.delete({ id, mentorId } as any);
    return { ok: true };
  }
}
