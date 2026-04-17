import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiProvider } from '../../entities/ai-provider.entity';
import { Auth } from '../auth/auth.decorators';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AiService } from '../ai/ai.service';

@ApiTags('admin-ai-providers')
@ApiBearerAuth()
@Controller('admin/ai-providers')
export class AiProvidersController {
  constructor(
    @InjectRepository(AiProvider) private repo: Repository<AiProvider>,
    private ai: AiService,
  ) {}

  @Auth('super_admin')
  @Get()
  list() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  @Auth('super_admin')
  @Post()
  async create(@Body() dto: Partial<AiProvider>) {
    if (dto.isDefault) await this.repo.update({ isDefault: true }, { isDefault: false });
    const saved = await this.repo.save(this.repo.create(dto));
    this.ai.invalidateProviderCache();
    return saved;
  }

  @Auth('super_admin')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<AiProvider>) {
    if (dto.isDefault) await this.repo.update({ isDefault: true }, { isDefault: false });
    await this.repo.update(id, dto);
    this.ai.invalidateProviderCache();
    return this.repo.findOne({ where: { id } });
  }

  @Auth('super_admin')
  @Post(':id/test')
  async test(@Param('id') id: string) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) return { ok: false, error: 'Provider não encontrado' };
    try {
      const reply = await this.ai.testProvider(p);
      return { ok: true, reply };
    } catch (e: any) {
      return { ok: false, error: e?.message || String(e) };
    }
  }

  @Auth('super_admin')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.repo.delete(id);
    this.ai.invalidateProviderCache();
    return { ok: true };
  }
}
