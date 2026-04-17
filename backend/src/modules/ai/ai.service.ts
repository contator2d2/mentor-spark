import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MentorAiConfig } from '../../entities/mentor-ai-config.entity';
import { Prompt } from '../../entities/prompt.entity';
import { Lead, LeadTemperature } from '../../entities/lead.entity';
import { Meeting } from '../../entities/meeting.entity';
import { TestResponse } from '../../entities/test-response.entity';
import { AiProvider, AiProviderType } from '../../entities/ai-provider.entity';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private cachedDefault: AiProvider | null = null;
  private cachedAt = 0;

  constructor(
    @InjectRepository(MentorAiConfig) private cfgs: Repository<MentorAiConfig>,
    @InjectRepository(Prompt) private prompts: Repository<Prompt>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectRepository(Meeting) private meetings: Repository<Meeting>,
    @InjectRepository(TestResponse) private responses: Repository<TestResponse>,
    @InjectRepository(AiProvider) private providers: Repository<AiProvider>,
  ) {}

  invalidateProviderCache() {
    this.cachedDefault = null;
    this.cachedAt = 0;
  }

  /** Pega o provider default global do banco (cache 60s). */
  private async getDefaultProvider(): Promise<AiProvider | null> {
    if (this.cachedDefault && Date.now() - this.cachedAt < 60_000) return this.cachedDefault;
    const p = await this.providers.findOne({ where: { isDefault: true, enabled: true } });
    this.cachedDefault = p || null;
    this.cachedAt = Date.now();
    return this.cachedDefault;
  }

  // ---------- Mentor config ----------
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

  // ---------- Provider dispatch ----------
  /** Chamada genérica de chat. Roteia para o provider default cadastrado pelo super_admin. */
  async chat(systemPrompt: string, userMessage: string): Promise<string> {
    const provider = await this.getDefaultProvider();
    if (!provider) {
      this.logger.warn('Nenhum AiProvider default cadastrado — retornando mock.');
      return `[IA mockada] Nenhum provider de IA configurado. Acesse Admin → Provedores de IA e cadastre um (OpenAI, Gemini, etc.).\n\nResposta simulada para: "${userMessage.slice(0, 120)}..."`;
    }
    return this.chatWithProvider(provider, systemPrompt, userMessage);
  }

  /** Permite testar um provider específico (usado pelo botão "Testar" no admin). */
  async testProvider(provider: AiProvider): Promise<string> {
    return this.chatWithProvider(
      provider,
      'Você é um assistente útil.',
      'Diga "OK" e o nome do modelo que você é, em uma frase curta.',
    );
  }

  private async chatWithProvider(provider: AiProvider, systemPrompt: string, userMessage: string): Promise<string> {
    try {
      switch (provider.type) {
        case AiProviderType.GEMINI:
          return await this.callGemini(provider, systemPrompt, userMessage);
        case AiProviderType.ANTHROPIC:
          return await this.callAnthropic(provider, systemPrompt, userMessage);
        case AiProviderType.OPENAI:
        case AiProviderType.OPENAI_COMPATIBLE:
        default:
          return await this.callOpenAICompatible(provider, systemPrompt, userMessage);
      }
    } catch (e: any) {
      this.logger.error(`AI provider ${provider.name} error: ${e?.message}`);
      return `Erro ao consultar IA (${provider.name}): ${e?.message || e}`;
    }
  }

  /** OpenAI + qualquer endpoint compatível (OpenRouter, Groq, Together, Lovable AI Gateway, etc.) */
  private async callOpenAICompatible(provider: AiProvider, systemPrompt: string, userMessage: string): Promise<string> {
    const baseUrl = (provider.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
    const url = `${baseUrl}/chat/completions`;
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.5,
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`HTTP ${r.status}: ${t.slice(0, 300)}`);
    }
    const j: any = await r.json();
    return j?.choices?.[0]?.message?.content || '';
  }

  /** Google Gemini (REST v1beta). */
  private async callGemini(provider: AiProvider, systemPrompt: string, userMessage: string): Promise<string> {
    const baseUrl = (provider.baseUrl || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
    const url = `${baseUrl}/models/${encodeURIComponent(provider.model)}:generateContent?key=${encodeURIComponent(provider.apiKey)}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.5 },
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`HTTP ${r.status}: ${t.slice(0, 300)}`);
    }
    const j: any = await r.json();
    return j?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('\n') || '';
  }

  /** Anthropic Claude (Messages API). */
  private async callAnthropic(provider: AiProvider, systemPrompt: string, userMessage: string): Promise<string> {
    const baseUrl = (provider.baseUrl || 'https://api.anthropic.com/v1').replace(/\/$/, '');
    const url = `${baseUrl}/messages`;
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': provider.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`HTTP ${r.status}: ${t.slice(0, 300)}`);
    }
    const j: any = await r.json();
    return j?.content?.map((c: any) => c.text).join('\n') || '';
  }

  // ---------- Casos de uso (não mudam) ----------
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
    const classification =
      (match?.[1]?.toLowerCase() as LeadTemperature) ||
      (response.scorePct >= 70 ? LeadTemperature.HOT : response.scorePct >= 40 ? LeadTemperature.WARM : LeadTemperature.COLD);
    const cleaned = text.replace(/CLASSIFICATION=.+$/i, '').trim();
    return { analysis: cleaned, classification };
  }

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
