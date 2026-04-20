import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizSession, QuizSessionStatus } from '../../entities/quiz-session.entity';
import { QuizPlayer } from '../../entities/quiz-player.entity';
import { QuizAnswer } from '../../entities/quiz-answer.entity';
import { TestTemplate } from '../../entities/test-template.entity';
import { TestQuestion, QuestionType } from '../../entities/test-question.entity';
import { QuizTemplate, QuizLibraryTemplate, QuizSegment } from '../../entities/quiz-template.entity';
import { AiService } from '../ai/ai.service';

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(QuizSession) private sessions: Repository<QuizSession>,
    @InjectRepository(QuizPlayer) private players: Repository<QuizPlayer>,
    @InjectRepository(QuizAnswer) private answers: Repository<QuizAnswer>,
    @InjectRepository(TestTemplate) private templates: Repository<TestTemplate>,
    @InjectRepository(TestQuestion) private questions: Repository<TestQuestion>,
    @InjectRepository(QuizTemplate) private quizTemplates: Repository<QuizTemplate>,
    @InjectRepository(QuizLibraryTemplate) private quizLibrary: Repository<QuizLibraryTemplate>,
    private readonly ai: AiService,
  ) {}

  private generatePin(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async createSession(mentorId: string, dto: { templateId: string; eventId?: string; questionTimeLimit?: number; title?: string }) {
    // Tenta primeiro como QuizTemplate (novo); se não, cai para TestTemplate (legado)
    let title = dto.title || '';
    let timeLimit = dto.questionTimeLimit;
    let snapshot: Array<{ id: string; text: string; options: Array<{ index: number; label: string; correct: boolean }> }> = [];

    const quizTpl = await this.quizTemplates.findOne({ where: { id: dto.templateId, mentorId } });
    if (quizTpl) {
      if (!quizTpl.questions?.length) throw new BadRequestException('Quiz sem perguntas');
      title = title || quizTpl.title;
      timeLimit = timeLimit || quizTpl.defaultTimeLimit;
      snapshot = quizTpl.questions.map((q, qi) => ({
        id: `q${qi}`,
        text: q.text,
        options: (q.options || []).map((o, i) => ({ index: i, label: o.label, correct: !!o.correct })),
      }));
    } else {
      const template = await this.templates.findOne({ where: { id: dto.templateId, mentorId } });
      if (!template) throw new NotFoundException('Template não encontrado');

      const qs = await this.questions.find({
        where: { templateId: dto.templateId, type: QuestionType.MULTIPLE_CHOICE },
        order: { order: 'ASC' },
      });
      if (qs.length === 0) throw new BadRequestException('O template precisa ter ao menos 1 pergunta de múltipla escolha');

      title = title || template.title;
      snapshot = qs.map((q) => {
        const opts: Array<{ label: string; score?: number }> = q.config?.options || [];
        const maxScore = Math.max(...opts.map((o) => o.score ?? 0));
        return {
          id: q.id,
          text: q.text,
          options: opts.map((o, i) => ({
            index: i,
            label: o.label,
            correct: (o.score ?? 0) === maxScore && maxScore > 0,
          })),
        };
      });
    }

    // PIN único (tenta até 5x)
    let pin = '';
    for (let i = 0; i < 5; i++) {
      pin = this.generatePin();
      const exists = await this.sessions.findOne({ where: { pin } });
      if (!exists) break;
      if (i === 4) throw new Error('Não conseguiu gerar PIN único');
    }

    const session = this.sessions.create({
      mentorId,
      templateId: dto.templateId,
      eventId: dto.eventId,
      pin,
      title,
      status: QuizSessionStatus.LOBBY,
      currentQuestionIndex: -1,
      questionTimeLimit: timeLimit || 20,
      questionsSnapshot: snapshot,
    });
    return this.sessions.save(session);
  }

  async getByPin(pin: string) {
    const s = await this.sessions.findOne({ where: { pin } });
    if (!s) throw new NotFoundException('Sala não encontrada');
    return s;
  }

  async getById(id: string) {
    const s = await this.sessions.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Sessão não encontrada');
    return s;
  }

  async listForMentor(mentorId: string) {
    return this.sessions.find({ where: { mentorId }, order: { createdAt: 'DESC' }, take: 50 });
  }

  async addPlayer(sessionId: string, dto: { name: string; ticketCode?: string; userId?: string; socketId?: string }) {
    const session = await this.getById(sessionId);
    if (session.status === QuizSessionStatus.FINISHED || session.status === QuizSessionStatus.CANCELED) {
      throw new BadRequestException('Sala fechada');
    }
    const cleanName = (dto.name || '').trim().slice(0, 24);
    if (!cleanName) throw new BadRequestException('Nome obrigatório');

    // Se já existe com mesmo nome, reconecta
    let player = await this.players.findOne({ where: { sessionId, name: cleanName } });
    if (player) {
      player.connected = true;
      player.socketId = dto.socketId;
      return this.players.save(player);
    }
    player = this.players.create({
      sessionId,
      name: cleanName,
      ticketCode: dto.ticketCode,
      userId: dto.userId,
      socketId: dto.socketId,
      connected: true,
    });
    return this.players.save(player);
  }

  async listPlayers(sessionId: string) {
    return this.players.find({ where: { sessionId }, order: { score: 'DESC', joinedAt: 'ASC' } });
  }

  async markPlayerDisconnected(socketId: string) {
    await this.players.update({ socketId }, { connected: false });
  }

  async startSession(mentorId: string, sessionId: string) {
    const s = await this.getById(sessionId);
    if (s.mentorId !== mentorId) throw new BadRequestException('Sem permissão');
    s.status = QuizSessionStatus.LEADERBOARD;
    s.startedAt = new Date();
    return this.sessions.save(s);
  }

  async nextQuestion(mentorId: string, sessionId: string) {
    const s = await this.getById(sessionId);
    if (s.mentorId !== mentorId) throw new BadRequestException('Sem permissão');
    const total = s.questionsSnapshot?.length || 0;
    const next = s.currentQuestionIndex + 1;
    if (next >= total) {
      s.status = QuizSessionStatus.FINISHED;
      s.finishedAt = new Date();
      return this.sessions.save(s);
    }
    s.currentQuestionIndex = next;
    s.status = QuizSessionStatus.QUESTION;
    s.questionStartedAt = new Date();
    return this.sessions.save(s);
  }

  async revealQuestion(mentorId: string, sessionId: string) {
    const s = await this.getById(sessionId);
    if (s.mentorId !== mentorId) throw new BadRequestException('Sem permissão');
    s.status = QuizSessionStatus.REVEAL;
    return this.sessions.save(s);
  }

  async showLeaderboard(mentorId: string, sessionId: string) {
    const s = await this.getById(sessionId);
    if (s.mentorId !== mentorId) throw new BadRequestException('Sem permissão');
    s.status = QuizSessionStatus.LEADERBOARD;
    return this.sessions.save(s);
  }

  async cancelSession(mentorId: string, sessionId: string) {
    const s = await this.getById(sessionId);
    if (s.mentorId !== mentorId) throw new BadRequestException('Sem permissão');
    s.status = QuizSessionStatus.CANCELED;
    s.finishedAt = new Date();
    return this.sessions.save(s);
  }

  /** Submete resposta e calcula pontos estilo Kahoot */
  async submitAnswer(sessionId: string, playerId: string, optionIndex: number) {
    const s = await this.getById(sessionId);
    if (s.status !== QuizSessionStatus.QUESTION) throw new BadRequestException('Pergunta não está ativa');
    const idx = s.currentQuestionIndex;
    const q = s.questionsSnapshot?.[idx];
    if (!q) throw new BadRequestException('Pergunta inválida');

    const player = await this.players.findOne({ where: { id: playerId, sessionId } });
    if (!player) throw new NotFoundException('Jogador não encontrado');

    // Já respondeu?
    const existing = await this.answers.findOne({ where: { playerId, questionIndex: idx } });
    if (existing) throw new BadRequestException('Já respondeu esta pergunta');

    const option = q.options[optionIndex];
    if (!option) throw new BadRequestException('Opção inválida');

    const startedAt = s.questionStartedAt?.getTime() || Date.now();
    const elapsed = Date.now() - startedAt;
    const totalMs = s.questionTimeLimit * 1000;
    const timeMs = Math.min(elapsed, totalMs);

    let points = 0;
    if (option.correct) {
      // Kahoot: 1000 base − (timeMs/totalMs * 500). Mínimo 500.
      points = Math.round(1000 - (timeMs / totalMs) * 500);
    }

    await this.answers.save(this.answers.create({
      sessionId,
      playerId,
      questionIndex: idx,
      optionIndex,
      correct: option.correct,
      timeMs,
      pointsEarned: points,
    }));

    if (option.correct) {
      player.score += points;
      player.correctCount += 1;
      await this.players.save(player);
    }

    return { correct: option.correct, points, timeMs };
  }

  async questionStats(sessionId: string, questionIndex: number) {
    const list = await this.answers.find({ where: { sessionId, questionIndex } });
    const counts: Record<number, number> = {};
    let correct = 0;
    for (const a of list) {
      counts[a.optionIndex] = (counts[a.optionIndex] || 0) + 1;
      if (a.correct) correct++;
    }
    return { total: list.length, correct, byOption: counts };
  }

  async getPublicState(sessionId: string) {
    const s = await this.getById(sessionId);
    const players = await this.listPlayers(sessionId);
    const top = players.slice(0, 20).map((p) => ({ id: p.id, name: p.name, score: p.score, correctCount: p.correctCount, connected: p.connected }));
    let currentQuestion: any = null;
    if (s.status === QuizSessionStatus.QUESTION || s.status === QuizSessionStatus.REVEAL) {
      const q = s.questionsSnapshot?.[s.currentQuestionIndex];
      if (q) {
        currentQuestion = {
          index: s.currentQuestionIndex,
          text: q.text,
          options: q.options.map((o) => ({
            index: o.index,
            label: o.label,
            // só revela "correct" quando for REVEAL
            correct: s.status === QuizSessionStatus.REVEAL ? o.correct : undefined,
          })),
          startedAt: s.questionStartedAt,
          timeLimit: s.questionTimeLimit,
        };
      }
    }
    let stats: any = null;
    if (s.status === QuizSessionStatus.REVEAL && s.currentQuestionIndex >= 0) {
      stats = await this.questionStats(sessionId, s.currentQuestionIndex);
    }
    return {
      id: s.id,
      pin: s.pin,
      title: s.title,
      status: s.status,
      currentQuestionIndex: s.currentQuestionIndex,
      totalQuestions: s.questionsSnapshot?.length || 0,
      players: top,
      currentQuestion,
      stats,
    };
  }

  // ===================== Geração de quiz =====================

  /** Cria um TestTemplate "rápido" para quiz a partir de perguntas manuais. */
  async createManualQuizTemplate(
    mentorId: string,
    dto: { title: string; description?: string; questions: Array<{ text: string; options: Array<{ label: string; correct?: boolean }> }> },
  ) {
    if (!dto.title?.trim()) throw new BadRequestException('Título é obrigatório');
    if (!dto.questions?.length) throw new BadRequestException('Inclua ao menos 1 pergunta');

    const cleanQs = dto.questions.map((q, i) => {
      if (!q.text?.trim()) throw new BadRequestException(`Pergunta ${i + 1} sem texto`);
      const opts = (q.options || []).filter((o) => o.label?.trim());
      if (opts.length < 2) throw new BadRequestException(`Pergunta ${i + 1}: mínimo 2 opções`);
      const hasCorrect = opts.some((o) => o.correct);
      if (!hasCorrect) throw new BadRequestException(`Pergunta ${i + 1}: marque ao menos 1 opção como correta`);
      return {
        type: QuestionType.MULTIPLE_CHOICE,
        text: q.text.trim(),
        weight: 1,
        config: { options: opts.map((o) => ({ label: o.label.trim(), score: o.correct ? 10 : 0 })) },
      };
    });

    const template = this.templates.create({
      mentorId,
      title: dto.title.trim(),
      description: dto.description?.trim(),
    });
    const saved = await this.templates.save(template);
    const qEntities = cleanQs.map((q, i) => this.questions.create({ ...q, order: i, templateId: saved.id } as Partial<TestQuestion>) as TestQuestion);
    await this.questions.save(qEntities);
    return this.templates.findOne({ where: { id: saved.id }, relations: ['questions'] });
  }

  /** Gera um TestTemplate completo via IA a partir de uma ideia/conteúdo. */
  async generateQuizTemplateWithAI(
    mentorId: string,
    dto: { topic: string; content?: string; numQuestions?: number; numOptions?: number; difficulty?: 'easy' | 'medium' | 'hard'; language?: string },
  ) {
    const topic = (dto.topic || '').trim();
    if (!topic) throw new BadRequestException('Informe o tema/ideia do quiz');
    const numQuestions = Math.min(20, Math.max(3, dto.numQuestions || 8));
    const numOptions = Math.min(4, Math.max(2, dto.numOptions || 4));
    const difficulty = dto.difficulty || 'medium';
    const language = dto.language || 'pt-BR';

    const sys = `Você é um especialista em criar quizzes educativos no estilo Kahoot. 
Sempre retorna JSON puro válido, sem markdown, sem comentários. Use o idioma ${language}.`;

    const userPrompt = `Crie um quiz competitivo (estilo PVP/Kahoot) sobre o tema: "${topic}".
${dto.content ? `\nUse este conteúdo de referência (não copie literalmente, extraia conhecimento):\n"""${dto.content.slice(0, 6000)}"""\n` : ''}
Regras:
- Gere exatamente ${numQuestions} perguntas de múltipla escolha
- Cada pergunta deve ter exatamente ${numOptions} opções
- Apenas 1 opção correta por pergunta
- Dificuldade: ${difficulty}
- Perguntas curtas (até 140 caracteres) e claras
- Opções curtas (até 60 caracteres)
- Não inclua "Todas as anteriores" / "Nenhuma das anteriores"
- Varie o assunto dentro do tema

Retorne APENAS um JSON com este formato exato:
{
  "title": "Título curto e atrativo do quiz",
  "description": "Descrição em 1 frase",
  "questions": [
    {
      "text": "Pergunta?",
      "options": [
        { "label": "Opção 1", "correct": false },
        { "label": "Opção 2", "correct": true },
        { "label": "Opção 3", "correct": false },
        { "label": "Opção 4", "correct": false }
      ]
    }
  ]
}`;

    const raw = await this.ai.chat(sys, userPrompt, { mentorId, useCase: 'generate_quiz' });

    let parsed: any = null;
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      // tenta extrair o primeiro bloco JSON
      const match = cleaned.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : cleaned);
    } catch (e: any) {
      throw new BadRequestException('A IA retornou um formato inválido. Tente novamente ou ajuste o tema.');
    }

    if (!parsed?.questions?.length) throw new BadRequestException('A IA não retornou perguntas. Tente novamente.');

    return this.createManualQuizTemplate(mentorId, {
      title: parsed.title || topic,
      description: parsed.description,
      questions: parsed.questions,
    });
  }
}
