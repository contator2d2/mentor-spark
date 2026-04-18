import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from '../../entities/meeting.entity';
import { User } from '../../entities/user.entity';
import { AiService } from '../ai/ai.service';
import { GoogleCalendarService } from '../integrations/google-calendar.service';
import * as fs from 'fs';

/**
 * Serviço de reuniões: transcrição via OpenAI Whisper + resumo IA.
 * Whisper é chamado direto com a chave OPENAI_API_KEY (secret do backend).
 * Por que não usar o AiProvider do super admin? Porque Whisper é endpoint diferente
 * (audio/transcriptions), só OpenAI suporta. Mantemos como secret separado.
 */
@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);

  constructor(
    @InjectRepository(Meeting) private meetings: Repository<Meeting>,
    @InjectRepository(User) private users: Repository<User>,
    private ai: AiService,
    private gcal: GoogleCalendarService,
  ) {}

  async transcribeAndSummarize(mentorId: string, meetingId: string, audioPath: string) {
    const m = await this.meetings.findOne({ where: { id: meetingId, mentorId } });
    if (!m) return;
    try {
      const transcript = await this.transcribeWithWhisper(audioPath);
      m.transcript = transcript;
      await this.meetings.save(m);

      if (transcript && transcript.length > 50) {
        const { summary, insights } = await this.ai.summarizeMeeting(mentorId, transcript);
        m.aiSummary = summary;
        m.aiInsights = insights;
      }
      m.status = 'completed';
      await this.meetings.save(m);
    } catch (e: any) {
      this.logger.error(`Transcrição falhou (meeting ${meetingId}): ${e.message}`);
      m.status = 'scheduled';
      m.aiSummary = `Falha na transcrição: ${e.message}. Verifique a chave OPENAI_API_KEY ou cole a transcrição manualmente.`;
      await this.meetings.save(m);
    }
  }

  private async transcribeWithWhisper(audioPath: string): Promise<string> {
    // Pega provider de transcrição cadastrado pelo super_admin (em /admin/ai-providers).
    // Fallback: usa OPENAI_API_KEY do env como retrocompat.
    const provider = await this.ai.getTranscriptionProvider();
    const apiKey = provider?.apiKey || process.env.OPENAI_API_KEY;
    const baseUrl = (provider?.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
    const model = provider?.transcriptionModel || 'whisper-1';

    if (!apiKey) {
      throw new Error(
        'Nenhum provider de transcrição configurado. Acesse Admin → Provedores de IA e marque um provider OpenAI-compatível com "Usar para transcrição".',
      );
    }
    if (!fs.existsSync(audioPath)) throw new Error('Arquivo de áudio não encontrado');

    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fs.createReadStream(audioPath));
    form.append('model', model);
    form.append('language', 'pt');
    form.append('response_format', 'text');

    const r = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, ...form.getHeaders() },
      body: form,
    } as any);

    if (!r.ok) {
      const t = await r.text();
      throw new Error(`Whisper HTTP ${r.status}: ${t.slice(0, 300)}`);
    }
    return await r.text();
  }

  async createGoogleEvent(mentorId: string, meetingId: string) {
    const m = await this.meetings.findOne({ where: { id: meetingId, mentorId } });
    if (!m) return;
    const ev = await this.gcal.createEvent(mentorId, {
      summary: m.title,
      startISO: m.scheduledAt.toISOString(),
      durationMinutes: m.durationMinutes || 60,
      description: m.meetingUrl ? `Link: ${m.meetingUrl}` : undefined,
    });
    const eventId = typeof ev === 'string' ? ev : ev?.id;
    if (eventId) {
      m.googleCalendarEventId = eventId;
      await this.meetings.save(m);
    }
  }
}
