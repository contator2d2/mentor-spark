import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LibraryTestTemplate, LibrarySegment, LibraryTestKind } from '../../entities/library-test-template.entity';
import { TestTemplate, TestCategory } from '../../entities/test-template.entity';
import { TestQuestion } from '../../entities/test-question.entity';
import { LIBRARY_SEEDS } from './library.seeds';

@Injectable()
export class LibraryService implements OnModuleInit {
  private readonly logger = new Logger('LibraryService');

  constructor(
    @InjectRepository(LibraryTestTemplate) private library: Repository<LibraryTestTemplate>,
    @InjectRepository(TestTemplate) private templates: Repository<TestTemplate>,
    @InjectRepository(TestQuestion) private questions: Repository<TestQuestion>,
  ) {}

  /** Idempotente: cria/atualiza seeds da biblioteca a cada boot */
  async onModuleInit() {
    try {
      for (const seed of LIBRARY_SEEDS) {
        const existing = await this.library.findOne({ where: { seedKey: seed.seedKey } });
        if (existing) {
          await this.library.update(existing.id, {
            segment: seed.segment,
            kind: seed.kind,
            title: seed.title,
            description: seed.description,
            objective: seed.objective,
            categories: seed.categories,
            questions: seed.questions,
            baseInterpretation: seed.baseInterpretation,
            baseReport: seed.baseReport,
            baseRecommendation: seed.baseRecommendation,
            aiAnalysisPrompt: seed.aiAnalysisPrompt,
            active: true,
          });
        } else {
          await this.library.save(this.library.create(seed as any));
        }
      }
      this.logger.log(`Biblioteca de testes sincronizada: ${LIBRARY_SEEDS.length} seeds`);
    } catch (e: any) {
      this.logger.warn(`Falha ao sincronizar biblioteca: ${e.message}`);
    }
  }

  list(filters: { segment?: LibrarySegment; kind?: LibraryTestKind; q?: string }) {
    const qb = this.library.createQueryBuilder('l').where('l.active = true');
    if (filters.segment) qb.andWhere('l.segment = :s', { s: filters.segment });
    if (filters.kind) qb.andWhere('l.kind = :k', { k: filters.kind });
    if (filters.q) qb.andWhere('(l.title ILIKE :q OR l.description ILIKE :q OR l.objective ILIKE :q)', { q: `%${filters.q}%` });
    return qb.orderBy('l.segment', 'ASC').addOrderBy('l.kind', 'ASC').addOrderBy('l.title', 'ASC').getMany();
  }

  async getOne(id: string) {
    const item = await this.library.findOne({ where: { id, active: true } });
    if (!item) throw new NotFoundException('Teste da biblioteca não encontrado');
    return item;
  }

  /** Clona um template da biblioteca para os testes do mentor (cópia editável) */
  async cloneToMentor(libraryId: string, mentorId: string) {
    const lib = await this.getOne(libraryId);

    const tpl = this.templates.create({
      mentorId,
      title: lib.title,
      description: lib.description,
      category: TestCategory.CUSTOM,
      aiAnalysisPrompt: lib.aiAnalysisPrompt,
      categories: lib.categories,
      interpretation: lib.baseInterpretation,
      baseReport: lib.baseReport,
      baseRecommendation: lib.baseRecommendation,
      sourceLibraryId: lib.id,
    });

    tpl.questions = (lib.questions || []).map((q, i) =>
      this.questions.create({
        order: i,
        type: q.type as any,
        text: q.text,
        weight: q.weight || 1,
        config: q.config,
        categoryKey: q.categoryKey,
      } as Partial<TestQuestion>) as TestQuestion,
    );

    const saved = await this.templates.save(tpl);
    return this.templates.findOne({ where: { id: saved.id }, relations: ['questions'] });
  }

  /** Metadados dos segmentos para o frontend */
  getSegments() {
    return [
      { key: 'empresarial', label: 'Empresarial', icon: 'Building2', color: 'blue' },
      { key: 'rh', label: 'RH & Pessoas', icon: 'Users', color: 'pink' },
      { key: 'financeiro', label: 'Financeiro', icon: 'DollarSign', color: 'green' },
      { key: 'juridico', label: 'Jurídico', icon: 'Scale', color: 'amber' },
      { key: 'comercial', label: 'Comercial', icon: 'TrendingUp', color: 'orange' },
      { key: 'lideranca', label: 'Liderança', icon: 'Crown', color: 'purple' },
      { key: 'processos', label: 'Processos', icon: 'Cog', color: 'slate' },
      { key: 'marketing', label: 'Marketing', icon: 'Megaphone', color: 'rose' },
      { key: 'produtividade', label: 'Produtividade', icon: 'Zap', color: 'cyan' },
    ];
  }
}
