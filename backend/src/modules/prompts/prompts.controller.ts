import { Body, Controller, Delete, Get, Param, Post, Put, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prompt } from '../../entities/prompt.entity';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';
import { PROMPT_SEEDS } from './prompts.seeds';

@Controller('prompts')
export class PromptsController {
  constructor(@InjectRepository(Prompt) private repo: Repository<Prompt>) {}

  /** Garante que o mentor tenha todos os prompts de sistema (idempotente, barato). */
  private async ensureSystemSeeds(mentorId: string) {
    if (!mentorId) return;
    const existing = await this.repo.find({
      where: { mentorId, isSystem: true },
      select: ['id', 'seedKey'],
    });
    const existingKeys = new Set(existing.map((p) => p.seedKey));
    const missing = PROMPT_SEEDS.filter((s) => !existingKeys.has(s.seedKey));
    if (missing.length === 0) return;
    await this.repo.save(
      missing.map((s) =>
        this.repo.create({
          mentorId,
          title: s.title,
          body: s.body,
          category: s.category,
          seedKey: s.seedKey,
          isSystem: true,
        }),
      ),
    );
  }

  @Auth('mentor', 'super_admin')
  @Get()
  async list(@TenantId() mentorId: string) {
    await this.ensureSystemSeeds(mentorId);
    return this.repo.find({
      where: { mentorId },
      order: { isSystem: 'DESC', category: 'ASC', createdAt: 'DESC' } as any,
    });
  }

  @Auth('mentor', 'super_admin')
  @Post()
  create(@TenantId() mentorId: string, @Body() dto: { title: string; body: string; category?: string }) {
    return this.repo.save(this.repo.create({ ...dto, mentorId, isSystem: false }));
  }

  @Auth('mentor', 'super_admin')
  @Put(':id')
  async update(
    @TenantId() mentorId: string,
    @Param('id') id: string,
    @Body() dto: { title?: string; body?: string; category?: string },
  ) {
    const found = await this.repo.findOne({ where: { id, mentorId } });
    if (!found) throw new ForbiddenException('Prompt não encontrado');
    if (found.isSystem) throw new ForbiddenException('Prompts do sistema não podem ser editados. Duplique-o para personalizar.');
    await this.repo.update({ id, mentorId } as any, dto);
    return this.repo.findOne({ where: { id, mentorId } });
  }

  @Auth('mentor', 'super_admin')
  @Delete(':id')
  async delete(@TenantId() mentorId: string, @Param('id') id: string) {
    const found = await this.repo.findOne({ where: { id, mentorId } });
    if (!found) return { ok: true };
    if (found.isSystem) throw new ForbiddenException('Prompts do sistema não podem ser excluídos.');
    await this.repo.delete({ id, mentorId } as any);
    return { ok: true };
  }

  /** Duplica um prompt (útil para personalizar prompts do sistema). */
  @Auth('mentor', 'super_admin')
  @Post(':id/duplicate')
  async duplicate(@TenantId() mentorId: string, @Param('id') id: string) {
    const found = await this.repo.findOne({ where: { id, mentorId } });
    if (!found) throw new ForbiddenException('Prompt não encontrado');
    return this.repo.save(
      this.repo.create({
        mentorId,
        title: `${found.title} (cópia)`,
        body: found.body,
        category: found.category,
        isSystem: false,
      }),
    );
  }
}
