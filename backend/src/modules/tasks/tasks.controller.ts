import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../../entities/task.entity';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';

@Controller('tasks')
export class TasksController {
  constructor(@InjectRepository(Task) private tasks: Repository<Task>) {}

  @Auth('mentor', 'super_admin', 'mentorado', 'prospect')
  @Get()
  list(@TenantId() mentorId: string, @Query('leadId') leadId?: string) {
    const where: any = { mentorId };
    if (leadId) where.leadId = leadId;
    return this.tasks.find({ where, order: { dueDate: 'ASC' } });
  }

  @Auth('mentor', 'super_admin')
  @Post()
  create(@TenantId() mentorId: string, @Body() dto: any) {
    return this.tasks.save(this.tasks.create({ ...dto, mentorId }));
  }

  @Auth('mentor', 'super_admin', 'mentorado')
  @Patch(':id')
  async update(@TenantId() mentorId: string, @Param('id') id: string, @Body() dto: any) {
    await this.tasks.update({ id, mentorId } as any, dto);
    return this.tasks.findOne({ where: { id, mentorId } });
  }

  @Auth('mentor', 'super_admin')
  @Delete(':id')
  async delete(@TenantId() mentorId: string, @Param('id') id: string) {
    await this.tasks.delete({ id, mentorId } as any);
    return { ok: true };
  }
}
