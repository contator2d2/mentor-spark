import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from '../../entities/plan.entity';
import { User } from '../../entities/user.entity';

export interface ResolvedPlan {
  plan: Plan | null;
  isExpired: boolean;
}

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(Plan) private plans: Repository<Plan>,
    @InjectRepository(User) private users: Repository<User>,
  ) {}

  async getMentorPlan(mentorId: string): Promise<ResolvedPlan> {
    const u = await this.users.findOne({ where: { id: mentorId } });
    if (!u || !u.planId) return { plan: null, isExpired: false };
    const plan = await this.plans.findOne({ where: { id: u.planId } });
    const isExpired = !!u.planExpiresAt && new Date(u.planExpiresAt) < new Date();
    return { plan: plan || null, isExpired };
  }

  /** Retorna feature do plano OU default permissivo se sem plano (modo dev/free) */
  async hasFeature(mentorId: string, feature: keyof Plan): Promise<boolean> {
    const { plan, isExpired } = await this.getMentorPlan(mentorId);
    if (!plan) return true; // sem plano = livre (modo trial). Mude para false em prod.
    if (isExpired) return false;
    return Boolean((plan as any)[feature]);
  }

  /** -1 = ilimitado. Sem plano = ilimitado (trial) */
  async getLimit(mentorId: string, key: 'maxMentorados' | 'maxLeads' | 'maxAiMessagesMonth'): Promise<number> {
    const { plan, isExpired } = await this.getMentorPlan(mentorId);
    if (!plan) return -1;
    if (isExpired) return 0;
    return plan[key] ?? -1;
  }
}
