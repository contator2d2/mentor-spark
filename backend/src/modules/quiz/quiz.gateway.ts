import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { QuizService } from './quiz.service';

/**
 * Gateway de Quiz PVP em tempo real.
 *
 * Salas (rooms) por sessão: `session:<id>` — host, telão e jogadores entram nela
 * para receber broadcasts.
 *
 * Eventos cliente → servidor:
 *  - host_join { sessionId }                    (telão / mentor)
 *  - player_join { pin, name, ticketCode? }     (jogador via app)
 *  - submit_answer { sessionId, playerId, optionIndex }
 *  - host_action { sessionId, action: 'next'|'reveal'|'leaderboard'|'cancel', mentorId }
 *
 * Eventos servidor → cliente:
 *  - state { ... QuizService.getPublicState() }
 *  - player_joined { player }
 *  - answer_submitted { playerId, count }
 *  - error { message }
 */
@WebSocketGateway({
  namespace: '/quiz',
  cors: {
    origin: true,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class QuizGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(QuizGateway.name);

  constructor(private quiz: QuizService) {}

  async handleConnection(socket: Socket) {
    this.logger.log(`Socket conectado: ${socket.id}`);
  }

  async handleDisconnect(socket: Socket) {
    await this.quiz.markPlayerDisconnected(socket.id);
    // Broadcast atualizado para todas as salas em que o socket estava
    for (const room of socket.rooms) {
      if (room.startsWith('session:')) {
        const sessionId = room.replace('session:', '');
        await this.broadcastState(sessionId);
      }
    }
  }

  private async broadcastState(sessionId: string) {
    const state = await this.quiz.getPublicState(sessionId);
    this.server.to(`session:${sessionId}`).emit('state', state);
  }

  @SubscribeMessage('host_join')
  async hostJoin(@ConnectedSocket() socket: Socket, @MessageBody() body: { sessionId: string }) {
    if (!body?.sessionId) return socket.emit('error', { message: 'sessionId obrigatório' });
    socket.join(`session:${body.sessionId}`);
    socket.join(`host:${body.sessionId}`);
    const state = await this.quiz.getPublicState(body.sessionId);
    socket.emit('state', state);
  }

  @SubscribeMessage('player_join')
  async playerJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { pin: string; name: string; ticketCode?: string; userId?: string },
  ) {
    try {
      const session = await this.quiz.getByPin(body.pin);
      const player = await this.quiz.addPlayer(session.id, {
        name: body.name,
        ticketCode: body.ticketCode,
        userId: body.userId,
        socketId: socket.id,
      });
      socket.join(`session:${session.id}`);
      socket.data.sessionId = session.id;
      socket.data.playerId = player.id;
      socket.emit('joined', { sessionId: session.id, playerId: player.id, sessionTitle: session.title });
      this.server.to(`session:${session.id}`).emit('player_joined', { player });
      await this.broadcastState(session.id);
    } catch (e: any) {
      socket.emit('error', { message: e.message });
    }
  }

  @SubscribeMessage('submit_answer')
  async submitAnswer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { sessionId: string; playerId: string; optionIndex: number },
  ) {
    try {
      const result = await this.quiz.submitAnswer(body.sessionId, body.playerId, body.optionIndex);
      socket.emit('answer_result', result);
      // Avisa host quantas respostas chegaram
      const stats = await this.quiz.questionStats(body.sessionId, (await this.quiz.getById(body.sessionId)).currentQuestionIndex);
      this.server.to(`host:${body.sessionId}`).emit('answer_count', stats);
    } catch (e: any) {
      socket.emit('error', { message: e.message });
    }
  }

  @SubscribeMessage('host_action')
  async hostAction(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { sessionId: string; action: 'next' | 'reveal' | 'leaderboard' | 'cancel' | 'start'; mentorId: string },
  ) {
    try {
      if (!body?.mentorId) return socket.emit('error', { message: 'mentorId obrigatório' });
      switch (body.action) {
        case 'start': await this.quiz.startSession(body.mentorId, body.sessionId); break;
        case 'next': await this.quiz.nextQuestion(body.mentorId, body.sessionId); break;
        case 'reveal': await this.quiz.revealQuestion(body.mentorId, body.sessionId); break;
        case 'leaderboard': await this.quiz.showLeaderboard(body.mentorId, body.sessionId); break;
        case 'cancel': await this.quiz.cancelSession(body.mentorId, body.sessionId); break;
      }
      await this.broadcastState(body.sessionId);
    } catch (e: any) {
      socket.emit('error', { message: e.message });
    }
  }
}
