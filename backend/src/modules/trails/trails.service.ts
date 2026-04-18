import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trail } from '../../entities/trail.entity';
import { TrailModule as TrailModuleEntity } from '../../entities/trail-module.entity';
import { TrailLesson } from '../../entities/trail-lesson.entity';
import { TrailProgress } from '../../entities/trail-progress.entity';

@Injectable()
export class TrailsService {
  constructor(
    @InjectRepository(Trail) private trails: Repository<Trail>,
    @InjectRepository(TrailModuleEntity) private modules: Repository<TrailModuleEntity>,
    @InjectRepository(TrailLesson) private lessons: Repository<TrailLesson>,
    @InjectRepository(TrailProgress) private progress: Repository<TrailProgress>,
  ) {}

  // ---------- Mentor: CRUD ----------
  async listForMentor(mentorId: string) {
    return this.trails.find({ where: { mentorId }, order: { createdAt: 'DESC' } });
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
    const qb = this.trails.createQueryBuilder('t')
      .where('t.published = true');
    if (mentorId) qb.andWhere('t.mentorId = :m', { m: mentorId });
    const all = await qb.getMany();
    const progress = await this.progress.find({ where: { userId } });
    return all.map((t) => {
      const trailLessons = progress.filter((p) => p.trailId === t.id);
      const completedCount = trailLessons.filter((p) => p.completed).length;
      return { ...t, completedLessons: completedCount };
    });
  }

  async getForMentorado(userId: string, trailId: string) {
    const t = await this.trails.findOne({ where: { id: trailId, published: true } });
    if (!t) throw new NotFoundException();
    const mods = await this.modules.find({ where: { trailId }, order: { order: 'ASC' } });
    const modIds = mods.map((m) => m.id);
    const lessons = modIds.length
      ? await this.lessons.createQueryBuilder('l').where('l.moduleId IN (:...ids)', { ids: modIds }).orderBy('l.order', 'ASC').getMany()
      : [];
    const userProgress = await this.progress.find({ where: { userId, trailId } });

    const modulesWithLessons = mods.map((m, idx) => ({
      ...m,
      locked: this.isModuleLocked(t, idx, mods, lessons, userProgress),
      lessons: lessons.filter((l) => l.moduleId === m.id).map((l) => {
        const p = userProgress.find((x) => x.lessonId === l.id);
        return { ...l, completed: !!p?.completed, progressPercent: p?.progressPercent || 0 };
      }),
    }));

    const totalLessons = lessons.length;
    const completedLessons = userProgress.filter((p) => p.completed).length;
    const allDone = totalLessons > 0 && completedLessons === totalLessons;

    return { ...t, modules: modulesWithLessons, totalLessons, completedLessons, allDone };
  }

  private isModuleLocked(trail: Trail, idx: number, mods: TrailModuleEntity[], lessons: TrailLesson[], progress: TrailProgress[]): boolean {
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
      const first = progress.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))[0];
      if (!first) return true;
      const releaseAt = new Date(+new Date(first.createdAt) + idx * trail.dripDays * 86_400_000);
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
