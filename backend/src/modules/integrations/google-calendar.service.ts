import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

/**
 * Stub do Google Calendar — placeholder até OAuth completo ser implementado.
 * Retorna null em createEvent pra não quebrar o fluxo de criação de reunião.
 * Próxima onda: OAuth2 real + refresh token + criação de evento via REST.
 */
@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(@InjectRepository(User) private users: Repository<User>) {}

  async createEvent(
    mentorId: string,
    _evt: { summary: string; startISO: string; durationMinutes: number; description?: string },
  ): Promise<string | null> {
    const u = await this.users.createQueryBuilder('u').addSelect('u.googleTokens').where('u.id = :id', { id: mentorId }).getOne();
    if (!u?.googleTokens?.access_token) {
      this.logger.debug(`Mentor ${mentorId} sem Google Calendar conectado — pulando.`);
      return null;
    }
    // TODO: chamada real à Google Calendar API v3
    this.logger.log(`[stub] Criaria evento Google Calendar pra mentor ${mentorId}`);
    return null;
  }
}
