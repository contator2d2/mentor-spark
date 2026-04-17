import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GamificationProfile } from '../../entities/gamification.entity';

const LEVEL_XP = (lvl: number) => 100 * lvl * lvl; // XP necessário pro próximo nível

const BADGES: Array<{ id: string; name: string; condition: (p: GamificationProfile) => boolean }> = [
  { id: 'first_step', name: 'Primeiro passo', condition: (p) => p.xp >= 10 },
  { id: 'rookie', name: 'Iniciante', condition: (p) => p.xp >= 100 },
  { id: 'committed', name: 'Comprometido', condition: (p) => p.xp >= 500 },
  { id: 'expert', name: 'Especialista', condition: (p) => p.xp >= 2000 },
  { id: 'streak_3', name: 'Sequência 3 dias', condition: (p) => p.streakDays >= 3 },
  { id: 'streak_7', name: 'Sequência 7 dias', condition: (p) => p.streakDays >= 7 },
  { id: 'streak_30', name: 'Sequência 30 dias', condition: (p) => p.streakDays >= 30 },
];

@Injectable()
export class GamificationService {
  constructor(@InjectRepository(GamificationProfile) private repo: Repository<GamificationProfile>) {}

  async getOrCreate(userId: string, mentorId?: string) {
    let p = await this.repo.findOne({ where: { userId } });
    if (!p) p = await this.repo.save(this.repo.create({ userId, mentorId, xp: 0, level: 1, badges: [], streakDays: 0 }));
    return p;
  }

  async addXp(userId: string, xp: number, reason?: string) {
    const p = await this.getOrCreate(userId);
    p.xp += xp;
    // Atualiza streak
    const now = new Date();
    if (p.lastActivityAt) {
      const last = new Date(p.lastActivityAt);
      const diffDays = Math.floor((now.getTime() - last.getTime()) / 86400000);
      if (diffDays === 1) p.streakDays += 1;
      else if (diffDays > 1) p.streakDays = 1;
    } else {
      p.streakDays = 1;
    }
    p.lastActivityAt = now;
    // Sobe de nível
    while (p.xp >= LEVEL_XP(p.level)) p.level += 1;
    // Badges
    const earned = new Set(p.badges || []);
    for (const b of BADGES) if (b.condition(p)) earned.add(b.id);
    p.badges = Array.from(earned);
    return this.repo.save(p);
  }

  async leaderboard(mentorId: string, limit = 10) {
    return this.repo.find({ where: { mentorId }, order: { xp: 'DESC' }, take: limit });
  }

  static BADGES = BADGES;
}
