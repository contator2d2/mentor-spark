/**
 * captureClient: encapsula MediaRecorder + getUserMedia + getDisplayMedia.
 * Combina mic e áudio da aba/tela quando ambos disponíveis (mix via WebAudio).
 *
 * Não chama API — apenas notifica via callbacks. A página decide quando enviar.
 */
export type CaptureSource = "mic" | "tab" | "screen" | "mixed";

export interface CaptureCallbacks {
  onLevel?: (level: number) => void; // 0..1
  onError?: (msg: string) => void;
  onDeviceLost?: () => void;
}

export interface CaptureStartOptions {
  micDeviceId?: string;
  withDisplay?: boolean; // se true, pede getDisplayMedia
  callbacks?: CaptureCallbacks;
}

export class CaptureClient {
  private micStream?: MediaStream;
  private displayStream?: MediaStream;
  private mixedStream?: MediaStream;
  private audioCtx?: AudioContext;
  private analyser?: AnalyserNode;
  private rafId?: number;
  private recorder?: MediaRecorder;
  private blobs: Blob[] = [];
  private startedAt = 0;
  private callbacks: CaptureCallbacks = {};
  source: CaptureSource = "mic";

  /** Lista de microfones disponíveis */
  static async listMicrophones(): Promise<MediaDeviceInfo[]> {
    // Primeiro precisa de permissão (sem permissão, label vem vazio)
    try {
      const tmp = await navigator.mediaDevices.getUserMedia({ audio: true });
      tmp.getTracks().forEach((t) => t.stop());
    } catch {}
    const all = await navigator.mediaDevices.enumerateDevices();
    return all.filter((d) => d.kind === "audioinput");
  }

  /** Teste rápido de microfone — retorna stream para medidor + função para parar. */
  static async testMicrophone(deviceId?: string): Promise<{ stream: MediaStream; stop: () => void }> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: deviceId ? { deviceId: { exact: deviceId } } : true,
    });
    return { stream, stop: () => stream.getTracks().forEach((t) => t.stop()) };
  }

  async start(opts: CaptureStartOptions = {}) {
    this.callbacks = opts.callbacks || {};
    this.blobs = [];
    this.startedAt = Date.now();

    // 1. mic
    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: opts.micDeviceId ? { deviceId: { exact: opts.micDeviceId } } : true,
    });

    // 2. display (opcional)
    if (opts.withDisplay) {
      try {
        // @ts-ignore - audio em getDisplayMedia
        this.displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        const hasAudio = this.displayStream.getAudioTracks().length > 0;
        if (!hasAudio) {
          this.callbacks.onError?.("Compartilhamento sem áudio. Marque “Compartilhar áudio da aba” no diálogo do navegador.");
          this.source = "screen";
        } else {
          this.source = "mixed";
        }
      } catch (e: any) {
        this.callbacks.onError?.(`Captura de tela cancelada: ${e?.message || e}`);
      }
    } else {
      this.source = "mic";
    }

    // 3. mixar streams
    const finalStream = this.buildMixedStream();
    this.mixedStream = finalStream;

    // 4. medidor de nível
    this.startLevelMeter(finalStream);

    // 5. detectar perda de track
    finalStream.getAudioTracks().forEach((t) => {
      t.addEventListener("ended", () => this.callbacks.onDeviceLost?.());
    });

    // 6. recorder
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    this.recorder = new MediaRecorder(finalStream, { mimeType: mime, audioBitsPerSecond: 96000 });
    this.recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.blobs.push(e.data);
    };
    this.recorder.start(5000); // emite blob a cada 5s (mais resiliente a crash)
  }

  pause() {
    if (this.recorder?.state === "recording") this.recorder.pause();
  }
  resume() {
    if (this.recorder?.state === "paused") this.recorder.resume();
  }

  /** Encerra captura e devolve o Blob final consolidado */
  async stop(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.recorder) {
        resolve(new Blob([], { type: "audio/webm" }));
        return;
      }
      const r = this.recorder;
      const finish = () => {
        const blob = new Blob(this.blobs, { type: r.mimeType || "audio/webm" });
        this.cleanup();
        resolve(blob);
      };
      if (r.state === "inactive") finish();
      else {
        r.addEventListener("stop", finish, { once: true });
        try { r.stop(); } catch { finish(); }
      }
    });
  }

  /** Tempo decorrido em segundos */
  get elapsedSeconds() {
    return this.startedAt ? Math.round((Date.now() - this.startedAt) / 1000) : 0;
  }

  // -------- helpers --------
  private buildMixedStream(): MediaStream {
    if (!this.displayStream) return this.micStream!;
    const ctx = new AudioContext();
    this.audioCtx = ctx;
    const dest = ctx.createMediaStreamDestination();

    const micSrc = ctx.createMediaStreamSource(this.micStream!);
    micSrc.connect(dest);

    const dispAudioTracks = this.displayStream.getAudioTracks();
    if (dispAudioTracks.length > 0) {
      const displayOnlyAudio = new MediaStream(dispAudioTracks);
      const dispSrc = ctx.createMediaStreamSource(displayOnlyAudio);
      dispSrc.connect(dest);
    }
    return dest.stream;
  }

  private startLevelMeter(stream: MediaStream) {
    if (!this.audioCtx) this.audioCtx = new AudioContext();
    const ctx = this.audioCtx;
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    src.connect(analyser);
    this.analyser = analyser;

    const buf = new Uint8Array(analyser.fftSize);
    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      this.callbacks.onLevel?.(Math.min(1, rms * 2));
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private cleanup() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.micStream?.getTracks().forEach((t) => t.stop());
    this.displayStream?.getTracks().forEach((t) => t.stop());
    try { this.audioCtx?.close(); } catch {}
    this.micStream = undefined;
    this.displayStream = undefined;
    this.audioCtx = undefined;
    this.analyser = undefined;
    this.recorder = undefined;
  }
}

/** Detecta browser/OS para enviar ao backend */
export function detectEnv() {
  const ua = navigator.userAgent;
  let browser = "unknown", version = "";
  const m = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/(\d+)/);
  if (m) { browser = m[1]; version = m[2]; }
  let os = "unknown";
  if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS/.test(ua)) os = "macOS";
  else if (/Linux/.test(ua)) os = "Linux";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad/.test(ua)) os = "iOS";
  return { browserName: browser, browserVersion: version, osName: os };
}
