import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';
import { Automation } from '../../entities/automation.entity';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('automations')
@ApiBearerAuth()
@Controller('automations')
export class AutomationsController {
  constructor(@InjectRepository(Automation) private repo: Repository<Automation>) {}

  @Auth('mentor', 'super_admin', 'mentor_team')
  @Get()
  list(@TenantId() mentorId: string) {
    return this.repo.find({ where: { mentorId }, order: { updatedAt: 'DESC' } });
  }

  @Auth('mentor', 'super_admin')
  @Get(':id')
  get(@TenantId() mentorId: string, @Param('id') id: string) {
    return this.repo.findOne({ where: { id, mentorId } });
  }

  @Auth('mentor', 'super_admin')
  @Post()
  create(@TenantId() mentorId: string, @Body() dto: any) {
    return this.repo.save(this.repo.create({ ...dto, mentorId, nodes: dto.nodes || [] }));
  }

  @Auth('mentor', 'super_admin')
  @Patch(':id')
  async update(@TenantId() mentorId: string, @Param('id') id: string, @Body() dto: any) {
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
