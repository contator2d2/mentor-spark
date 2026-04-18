import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Between } from 'typeorm';
import { AiUsageLog } from '../../entities/ai-usage-log.entity';
import { User, UserRole } from '../../entities/user.entity';
import { MentorAiConfig } from '../../entities/mentor-ai-config.entity';
import { Auth } from '../auth/auth.decorators';

@Controller('admin/ai-usage')
export class AiUsageAdminController {
  constructor(
    @InjectRepository(AiUsageLog) private logs: Repository<AiUsageLog>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(MentorAiConfig) private cfgs: Repository<MentorAiConfig>,
  ) {}

  /**
   * Resumo agregado por mentor (tenant) para a tela de monitoramento.
   * Query: ?days=30 (default 30) — janela de tempo a considerar.
   */
  @Auth('super_admin')
  @Get()
  async summary(@Query('days') days?: string) {
    const window = Math.max(1, Math.min(365, parseInt(days || '30', 10) || 30));
    const since = new Date(Date.now() - window * 24 * 60 * 60 * 1000);

    const mentors = await this.users.find({ where: { role: UserRole.MENTOR }, order: { createdAt: 'DESC' } });
    const cfgs = await this.cfgs.find();
    const cfgMap = new Map(cfgs.map((c) => [c.mentorId, c]));

    // Busca todos os logs no período
    const recentLogs = await this.logs.find({
      where: { createdAt: MoreThanOrEqual(since) },
    });

    const byMentor = new Map<string, { totalTokens: number; promptTokens: number; completionTokens: number; calls: number; errors: number; lastUsedAt: Date | null }>();
    for (const log of recentLogs) {
      const cur = byMentor.get(log.mentorId) || { totalTokens: 0, promptTokens: 0, completionTokens: 0, calls: 0, errors: 0, lastUsedAt: null };
      cur.totalTokens += log.totalTokens;
      cur.promptTokens += log.promptTokens;
      cur.completionTokens += log.completionTokens;
      cur.calls += 1;
      if (!log.success) cur.errors += 1;
      if (!cur.lastUsedAt || log.createdAt > cur.lastUsedAt) cur.lastUsedAt = log.createdAt;
      byMentor.set(log.mentorId, cur);
    }

    const items = mentors.map((m) => {
      const cfg = cfgMap.get(m.id);
      const usage = byMentor.get(m.id) || { totalTokens: 0, promptTokens: 0, completionTokens: 0, calls: 0, errors: 0, lastUsedAt: null };
      return {
        mentorId: m.id,
        mentorName: m.brandName || m.name,
        email: m.email,
        aiEnabled: cfg?.aiEnabled !== false,
        monthlyTokenLimit: cfg?.monthlyTokenLimit || null,
        ...usage,
      };
    });

    items.sort((a, b) => b.totalTokens - a.totalTokens);

    const total = items.reduce(
      (s, x) => ({
        totalTokens: s.totalTokens + x.totalTokens,
        promptTokens: s.promptTokens + x.promptTokens,
        completionTokens: s.completionTokens + x.completionTokens,
        calls: s.calls + x.calls,
        errors: s.errors + x.errors,
      }),
      { totalTokens: 0, promptTokens: 0, completionTokens: 0, calls: 0, errors: 0 },
    );

    return { window, since: since.toISOString(), total, items };
  }

  /** Detalhe por mentor: últimos N usos */
  @Auth('super_admin')
  @Get(':mentorId')
  async detail(@Param('mentorId') mentorId: string, @Query('limit') limit?: string) {
    const take = Math.max(1, Math.min(500, parseInt(limit || '100', 10) || 100));
    const logs = await this.logs.find({
      where: { mentorId },
      order: { createdAt: 'DESC' },
      take,
    });
    const cfg = await this.cfgs.findOne({ where: { mentorId } });
    const mentor = await this.users.findOne({ where: { id: mentorId } });
    return {
      mentor: mentor ? { id: mentor.id, name: mentor.brandName || mentor.name, email: mentor.email } : null,
      aiEnabled: cfg?.aiEnabled !== false,
      monthlyTokenLimit: cfg?.monthlyTokenLimit || null,
      logs,
    };
  }

  /** Super admin pode forçar ativação/desativação ou setar limite mensal de tokens */
  @Auth('super_admin')
  @Patch(':mentorId')
  async update(
    @Param('mentorId') mentorId: string,
    @Body() body: { aiEnabled?: boolean; monthlyTokenLimit?: number | null },
  ) {
    let cfg = await this.cfgs.findOne({ where: { mentorId } });
    if (!cfg) cfg = this.cfgs.create({ mentorId });
    if (body.aiEnabled !== undefined) cfg.aiEnabled = body.aiEnabled;
    if (body.monthlyTokenLimit !== undefined) cfg.monthlyTokenLimit = body.monthlyTokenLimit ?? undefined;
    await this.cfgs.save(cfg);
    return { ok: true, aiEnabled: cfg.aiEnabled, monthlyTokenLimit: cfg.monthlyTokenLimit };
  }
}
