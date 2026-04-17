import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TestTemplate } from '../../entities/test-template.entity';
import { TestQuestion, QuestionType } from '../../entities/test-question.entity';
import { TestResponse } from '../../entities/test-response.entity';
import { Lead, LeadStage } from '../../entities/lead.entity';
import { AiService } from '../ai/ai.service';

@Injectable()
export class TestsService {
  constructor(
    @InjectRepository(TestTemplate) private templates: Repository<TestTemplate>,
    @InjectRepository(TestQuestion) private questions: Repository<TestQuestion>,
    @InjectRepository(TestResponse) private responses: Repository<TestResponse>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
    private ai: AiService,
  ) {}

  listTemplates(mentorId: string) {
    return this.templates.find({ where: { mentorId }, relations: ['questions'], order: { createdAt: 'DESC' } });
  }

  async getTemplate(mentorId: string, id: string) {
    const t = await this.templates.findOne({ where: { id, mentorId }, relations: ['questions'] });
    if (!t) throw new NotFoundException('Teste não encontrado');
    t.questions = (t.questions || []).sort((a, b) => a.order - b.order);
    return t;
  }

  async createTemplate(mentorId: string, dto: { title: string; description?: string; category?: any; aiAnalysisPrompt?: string; questions?: any[] }) {
    const t = this.templates.create({ mentorId, title: dto.title, description: dto.description, category: dto.category, aiAnalysisPrompt: dto.aiAnalysisPrompt });
    if (dto.questions?.length) {
      t.questions = dto.questions.map((q, i) => this.questions.create({ ...q, order: i }));
    }
    return this.templates.save(t);
  }

  async updateTemplate(mentorId: string, id: string, dto: any) {
    await this.getTemplate(mentorId, id);
    if (dto.questions) {
      await this.questions.delete({ templateId: id });
    }
    const t = await this.templates.preload({ id, ...dto, mentorId });
    if (dto.questions) {
      t.questions = dto.questions.map((q: any, i: number) => this.questions.create({ ...q, order: i, templateId: id }));
    }
    await this.templates.save(t);
    return this.getTemplate(mentorId, id);
  }

  async deleteTemplate(mentorId: string, id: string) {
    await this.getTemplate(mentorId, id);
    await this.templates.delete(id);
    return { ok: true };
  }

  /** Endpoint público (lead respondendo): aceita leadId + answers, calcula score, dispara IA */
  async submitResponse(params: { mentorId: string; templateId: string; leadId: string; answers: Array<{ questionId: string; answer: any }> }) {
    const template = await this.templates.findOne({ where: { id: params.templateId, mentorId: params.mentorId }, relations: ['questions'] });
    if (!template) throw new NotFoundException('Teste não encontrado');
    const lead = await this.leads.findOne({ where: { id: params.leadId, mentorId: params.mentorId } });
    if (!lead) throw new NotFoundException('Lead não encontrado');

    let total = 0;
    let max = 0;
    const enriched = params.answers.map((a) => {
      const q = template.questions.find((qq) => qq.id === a.questionId);
      if (!q) return { ...a, scoreEarned: 0 };
      const weight = q.weight || 1;
      let earned = 0;
      let qmax = 0;
      if (q.type === QuestionType.MULTIPLE_CHOICE) {
        const opts: Array<{ label: string; score: number }> = q.config?.options || [];
        qmax = Math.max(...opts.map((o) => o.score || 0), 0);
        const chosen = opts.find((o) => o.label === a.answer);
        earned = chosen?.score || 0;
      } else if (q.type === QuestionType.SCALE) {
        const min = q.config?.min ?? 1;
        const maxV = q.config?.max ?? 10;
        qmax = maxV;
        earned = Math.min(maxV, Math.max(min, Number(a.answer) || 0));
      } else {
        qmax = 0; // texto aberto não pontua
      }
      total += earned * weight;
      max += qmax * weight;
      return { ...a, scoreEarned: earned * weight };
    });

    const scorePct = max > 0 ? Math.round((total / max) * 10000) / 100 : 0;

    const response = await this.responses.save(
      this.responses.create({
        templateId: template.id,
        leadId: lead.id,
        mentorId: params.mentorId,
        answers: enriched,
        totalScore: total,
        maxScore: max,
        scorePct,
      }),
    );

    // IA — análise + classificação
    try {
      const { analysis, classification } = await this.ai.analyzeTestResponse(params.mentorId, response, template.aiAnalysisPrompt);
      response.aiAnalysis = analysis;
      response.classification = classification;
      await this.responses.save(response);

      // atualiza lead
      lead.temperature = classification as any;
      lead.score = scorePct;
      if (lead.stage === LeadStage.NEW) lead.stage = LeadStage.TESTED;
      await this.leads.save(lead);
    } catch (e) {
      // não falha o submit por causa da IA
    }

    return response;
  }

  async listResponses(mentorId: string, leadId?: string) {
    const where: any = { mentorId };
    if (leadId) where.leadId = leadId;
    return this.responses.find({ where, order: { createdAt: 'DESC' }, relations: ['template'] });
  }

  async getResponse(mentorId: string, id: string) {
    return this.responses.findOne({ where: { id, mentorId }, relations: ['template', 'lead'] });
  }
}
