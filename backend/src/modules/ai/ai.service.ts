import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';

import { MentorAiConfig } from '../../entities/mentor-ai-config.entity';
import { Prompt } from '../../entities/prompt.entity';
import { Lead, LeadTemperature } from '../../entities/lead.entity';
import { Meeting } from '../../entities/meeting.entity';
import { TestResponse } from '../../entities/test-response.entity';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: OpenAI | null = null;

  constructor(
    @InjectRepository(MentorAiConfig) private cfgs: Repository<MentorAiConfig>,
    @InjectRepository(Prompt) private prompts: Repository<Prompt>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectRepository(Meeting) private meetings: Repository<Meeting>,
    @InjectRepository(TestResponse) private responses: Repository<TestResponse>,
  ) {}

  private getClient() {
    if (this.client) return this.client;
    if (!process.env.OPENAI_API_KEY) return null;
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return this.client;
  }

  async getMentorConfig(mentorId: string) {
    let cfg = await this.cfgs.findOne({ where: { mentorId } });
    if (!cfg) {
      cfg = this.cfgs.create({
        mentorId,
        systemPrompt: 'Você é um assistente de mentoria empresarial estratégico, claro e objetivo.',
        methodology: '',
        responseStyle: 'Profissional, direto, em português brasileiro.',
        focusAreas: 'Vendas, Financeiro, Liderança, Operações',
      });
      await this.cfgs.save(cfg);
    }
    return cfg;
  }

  async updateMentorConfig(mentorId: string, dto: Partial<MentorAiConfig>) {
    const cfg = await this.getMentorConfig(mentorId);
    Object.assign(cfg, dto);
    return this.cfgs.save(cfg);
  }

  /** Chamada genérica de chat com fallback se OPENAI_API_KEY não configurado */
  async chat(systemPrompt: string, userMessage: string): Promise<string> {
    const client = this.getClient();
    if (!client) {
      this.logger.warn('OPENAI_API_KEY ausente — retornando resposta mockada.');
      return `[IA mockada] Configure OPENAI_API_KEY no backend.\n\nResposta simulada para: "${userMessage.slice(0, 120)}..."`;
    }
    try {
      const r = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.5,
      });
      return r.choices[0]?.message?.content || '';
    } catch (e: any) {
      this.logger.error('OpenAI error', e?.message);
      return `Erro ao consultar IA: ${e?.message || e}`;
    }
  }

  /** Análise de teste: gera texto + classificação */
  async analyzeTestResponse(mentorId: string, response: TestResponse, customPrompt?: string) {
    const cfg = await this.getMentorConfig(mentorId);
    const sys =
      (cfg.systemPrompt || '') +
      `\nMetodologia do mentor: ${cfg.methodology || '-'}\nEstilo: ${cfg.responseStyle || '-'}\nFoco: ${cfg.focusAreas || '-'}`;

    const prompt = `${customPrompt || 'Analise este resultado de teste empresarial e produza:'}
1) Diagnóstico em 4-6 linhas
2) 3 principais gargalos
3) Recomendação inicial estratégica
4) Classificação do prospect (frio | morno | quente) baseada no score ${response.scorePct}%

Respostas (JSON): ${JSON.stringify(response.answers).slice(0, 4000)}
Score: ${response.totalScore}/${response.maxScore} (${response.scorePct}%)

Retorne em texto estruturado em português, e na ÚLTIMA linha escreva apenas: CLASSIFICATION=cold|warm|hot`;
    const text = await this.chat(sys, prompt);
    const match = text.match(/CLASSIFICATION=(cold|warm|hot)/i);
    const classification = (match?.[1]?.toLowerCase() as LeadTemperature) || (response.scorePct >= 70 ? LeadTemperature.HOT : response.scorePct >= 40 ? LeadTemperature.WARM : LeadTemperature.COLD);
    const cleaned = text.replace(/CLASSIFICATION=.+$/i, '').trim();
    return { analysis: cleaned, classification };
  }

  /** Resumo de reunião a partir de transcrição */
  async summarizeMeeting(mentorId: string, transcript: string) {
    const cfg = await this.getMentorConfig(mentorId);
    const sys = cfg.systemPrompt || 'Você é um assistente de mentoria empresarial.';
    const prompt = `Transcrição da reunião:\n"""${transcript.slice(0, 12000)}"""\n\nProduza:
- Resumo (4-6 linhas)
- Pontos principais (lista)
- Decisões tomadas (lista)
- Próximas ações (lista com responsável quando possível)

Retorne em JSON válido com chaves: summary, keyPoints[], decisions[], nextActions[].`;
    const raw = await this.chat(sys, prompt);
    try {
      const json = JSON.parse(raw.replace(/^```json\s*|```$/g, '').trim());
      return {
        summary: json.summary || '',
        insights: { keyPoints: json.keyPoints || [], decisions: json.decisions || [], nextActions: json.nextActions || [] },
      };
    } catch {
      return { summary: raw, insights: { keyPoints: [], decisions: [], nextActions: [] } };
    }
  }

  /** Chat livre do mentor com contexto opcional de um lead */
  async assistantChat(mentorId: string, message: string, leadId?: string) {
    const cfg = await this.getMentorConfig(mentorId);
    let context = '';
    if (leadId) {
      const lead = await this.leads.findOne({ where: { id: leadId, mentorId } });
      const tests = await this.responses.find({ where: { leadId, mentorId }, order: { createdAt: 'DESC' }, take: 3 });
      const meetings = await this.meetings.find({ where: { leadId, mentorId }, order: { createdAt: 'DESC' }, take: 3 });
      context = `\nContexto do mentorado:\n- Nome: ${lead?.name}\n- Empresa: ${lead?.company || '-'}\n- Fase: ${lead?.stage}\n- Temperatura: ${lead?.temperature || '-'}\n- Últimos testes: ${tests.map((t) => `${t.scorePct}%`).join(', ') || '-'}\n- Últimas reuniões: ${meetings.map((m) => m.title).join('; ') || '-'}`;
    }
    const sys =
      (cfg.systemPrompt || '') +
      `\nMetodologia: ${cfg.methodology || '-'}\nEstilo: ${cfg.responseStyle || '-'}` +
      context;
    return this.chat(sys, message);
  }
}
