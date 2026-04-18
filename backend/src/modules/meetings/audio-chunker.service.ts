/**
 * Serviço de chunking de áudio usando ffmpeg-static.
 * Quebra arquivo grande em pedaços de N segundos cada.
 * Usa o binário do ffmpeg-static (não precisa instalar no Docker).
 */
import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';

const ffmpegPath: string = require('ffmpeg-static');

export interface ChunkInfo {
  filePath: string;
  orderIndex: number;
  startSecond: number;
  endSecond: number;
  durationSeconds: number;
  sizeBytes: number;
}

@Injectable()
export class AudioChunkerService {
  private readonly logger = new Logger(AudioChunkerService.name);

  /** Lê duração do áudio via ffprobe (vem com ffmpeg) */
  async probeDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const args = ['-i', filePath, '-hide_banner'];
      const proc = spawn(ffmpegPath, args);
      let stderr = '';
      proc.stderr.on('data', (d) => (stderr += d.toString()));
      proc.on('close', () => {
        const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
        if (!m) return reject(new Error('Não foi possível ler duração'));
        const [, h, mi, s] = m;
        resolve(parseInt(h) * 3600 + parseInt(mi) * 60 + parseFloat(s));
      });
      proc.on('error', reject);
    });
  }

  /**
   * Quebra arquivo em chunks de chunkSeconds cada.
   * Reencodeia para mp3 mono 16kHz (Whisper-friendly e arquivos menores).
   * Retorna array de chunks gerados.
   */
  async splitIntoChunks(
    inputPath: string,
    outputDir: string,
    sessionId: string,
    chunkSeconds = 600, // 10 min por chunk = ~5MB em mp3 16k
  ): Promise<ChunkInfo[]> {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const totalDuration = await this.probeDuration(inputPath).catch(() => 0);
    const chunks: ChunkInfo[] = [];

    if (totalDuration > 0 && totalDuration <= chunkSeconds) {
      // Pequeno: só converte para mp3, 1 chunk
      const out = path.join(outputDir, `${sessionId}-0.mp3`);
      await this.convertToMp3(inputPath, out, 0, totalDuration);
      const stat = fs.statSync(out);
      return [{
        filePath: out,
        orderIndex: 0,
        startSecond: 0,
        endSecond: totalDuration,
        durationSeconds: totalDuration,
        sizeBytes: stat.size,
      }];
    }

    // Quebrar
    const totalChunks = Math.ceil(totalDuration / chunkSeconds);
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSeconds;
      const dur = Math.min(chunkSeconds, totalDuration - start);
      const out = path.join(outputDir, `${sessionId}-${i}.mp3`);
      await this.convertToMp3(inputPath, out, start, dur);
      const stat = fs.statSync(out);
      chunks.push({
        filePath: out,
        orderIndex: i,
        startSecond: start,
        endSecond: start + dur,
        durationSeconds: dur,
        sizeBytes: stat.size,
      });
    }
    return chunks;
  }

  private convertToMp3(input: string, output: string, startSec: number, durationSec: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '-y',
        '-ss', String(startSec),
        '-t', String(durationSec),
        '-i', input,
        '-vn',
        '-ac', '1',
        '-ar', '16000',
        '-b:a', '64k',
        '-f', 'mp3',
        output,
      ];
      const proc = spawn(ffmpegPath, args);
      let stderr = '';
      proc.stderr.on('data', (d) => (stderr += d.toString()));
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg falhou (${code}): ${stderr.slice(-300)}`));
      });
      proc.on('error', reject);
    });
  }
}
