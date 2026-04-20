import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Trail } from '../../entities/trail.entity';
import { TrailModule as TrailModuleEntity } from '../../entities/trail-module.entity';
import { TrailLesson } from '../../entities/trail-lesson.entity';
import { TrailProgress } from '../../entities/trail-progress.entity';
import { Lead } from '../../entities/lead.entity';
import { TrailAccessService, AccessResult } from '../trail-access/trail-access.service';

@Injectable()
export class TrailsService {
  private readonly logger = new Logger(TrailsService.name);

  constructor(
    @InjectRepository(Trail) private trails: Repository<Trail>,
    @InjectRepository(TrailModuleEntity) private modules: Repository<TrailModuleEntity>,
    @InjectRepository(TrailLesson) private lessons: Repository<TrailLesson>,
    @InjectRepository(TrailProgress) private progress: Repository<TrailProgress>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
    private accessSvc: TrailAccessService,
  ) {}

  // ---------- Mentor: CRUD ----------
  async listForMentor(mentorId: string) {
    if (!mentorId) {
      this.logger.warn('listForMentor chamado sem mentorId — retornando []');
      return [];
    }
    try {
      return await this.trails.find({ where: { mentorId }, order: { createdAt: 'DESC' } });
    } catch (e: any) {
      this.logger.warn(`listForMentor falhou: ${e?.message}. Retornando lista vazia.`);
      return [];
    }
  }

  async getOne(mentorId: string, id: string) {
    const t = await this.trails.findOne({ where: { id, mentorId } });
    if (!t) throw new NotFoundException();
    const mods = await this.modules.find({ where: { trailId: id }, order: { order: 'ASC' } });
    const modIds = mods.map((m) => m.id);
    const lessons = modIds.length
      ? await this.lessons.createQueryBuilder('l')
          .where('l.moduleId IN (:...ids)', { ids: modIds })
          .orderBy('l.order', 'ASC')
          .getMany()
      : [];
    return {
      ...t,
      modules: mods.map((m) => ({ ...m, lessons: lessons.filter((l) => l.moduleId === m.id) })),
    };
  }

  async create(mentorId: string, dto: Partial<Trail>) {
    return this.trails.save(this.trails.create({ ...dto, mentorId }));
  }

  async update(mentorId: string, id: string, dto: Partial<Trail>) {
    const t = await this.trails.findOne({ where: { id, mentorId } });
    if (!t) throw new NotFoundException();
    Object.assign(t, dto);
    return this.trails.save(t);
  }

  async remove(mentorId: string, id: string) {
    await this.trails.delete({ id, mentorId } as any);
    return { ok: true };
  }

  // Modules
  async createModule(mentorId: string, trailId: string, dto: Partial<TrailModuleEntity>) {
    const t = await this.trails.findOne({ where: { id: trailId, mentorId } });
    if (!t) throw new NotFoundException();
    return this.modules.save(this.modules.create({ ...dto, trailId }));
  }
  async updateModule(mentorId: string, id: string, dto: Partial<TrailModuleEntity>) {
    const m = await this.modules.findOne({ where: { id }, relations: ['trail'] });
    if (!m || m.trail?.mentorId !== mentorId) throw new NotFoundException();
    Object.assign(m, dto);
    return this.modules.save(m);
  }
  async removeModule(mentorId: string, id: string) {
    const m = await this.modules.findOne({ where: { id }, relations: ['trail'] });
    if (!m || m.trail?.mentorId !== mentorId) throw new NotFoundException();
    await this.modules.delete(id);
    return { ok: true };
  }

  // Lessons
  async createLesson(mentorId: string, moduleId: string, dto: Partial<TrailLesson>) {
    const m = await this.modules.findOne({ where: { id: moduleId }, relations: ['trail'] });
    if (!m || m.trail?.mentorId !== mentorId) throw new NotFoundException();
    return this.lessons.save(this.lessons.create({ ...dto, moduleId }));
  }
  async updateLesson(mentorId: string, id: string, dto: Partial<TrailLesson>) {
    const l = await this.lessons.findOne({ where: { id }, relations: ['module', 'module.trail'] });
    if (!l || l.module?.trail?.mentorId !== mentorId) throw new NotFoundException();
    Object.assign(l, dto);
    return this.lessons.save(l);
  }
  async removeLesson(mentorId: string, id: string) {
    const l = await this.lessons.findOne({ where: { id }, relations: ['module', 'module.trail'] });
    if (!l || l.module?.trail?.mentorId !== mentorId) throw new NotFoundException();
    await this.lessons.delete(id);
    return { ok: true };
  }

  // ---------- Mentorado: consumo ----------
  async listForMentorado(userId: string, mentorId?: string) {
    const qb = this.trails.createQueryBuilder('t').where('t.published = true');
    if (mentorId) qb.andWhere('t.mentorId = :m', { m: mentorId });
    const all = await qb.getMany();
    const progress = await this.progress.find({ where: { userId } });

    const out: any[] = [];
    for (const t of all) {
      const lead = await this.accessSvc.resolveLeadOf(userId, t.mentorId);
      const access: AccessResult = await this.accessSvc.evaluateTrailAccess(t, lead);
      const trailProgress = progress.filter((p) => p.trailId === t.id);
      const completedCount = trailProgress.filter((p) => p.completed).length;
      out.push({
        ...t,
        completedLessons: completedCount,
        locked: !access.allowed,
        accessReason: access.reason,
        accessMessage: access.message,
        cta: access.cta,
      });
    }
    return out;
  }

  async getForMentorado(userId: string, trailId: string) {
    const t = await this.trails.findOne({ where: { id: trailId, published: true } });
    if (!t) throw new NotFoundException();

    const lead = await this.accessSvc.resolveLeadOf(userId, t.mentorId);
    const access = await this.accessSvc.evaluateTrailAccess(t, lead);
    if (!access.allowed) {
      // devolve metadados mas sem módulos/lições (o front exibe o paywall/cadeado)
      return {
        ...t,
        locked: true,
        accessReason: access.reason,
        accessMessage: access.message,
        cta: access.cta,
        modules: [],
        totalLessons: 0,
        completedLessons: 0,
        allDone: false,
      };
    }

    const mods = await this.modules.find({ where: { trailId }, order: { order: 'ASC' } });
    const modIds = mods.map((m) => m.id);
    const lessons = modIds.length
      ? await this.lessons.createQueryBuilder('l').where('l.moduleId IN (:...ids)', { ids: modIds }).orderBy('l.order', 'ASC').getMany()
      : [];
    const userProgress = await this.progress.find({ where: { userId, trailId } });

    // data de "matrícula" = primeiro acesso/progresso ou createdAt do TrailAccess
    const firstProgress = userProgress.length
      ? userProgress.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))[0]
      : null;
    const enrolledAt = firstProgress?.createdAt || new Date();

    const modulesWithLessons = mods.map((m, idx) => ({
      ...m,
      locked: this.isModuleLocked(t, idx, mods, lessons, userProgress, enrolledAt),
      lessons: lessons.filter((l) => l.moduleId === m.id).map((l) => {
        const p = userProgress.find((x) => x.lessonId === l.id);
        return { ...l, completed: !!p?.completed, progressPercent: p?.progressPercent || 0 };
      }),
    }));

    const totalLessons = lessons.length;
    const completedLessons = userProgress.filter((p) => p.completed).length;
    const allDone = totalLessons > 0 && completedLessons === totalLessons;

    return { ...t, locked: false, modules: modulesWithLessons, totalLessons, completedLessons, allDone };
  }

  private isModuleLocked(
    trail: Trail,
    idx: number,
    mods: TrailModuleEntity[],
    lessons: TrailLesson[],
    progress: TrailProgress[],
    enrolledAt: Date,
  ): boolean {
    const mod = mods[idx];
    // 1) data fixa por módulo
    if (mod.availableAt && new Date(mod.availableAt) > new Date()) return true;
    // 2) drip por dias após inscrição
    if (mod.dripDaysAfterEnroll && mod.dripDaysAfterEnroll > 0) {
      const releaseAt = new Date(+new Date(enrolledAt) + mod.dripDaysAfterEnroll * 86_400_000);
      if (new Date() < releaseAt) return true;
    }
    // 3) pré-requisitos de outros módulos
    if (Array.isArray(mod.prerequisiteModuleIds) && mod.prerequisiteModuleIds.length) {
      for (const pid of mod.prerequisiteModuleIds) {
        const prereqLessons = lessons.filter((l) => l.moduleId === pid);
        if (!prereqLessons.length) continue;
        const done = prereqLessons.every((l) => progress.find((p) => p.lessonId === l.id)?.completed);
        if (!done) return true;
      }
    }
    // 4) modo de liberação da trilha (legado)
    if (idx === 0) return false;
    if (trail.releaseMode === 'immediate') return false;
    if (trail.releaseMode === 'sequential') {
      const prev = mods[idx - 1];
      const prevLessons = lessons.filter((l) => l.moduleId === prev.id);
      const prevDone = prevLessons.every((l) => progress.find((p) => p.lessonId === l.id)?.completed);
      return !prevDone;
    }
    if (trail.releaseMode === 'drip') {
      // libera idx*dripDays após primeira lição completada
      const releaseAt = new Date(+new Date(enrolledAt) + idx * trail.dripDays * 86_400_000);
      return new Date() < releaseAt;
    }
    return false;
  }

  async markLessonCompleted(userId: string, lessonId: string, percent = 100) {
    const lesson = await this.lessons.findOne({ where: { id: lessonId }, relations: ['module'] });
    if (!lesson) throw new NotFoundException();
    let p = await this.progress.findOne({ where: { userId, lessonId } });
    if (!p) {
      p = this.progress.create({
        userId,
        lessonId,
        moduleId: lesson.moduleId,
        trailId: lesson.module!.trailId,
      });
    }
    p.progressPercent = Math.max(p.progressPercent, percent);
    if (percent >= 90) {
      p.completed = true;
      p.completedAt = new Date();
    }
    return this.progress.save(p);
  }

  async getCertificate(userId: string, trailId: string) {
    const data = await this.getForMentorado(userId, trailId);
    if (!data.allDone) throw new NotFoundException('Trilha ainda não concluída');
    return {
      trail: { id: data.id, title: data.title },
      issuedAt: new Date(),
      verificationCode: `CERT-${userId.slice(0, 6).toUpperCase()}-${trailId.slice(0, 6).toUpperCase()}`,
    };
  }
}
