import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizSession, QuizSessionStatus } from '../../entities/quiz-session.entity';
import { QuizPlayer } from '../../entities/quiz-player.entity';
import { QuizAnswer } from '../../entities/quiz-answer.entity';
import { TestTemplate } from '../../entities/test-template.entity';
import { TestQuestion, QuestionType } from '../../entities/test-question.entity';

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(QuizSession) private sessions: Repository<QuizSession>,
    @InjectRepository(QuizPlayer) private players: Repository<QuizPlayer>,
    @InjectRepository(QuizAnswer) private answers: Repository<QuizAnswer>,
    @InjectRepository(TestTemplate) private templates: Repository<TestTemplate>,
    @InjectRepository(TestQuestion) private questions: Repository<TestQuestion>,
  ) {}

  private generatePin(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async createSession(mentorId: string, dto: { templateId: string; eventId?: string; questionTimeLimit?: number; title?: string }) {
    const template = await this.templates.findOne({ where: { id: dto.templateId, mentorId } });
    if (!template) throw new NotFoundException('Template não encontrado');

    const qs = await this.questions.find({
      where: { templateId: dto.templateId, type: QuestionType.MULTIPLE_CHOICE },
      order: { order: 'ASC' },
    });
    if (qs.length === 0) throw new BadRequestException('O template precisa ter ao menos 1 pergunta de múltipla escolha');

    // Snapshot: marca como correta a opção com maior score
    const snapshot = qs.map((q) => {
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
      title: dto.title || template.title,
      status: QuizSessionStatus.LOBBY,
      currentQuestionIndex: -1,
      questionTimeLimit: dto.questionTimeLimit || 20,
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
}
