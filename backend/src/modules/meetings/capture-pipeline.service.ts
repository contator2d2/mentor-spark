/**
 * Pipeline de processamento de áudio de reunião.
 * Roda assincronamente — chamado fire-and-forget após upload.
 *
 * Fluxo:
 *  1. inspect: lê duração/tamanho do arquivo original
 *  2. chunk: quebra em mp3 de 10min (se necessário)
 *  3. transcribe: Whisper sequencial em cada chunk (com retry)
 *  4. merge: concatena transcrições por orderIndex
 *  5. summarize: AiService gera resumo + insights
 *
 * Cada etapa atualiza session.status e grava log.
 * Retry: até 3 tentativas por chunk; falhas vão para log.
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

import { Meeting } from '../../entities/meeting.entity';
import { MeetingCaptureSession } from '../../entities/meeting-capture-session.entity';
import { MeetingAudioAsset } from '../../entities/meeting-audio-asset.entity';
import { MeetingAudioChunk } from '../../entities/meeting-audio-chunk.entity';
import { MeetingCaptureLog } from '../../entities/meeting-capture-log.entity';
import { MeetingSummary } from '../../entities/meeting-summary.entity';

import { AudioChunkerService } from './audio-chunker.service';
import { AiService } from '../ai/ai.service';

const MAX_CHUNK_RETRIES = 3;
const WHISPER_LIMIT_BYTES = 24 * 1024 * 1024; // 24MB conservador (Whisper aceita 25MB)

@Injectable()
export class CapturePipelineService {
  private readonly logger = new Logger(CapturePipelineService.name);

  constructor(
    @InjectRepository(Meeting) private meetings: Repository<Meeting>,
    @InjectRepository(MeetingCaptureSession) private sessions: Repository<MeetingCaptureSession>,
    @InjectRepository(MeetingAudioAsset) private assets: Repository<MeetingAudioAsset>,
    @InjectRepository(MeetingAudioChunk) private chunks: Repository<MeetingAudioChunk>,
    @InjectRepository(MeetingCaptureLog) private logs: Repository<MeetingCaptureLog>,
    @InjectRepository(MeetingSummary) private summaries: Repository<MeetingSummary>,
    private chunker: AudioChunkerService,
    private ai: AiService,
  ) {}

  /** Entry point — chamado pelo controller após upload concluído. */
  async run(sessionId: string, originalAssetId: string) {
    try {
      await this.inspect(sessionId, originalAssetId);
      const generatedChunks = await this.chunkAndQueue(sessionId, originalAssetId);
      await this.transcribeAll(sessionId, generatedChunks);
      await this.merge(sessionId);
      await this.summarize(sessionId);
    } catch (e: any) {
      await this.markFailed(sessionId, `Pipeline falhou: ${e.message}`);
    }
  }

  // -------- 1. INSPECT --------
  private async inspect(sessionId: string, assetId: string) {
    await this.setStatus(sessionId, 'inspecting');
    const asset = await this.assets.findOne({ where: { id: assetId } });
    if (!asset) throw new Error('Asset não encontrado');

    const fullPath = this.resolveStoragePath(asset.storageUrl);
    if (!fs.existsSync(fullPath)) throw new Error(`Arquivo não existe: ${fullPath}`);

    const stat = fs.statSync(fullPath);
    asset.sizeBytes = stat.size;
    try {
      asset.durationSeconds = await this.chunker.probeDuration(fullPath);
    } catch {
      asset.durationSeconds = 0;
    }
    asset.processingStatus = 'inspected';
    await this.assets.save(asset);

    await this.log(sessionId, 'info', 'asset_inspected', `Arquivo inspecionado: ${(stat.size / 1024 / 1024).toFixed(2)} MB, ${asset.durationSeconds?.toFixed(0)}s`);
  }

  // -------- 2. CHUNK --------
  private async chunkAndQueue(sessionId: string, assetId: string): Promise<MeetingAudioChunk[]> {
    await this.setStatus(sessionId, 'chunking');
    const asset = await this.assets.findOne({ where: { id: assetId } });
    if (!asset) throw new Error('Asset não encontrado');

    const fullPath = this.resolveStoragePath(asset.storageUrl);
    const outDir = path.resolve(process.cwd(), 'uploads', 'meetings', 'chunks', sessionId);

    const chunkInfos = await this.chunker.splitIntoChunks(fullPath, outDir, sessionId, 600);
    asset.processingStatus = 'chunked';
    await this.assets.save(asset);

    // Cria registros chunk + asset
    const created: MeetingAudioChunk[] = [];
    for (const info of chunkInfos) {
      const storageUrl = `/uploads/meetings/chunks/${sessionId}/${path.basename(info.filePath)}`;
      const chunkAsset = await this.assets.save(this.assets.create({
        captureSessionId: sessionId,
        assetType: 'chunk',
        storageUrl,
        mimeType: 'audio/mpeg',
        codec: 'mp3',
        durationSeconds: info.durationSeconds,
        sizeBytes: info.sizeBytes,
        processingStatus: 'pending',
      }));
      const chunk = await this.chunks.save(this.chunks.create({
        captureSessionId: sessionId,
        originalAssetId: assetId,
        chunkAssetId: chunkAsset.id,
        storageUrl,
        orderIndex: info.orderIndex,
        startSecond: info.startSecond,
        endSecond: info.endSecond,
        durationSeconds: info.durationSeconds,
        sizeBytes: info.sizeBytes,
        transcriptionStatus: 'queued',
      }));
      created.push(chunk);
    }

    await this.sessions.update({ id: sessionId } as any, { totalChunks: created.length, completedChunks: 0 });
    await this.log(sessionId, 'info', 'chunks_generated', `${created.length} chunk(s) gerado(s)`);
    return created;
  }

  // -------- 3. TRANSCRIBE --------
  private async transcribeAll(sessionId: string, list: MeetingAudioChunk[]) {
    await this.setStatus(sessionId, 'transcribing');
    let completed = 0;
    for (const c of list) {
      await this.transcribeChunkWithRetry(sessionId, c.id);
      completed++;
      await this.sessions.update({ id: sessionId } as any, { completedChunks: completed });
    }
  }

  private async transcribeChunkWithRetry(sessionId: string, chunkId: string) {
    for (let attempt = 1; attempt <= MAX_CHUNK_RETRIES; attempt++) {
      try {
        const c = await this.chunks.findOne({ where: { id: chunkId } });
        if (!c) return;
        c.transcriptionStatus = 'transcribing';
        c.retryCount = attempt - 1;
        await this.chunks.save(c);

        const fullPath = this.resolveStoragePath(c.storageUrl);
        const text = await this.transcribeWithWhisper(fullPath);
        c.transcript = text;
        c.transcriptionStatus = 'transcribed';
        c.errorMessage = undefined;
        await this.chunks.save(c);

        await this.log(sessionId, 'info', 'chunk_transcribed', `Chunk ${c.orderIndex + 1} transcrito (${text.length} chars)`);
        return;
      } catch (e: any) {
        await this.log(sessionId, 'warn', 'chunk_failed', `Tentativa ${attempt}/${MAX_CHUNK_RETRIES} falhou: ${e.message}`, { chunkId });
        if (attempt === MAX_CHUNK_RETRIES) {
          const c = await this.chunks.findOne({ where: { id: chunkId } });
          if (c) {
            c.transcriptionStatus = 'failed';
            c.errorMessage = e.message;
            c.retryCount = attempt;
            await this.chunks.save(c);
          }
        } else {
          await new Promise((r) => setTimeout(r, 1500 * attempt));
        }
      }
    }
  }

  private async transcribeWithWhisper(audioPath: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY não configurada');
    if (!fs.existsSync(audioPath)) throw new Error('Arquivo de chunk não encontrado');

    const stat = fs.statSync(audioPath);
    if (stat.size > WHISPER_LIMIT_BYTES) throw new Error(`Chunk muito grande para Whisper: ${stat.size}`);

    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fs.createReadStream(audioPath));
    form.append('model', 'whisper-1');
    form.append('language', 'pt');
    form.append('response_format', 'text');

    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, ...form.getHeaders() },
      body: form,
    } as any);
    if (!r.ok) throw new Error(`Whisper HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`);
    return (await r.text()).trim();
  }

  // -------- 4. MERGE --------
  private async merge(sessionId: string) {
    await this.setStatus(sessionId, 'merging');
    const all = await this.chunks.find({ where: { captureSessionId: sessionId }, order: { orderIndex: 'ASC' } });
    const failedCount = all.filter((c) => c.transcriptionStatus === 'failed').length;
    const text = all
      .filter((c) => c.transcriptionStatus === 'transcribed' && c.transcript)
      .map((c) => c.transcript)
      .join('\n\n');

    const session = await this.sessions.findOne({ where: { id: sessionId } });
    if (!session) return;
    session.consolidatedTranscript = text;
    session.status = 'transcript_ready';
    await this.sessions.save(session);

    // Mirror no Meeting (compatibilidade com UI antiga)
    await this.meetings.update({ id: session.meetingId } as any, { transcript: text });
    await this.log(sessionId, 'info', 'transcript_merged', `Transcrição final: ${text.length} chars (${failedCount} chunk(s) falhou)`);
  }

  // -------- 5. SUMMARIZE --------
  private async summarize(sessionId: string) {
    const session = await this.sessions.findOne({ where: { id: sessionId } });
    if (!session || !session.consolidatedTranscript || session.consolidatedTranscript.length < 50) return;
    await this.setStatus(sessionId, 'summarizing');
    try {
      const { summary, insights } = await this.ai.summarizeMeeting(session.tenantId, session.consolidatedTranscript);
      const sum = await this.summaries.save(this.summaries.create({
        meetingId: session.meetingId,
        captureSessionId: sessionId,
        summaryText: summary,
        decisionsText: insights?.decisions?.join('\n') || '',
        nextStepsText: insights?.nextActions?.join('\n') || '',
        classification: 'auto',
        aiProvider: 'lovable-ai',
      }));
      await this.meetings.update({ id: session.meetingId } as any, {
        aiSummary: summary,
        aiInsights: insights,
        status: 'completed',
      });
      session.status = 'summarized';
      await this.sessions.save(session);
      await this.log(sessionId, 'info', 'summary_ready', `Resumo IA gerado (${sum.summaryText.length} chars)`);
    } catch (e: any) {
      await this.log(sessionId, 'error', 'summary_failed', `Falha no resumo: ${e.message}`);
      // Mantém transcript_ready, não marca como failed
      const s = await this.sessions.findOne({ where: { id: sessionId } });
      if (s) { s.status = 'transcript_ready'; await this.sessions.save(s); }
    }
  }

  // -------- helpers --------
  private resolveStoragePath(storageUrl: string): string {
    // /uploads/meetings/file.mp3 -> {cwd}/uploads/meetings/file.mp3
    const rel = storageUrl.replace(/^\/+/, '');
    return path.resolve(process.cwd(), rel);
  }

  private async setStatus(sessionId: string, status: any) {
    await this.sessions.update({ id: sessionId } as any, { status });
  }

  private async markFailed(sessionId: string, message: string) {
    await this.sessions.update({ id: sessionId } as any, { status: 'failed', errorMessage: message });
    await this.log(sessionId, 'error', 'pipeline_failed', message);
  }

  async log(sessionId: string, level: any, eventType: string, message: string, metadata?: any) {
    try {
      await this.logs.save(this.logs.create({ captureSessionId: sessionId, level, eventType, message, metadata }));
    } catch (e: any) {
      this.logger.warn(`log save failed: ${e.message}`);
    }
  }

  /** Reprocessa do zero (chamado por API) */
  async reprocess(sessionId: string) {
    const session = await this.sessions.findOne({ where: { id: sessionId } });
    if (!session) throw new Error('Sessão não encontrada');
    const original = await this.assets.findOne({
      where: { captureSessionId: sessionId, assetType: 'original' as any },
    });
    if (!original) throw new Error('Asset original não encontrado para reprocessar');

    // Limpa chunks anteriores
    await this.chunks.delete({ captureSessionId: sessionId } as any);
    await this.assets.delete({ captureSessionId: sessionId, assetType: 'chunk' as any } as any);
    session.totalChunks = 0;
    session.completedChunks = 0;
    session.consolidatedTranscript = '';
    session.errorMessage = undefined as any;
    await this.sessions.save(session);
    await this.log(sessionId, 'info', 'reprocess_started', 'Reprocessamento manual iniciado');

    this.run(sessionId, original.id).catch(() => {});
  }
}
