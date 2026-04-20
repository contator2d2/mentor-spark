import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AccessGroup, AccessGroupKind } from '../../entities/access-group.entity';
import { AccessGroupMember } from '../../entities/access-group-member.entity';
import { Lead } from '../../entities/lead.entity';
import { EventRegistration, RegistrationStatus } from '../../entities/event-registration.entity';
import { MentorSubscription } from '../../entities/mentor-subscription.entity';

@Injectable()
export class AccessGroupsService {
  private readonly logger = new Logger(AccessGroupsService.name);

  constructor(
    @InjectRepository(AccessGroup) private groups: Repository<AccessGroup>,
    @InjectRepository(AccessGroupMember) private members: Repository<AccessGroupMember>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectRepository(EventRegistration) private regs: Repository<EventRegistration>,
    @InjectRepository(MentorSubscription) private subs: Repository<MentorSubscription>,
  ) {}

  // ---------- CRUD ----------
  async list(mentorId: string) {
    const groups = await this.groups.find({ where: { mentorId }, order: { createdAt: 'DESC' } });
    // anexa contagem de membros (resolvida)
    const out: any[] = [];
    for (const g of groups) {
      const memberLeadIds = await this.resolveMemberLeadIds(g);
      out.push({ ...g, memberCount: memberLeadIds.length });
    }
    return out;
  }

  async getOne(mentorId: string, id: string) {
    const g = await this.groups.findOne({ where: { id, mentorId } });
    if (!g) throw new NotFoundException();
    const memberLeadIds = await this.resolveMemberLeadIds(g);
    const members = memberLeadIds.length
      ? await this.leads.find({ where: { id: In(memberLeadIds), mentorId } })
      : [];
    return { ...g, members, memberCount: members.length };
  }

  create(mentorId: string, dto: Partial<AccessGroup>) {
    return this.groups.save(this.groups.create({
      ...dto,
      mentorId,
      filter: dto.filter || {},
      kind: dto.kind || AccessGroupKind.MANUAL,
    }));
  }

  async update(mentorId: string, id: string, dto: Partial<AccessGroup>) {
    const g = await this.groups.findOne({ where: { id, mentorId } });
    if (!g) throw new NotFoundException();
    Object.assign(g, dto);
    return this.groups.save(g);
  }

  async remove(mentorId: string, id: string) {
    await this.members.delete({ groupId: id });
    await this.groups.delete({ id, mentorId } as any);
    return { ok: true };
  }

  // ---------- Membership manual ----------
  async addMembers(mentorId: string, groupId: string, leadIds: string[]) {
    const g = await this.groups.findOne({ where: { id: groupId, mentorId } });
    if (!g) throw new NotFoundException();
    if (!Array.isArray(leadIds) || !leadIds.length) return { added: 0 };
    // valida que os leads são do mentor
    const valid = await this.leads.find({ where: { id: In(leadIds), mentorId } });
    let added = 0;
    for (const l of valid) {
      try {
        await this.members.save(this.members.create({ groupId, leadId: l.id }));
        added++;
      } catch { /* unique violation -> ignora */ }
    }
    return { added };
  }

  async removeMember(mentorId: string, groupId: string, leadId: string) {
    const g = await this.groups.findOne({ where: { id: groupId, mentorId } });
    if (!g) throw new NotFoundException();
    await this.members.delete({ groupId, leadId });
    return { ok: true };
  }

  /** Importa todos os participantes de um evento como membros manuais (snapshot). */
  async importFromEvent(mentorId: string, groupId: string, eventId: string) {
    const regs = await this.regs.find({ where: { eventId, mentorId } });
    const leadIds = regs.map((r) => r.leadId).filter(Boolean) as string[];
    return this.addMembers(mentorId, groupId, leadIds);
  }

  // ---------- Resolução dinâmica ----------
  /**
   * Retorna a lista (única) de leadIds que pertencem ao grupo:
   *   - membros manuais SEMPRE entram (inclusões extras)
   *   - + membros calculados conforme `kind` + `filter`
   */
  async resolveMemberLeadIds(group: AccessGroup): Promise<string[]> {
    const set = new Set<string>();

    const manual = await this.members.find({ where: { groupId: group.id } });
    manual.forEach((m) => set.add(m.leadId));

    try {
      if (group.kind === AccessGroupKind.EVENT && group.filter?.eventId) {
        const includeNoShow = !!group.filter.includeNoShow;
        const regs = await this.regs.find({ where: { eventId: group.filter.eventId, mentorId: group.mentorId } });
        regs.forEach((r) => {
          if (!r.leadId) return;
          if (!includeNoShow && r.status === RegistrationStatus.NO_SHOW) return;
          set.add(r.leadId);
        });
      } else if (group.kind === AccessGroupKind.TAG && group.filter?.tag) {
        const tag = String(group.filter.tag).toLowerCase().trim();
        const all = await this.leads.find({ where: { mentorId: group.mentorId } });
        all.forEach((l) => {
          const haystack = `${l.source || ''} ${l.notes || ''}`.toLowerCase();
          if (haystack.includes(tag)) set.add(l.id);
        });
      } else if (group.kind === AccessGroupKind.PLAN && group.filter?.planId) {
        // mentor_subscription.userId aponta para o usuário do mentorado (lead.userId)
        const activeSubs = await this.subs.find({ where: { planId: group.filter.planId, mentorId: group.mentorId } });
        const userIds = activeSubs.filter((s: any) => s.status === 'active' || s.status === 'trialing').map((s: any) => s.userId);
        if (userIds.length) {
          const matched = await this.leads.find({ where: { mentorId: group.mentorId, userId: In(userIds) } });
          matched.forEach((l) => set.add(l.id));
        }
      }
    } catch (e: any) {
      this.logger.warn(`resolveMemberLeadIds(${group.id}) falhou: ${e?.message}`);
    }

    return [...set];
  }

  /** Lista os groupIds aos quais um lead pertence (manual + dinâmicos). */
  async groupsOfLead(mentorId: string, leadId: string): Promise<string[]> {
    const all = await this.groups.find({ where: { mentorId } });
    const out: string[] = [];
    for (const g of all) {
      const ids = await this.resolveMemberLeadIds(g);
      if (ids.includes(leadId)) out.push(g.id);
    }
    return out;
  }
}