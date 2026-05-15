import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Demand, DemandStatus } from '../../entities/demand.entity';
import { DemandVersion } from '../../entities/demand-version.entity';
import { DemandComment } from '../../entities/demand-comment.entity';
import { AiService } from '../ai/ai.service';

@Injectable()
export class DemandsService {
  constructor(
    @InjectRepository(Demand) private repo: Repository<Demand>,
    @InjectRepository(DemandVersion) private versions: Repository<DemandVersion>,
    @InjectRepository(DemandComment) private comments: Repository<DemandComment>,
    private ai: AiService,
  ) {}

  async list(mentorId: string) {
    return this.repo.find({
      where: { mentorId },
      relations: ['responsible', 'agency'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(mentorId: string, id: string) {
    const demand = await this.repo.findOne({
      where: { id, mentorId },
      relations: ['responsible', 'agency'],
    });
    if (!demand) throw new NotFoundException('Demanda não encontrada');
    
    const versions = await this.versions.find({
      where: { demandId: id },
      relations: ['creator'],
      order: { versionNumber: 'DESC' },
    });

    const comments = await this.comments.find({
      where: { demandId: id },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });

    return { ...demand, versions, comments };
  }

  async create(mentorId: string, dto: any) {
    const demand = this.repo.create({
      ...dto,
      mentorId,
      status: DemandStatus.NEW,
      desiredDeadline: dto.desiredDeadline ? new Date(dto.desiredDeadline) : undefined,
    });
    return this.repo.save(demand);
  }

  async update(mentorId: string, id: string, dto: any) {
    const demand = await this.repo.findOne({ where: { id, mentorId } });
    if (!demand) throw new NotFoundException();
    
    if (dto.desiredDeadline) dto.desiredDeadline = new Date(dto.desiredDeadline);
    if (dto.definedDeadline) dto.definedDeadline = new Date(dto.definedDeadline);
    
    Object.assign(demand, dto);
    return this.repo.save(demand);
  }

  async delete(mentorId: string, id: string) {
    await this.repo.delete({ id, mentorId } as any);
    return { ok: true };
  }

  async addVersion(mentorId: string, demandId: string, userId: string, dto: any) {
    const demand = await this.repo.findOne({ where: { id: demandId, mentorId } });
    if (!demand) throw new NotFoundException();

    const last = await this.versions.findOne({
      where: { demandId },
      order: { versionNumber: 'DESC' },
    });
    const nextVersion = (last?.versionNumber ?? 0) + 1;

    const version = this.versions.create({
      demandId,
      createdByUserId: userId,
      versionNumber: nextVersion,
      files: dto.files,
      comment: dto.comment,
    });

    await this.versions.save(version);
    
    if (demand.status === DemandStatus.PRODUCTION || demand.status === DemandStatus.ADJUSTMENTS) {
        await this.repo.update(demandId, { status: DemandStatus.WAITING_FEEDBACK });
    }

    return version;
  }

  async addComment(mentorId: string, demandId: string, userId: string, dto: any) {
    const demand = await this.repo.findOne({ where: { id: demandId, mentorId } });
    if (!demand) throw new NotFoundException();

    const comment = this.comments.create({
      demandId,
      userId,
      text: dto.text,
      attachments: dto.attachments,
    });

    return this.comments.save(comment);
  }

  async generateBriefing(mentorId: string, dto: { title: string; type: string; description?: string }) {
    const prompt = `Gerar um briefing detalhado para uma demanda de marketing do tipo "${dto.type}".
Título: ${dto.title}
Descrição inicial: ${dto.description || 'Não informada'}

Retorne um JSON com os campos: objective, targetAudience, essentialItems (lista), style (descrição do tom/estilo).`;

    const raw = await this.ai.chat('Você é um especialista em marketing e produção de conteúdo.', prompt, { mentorId, useCase: 'demand_briefing' });
    try {
      const jsonStr = raw.replace(/^```json\s*|```$/g, '').trim();
      return JSON.parse(jsonStr);
    } catch {
      return { objective: raw };
    }
  }
}
