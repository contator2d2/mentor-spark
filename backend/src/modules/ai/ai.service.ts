import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MentorAiConfig } from '../../entities/mentor-ai-config.entity';
import { Prompt } from '../../entities/prompt.entity';
import { Lead, LeadTemperature } from '../../entities/lead.entity';
import { Meeting } from '../../entities/meeting.entity';
import { TestResponse } from '../../entities/test-response.entity';
import { AiProvider, AiProviderType } from '../../entities/ai-provider.entity';
import { AiUsageLog } from '../../entities/ai-usage-log.entity';

interface ChatResult {
  text: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private cachedDefault: AiProvider | null = null;
  private cachedTranscription: AiProvider | null = null;
  private cachedAt = 0;

  constructor(
    @InjectRepository(MentorAiConfig) private cfgs: Repository<MentorAiConfig>,
    @InjectRepository(Prompt) private prompts: Repository<Prompt>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectRepository(Meeting) private meetings: Repository<Meeting>,
    @InjectRepository(TestResponse) private responses: Repository<TestResponse>,
    @InjectRepository(AiProvider) private providers: Repository<AiProvider>,
    @InjectRepository(AiUsageLog) private usageLogs: Repository<AiUsageLog>,
  ) {}

  invalidateProviderCache() {
    this.cachedDefault = null;
    this.cachedTranscription = null;
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

  /** Pega o provider marcado para transcrição de áudio (Whisper). */
  async getTranscriptionProvider(): Promise<AiProvider | null> {
    if (this.cachedTranscription && Date.now() - this.cachedAt < 60_000) return this.cachedTranscription;
    const p = await this.providers.findOne({ where: { useForTranscription: true, enabled: true } });
    this.cachedTranscription = p || null;
    return this.cachedTranscription;
  }

  // ---------- Mentor config ----------
  async getMentorConfig(mentorId: string) {
    let cfg = await this.cfgs.findOne({ where: { mentorId } });
    if (!cfg) {
      cfg = this.cfgs.create({
        mentorId,
        aiEnabled: true,
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

  /** Verifica se a IA está habilitada para o mentor. Lança 403 se não. */
  async assertAiEnabled(mentorId: string) {
    const cfg = await this.getMentorConfig(mentorId);
    if (cfg.aiEnabled === false) {
      throw new ForbiddenException('Assistente IA está desativado. Ative em Assistente IA → Configurações.');
    }
    return cfg;
  }

  // ---------- Provider dispatch ----------
  /** Chamada genérica de chat. Roteia para o provider default cadastrado pelo super_admin.
   * Se mentorId for fornecido: bloqueia se IA desativada e loga o uso de tokens.
   */
  async chat(systemPrompt: string, userMessage: string, opts?: { mentorId?: string; useCase?: string }): Promise<string> {
    if (opts?.mentorId) {
      await this.assertAiEnabled(opts.mentorId);
    }
    const provider = await this.getDefaultProvider();
    if (!provider) {
      this.logger.warn('Nenhum AiProvider default cadastrado — retornando mock.');
      return `[IA mockada] Nenhum provider de IA configurado. Acesse Admin → Provedores de IA e cadastre um (OpenAI, Gemini, etc.).\n\nResposta simulada para: "${userMessage.slice(0, 120)}..."`;
    }

    const startedAt = Date.now();
    let result: ChatResult;
    let success = true;
    let errorMessage: string | null = null;
    try {
      result = await this.chatWithProvider(provider, systemPrompt, userMessage);
    } catch (e: any) {
      success = false;
      errorMessage = e?.message || String(e);
      result = { text: `Erro ao consultar IA (${provider.name}): ${errorMessage}`, promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    }

    if (opts?.mentorId) {
      await this.usageLogs.save(this.usageLogs.create({
        mentorId: opts.mentorId,
        providerId: provider.id,
        providerName: provider.name,
        model: provider.model,
        useCase: opts.useCase || 'chat',
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        totalTokens: result.totalTokens,
        latencyMs: Date.now() - startedAt,
        success,
        errorMessage: errorMessage || undefined,
      })).catch((e) => this.logger.error(`Falha ao logar uso de IA: ${e.message}`));
    }

    return result.text;
  }

  /** Permite testar um provider específico (usado pelo botão "Testar" no admin). */
  async testProvider(provider: AiProvider): Promise<string> {
    const r = await this.chatWithProvider(
      provider,
      'Você é um assistente útil.',
      'Diga "OK" e o nome do modelo que você é, em uma frase curta.',
    );
    return r.text;
  }

  private async chatWithProvider(provider: AiProvider, systemPrompt: string, userMessage: string): Promise<ChatResult> {
    switch (provider.type) {
      case AiProviderType.GEMINI:
        return this.callGemini(provider, systemPrompt, userMessage);
      case AiProviderType.ANTHROPIC:
        return this.callAnthropic(provider, systemPrompt, userMessage);
      case AiProviderType.OPENAI:
      case AiProviderType.OPENAI_COMPATIBLE:
      default:
        return this.callOpenAICompatible(provider, systemPrompt, userMessage);
    }
  }

  /** Estimativa simples de tokens quando o provider não retorna usage (fallback). */
  private estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4); // heurística clássica ~4 chars/token
  }

  /** OpenAI + qualquer endpoint compatível (OpenRouter, Groq, Together, Lovable AI Gateway, etc.) */
  private async callOpenAICompatible(provider: AiProvider, systemPrompt: string, userMessage: string): Promise<ChatResult> {
    const baseUrl = (provider.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
    const url = `${baseUrl}/chat/completions`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.apiKey}` },
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
    const text = j?.choices?.[0]?.message?.content || '';
    const usage = j?.usage || {};
    return {
      text,
      promptTokens: usage.prompt_tokens ?? this.estimateTokens(systemPrompt + userMessage),
      completionTokens: usage.completion_tokens ?? this.estimateTokens(text),
      totalTokens: usage.total_tokens ?? this.estimateTokens(systemPrompt + userMessage + text),
    };
  }

  /** Google Gemini (REST v1beta). */
  private async callGemini(provider: AiProvider, systemPrompt: string, userMessage: string): Promise<ChatResult> {
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
    const text = j?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('\n') || '';
    const usage = j?.usageMetadata || {};
    return {
      text,
      promptTokens: usage.promptTokenCount ?? this.estimateTokens(systemPrompt + userMessage),
      completionTokens: usage.candidatesTokenCount ?? this.estimateTokens(text),
      totalTokens: usage.totalTokenCount ?? this.estimateTokens(systemPrompt + userMessage + text),
    };
  }

  /** Anthropic Claude (Messages API). */
  private async callAnthropic(provider: AiProvider, systemPrompt: string, userMessage: string): Promise<ChatResult> {
    const baseUrl = (provider.baseUrl || 'https://api.anthropic.com/v1').replace(/\/$/, '');
    const url = `${baseUrl}/messages`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': provider.apiKey, 'anthropic-version': '2023-06-01' },
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
    const text = j?.content?.map((c: any) => c.text).join('\n') || '';
    const usage = j?.usage || {};
    return {
      text,
      promptTokens: usage.input_tokens ?? this.estimateTokens(systemPrompt + userMessage),
      completionTokens: usage.output_tokens ?? this.estimateTokens(text),
      totalTokens: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0) || this.estimateTokens(systemPrompt + userMessage + text),
    };
  }

  // ---------- Casos de uso ----------
  async analyzeTestResponse(mentorId: string, response: TestResponse, customPrompt?: string) {
    const cfg = await this.getMentorConfig(mentorId);
    if (cfg.aiEnabled === false) {
      // IA desativada: retorna classificação heurística sem chamar provider
      const classification = response.scorePct >= 70 ? LeadTemperature.HOT : response.scorePct >= 40 ? LeadTemperature.WARM : LeadTemperature.COLD;
      return { analysis: 'Análise IA desativada para esta conta.', classification };
    }
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
    const text = await this.chat(sys, prompt, { mentorId, useCase: 'analyze_test' });
    const match = text.match(/CLASSIFICATION=(cold|warm|hot)/i);
    const classification =
      (match?.[1]?.toLowerCase() as LeadTemperature) ||
      (response.scorePct >= 70 ? LeadTemperature.HOT : response.scorePct >= 40 ? LeadTemperature.WARM : LeadTemperature.COLD);
    const cleaned = text.replace(/CLASSIFICATION=.+$/i, '').trim();
    return { analysis: cleaned, classification };
  }

  async summarizeMeeting(mentorId: string, transcript: string) {
    const cfg = await this.getMentorConfig(mentorId);
    if (cfg.aiEnabled === false) {
      return { summary: 'Análise IA desativada para esta conta.', insights: { keyPoints: [], decisions: [], nextActions: [] } };
    }
    const sys = cfg.systemPrompt || 'Você é um assistente de mentoria empresarial.';
    const prompt = `Transcrição da reunião:\n"""${transcript.slice(0, 12000)}"""\n\nProduza:
- Resumo (4-6 linhas)
- Pontos principais (lista)
- Decisões tomadas (lista)
- Próximas ações (lista com responsável quando possível)

Retorne em JSON válido com chaves: summary, keyPoints[], decisions[], nextActions[].`;
    const raw = await this.chat(sys, prompt, { mentorId, useCase: 'summarize_meeting' });
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
    const cfg = await this.assertAiEnabled(mentorId);
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
    return this.chat(sys, message, { mentorId, useCase: 'assistant_chat' });
  }
}
