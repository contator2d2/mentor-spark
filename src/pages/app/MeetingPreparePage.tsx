import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, API_BASE, getToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { CaptureClient, detectEnv } from "@/lib/captureClient";
import {
  ArrowLeft, Mic, MicOff, MonitorUp, ExternalLink, Copy, Play, Square, Pause,
  CheckCircle2, AlertCircle, User, Plus, Trash2, Loader2, Volume2,
} from "lucide-react";
import { toast } from "sonner";

type Meeting = { id: string; title: string; scheduledAt: string; platform: string; meetingUrl?: string; durationMinutes?: number; captureEnabled: boolean; screenShareExpected: boolean; preMeetingNotes?: string };
type Participant = { id: string; name: string; email?: string; company?: string; roleType: string; attendanceStatus: string };

export default function MeetingPreparePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);

  // === Bloco B: checklist técnico ===
  const [micPermission, setMicPermission] = useState<"unknown" | "granted" | "denied">("unknown");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>("");
  const [testStream, setTestStream] = useState<MediaStream | null>(null);
  const [testLevel, setTestLevel] = useState(0);
  const testRafRef = useRef<number>();

  // === Captura ao vivo ===
  const captureRef = useRef<CaptureClient | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const heartbeatRef = useRef<any>(null);
  const [recState, setRecState] = useState<"idle" | "recording" | "paused" | "uploading" | "done" | "error">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [liveLevel, setLiveLevel] = useState(0);
  const [withDisplay, setWithDisplay] = useState(false);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [quickNotes, setQuickNotes] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  function pushLog(msg: string) {
    setLogMessages((prev) => [`${new Date().toLocaleTimeString()} · ${msg}`, ...prev].slice(0, 30));
  }

  async function load() {
    try {
      const m = await api<Meeting>(`/meetings/${id}`);
      setMeeting(m);
      const p = await api<Participant[]>(`/meetings/${id}/participants`);
      setParticipants(p);
    } catch (e: any) { toast.error(e.message); }
  }
  useEffect(() => { load(); }, [id]);

  // ----- Bloco B: solicitar permissão e listar mics -----
  async function requestMicPermission() {
    try {
      const list = await CaptureClient.listMicrophones();
      setDevices(list);
      if (list.length > 0 && !selectedMic) setSelectedMic(list[0].deviceId);
      setMicPermission("granted");
      pushLog("Permissão de microfone concedida");
    } catch {
      setMicPermission("denied");
      pushLog("Permissão de microfone negada");
    }
  }

  async function startMicTest() {
    stopMicTest();
    try {
      const { stream } = await CaptureClient.testMicrophone(selectedMic);
      setTestStream(stream);
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      src.connect(an);
      const buf = new Uint8Array(an.fftSize);
      const tick = () => {
        an.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        setTestLevel(Math.min(1, Math.sqrt(sum / buf.length) * 2));
        testRafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e: any) { toast.error(e.message); }
  }
  function stopMicTest() {
    if (testRafRef.current) cancelAnimationFrame(testRafRef.current);
    testStream?.getTracks().forEach((t) => t.stop());
    setTestStream(null);
    setTestLevel(0);
  }
  useEffect(() => () => stopMicTest(), []);

  // ----- Captura ao vivo -----
  async function startCapture() {
    if (recState !== "idle") return;
    try {
      const env = detectEnv();
      const session = await api<{ id: string }>(`/meetings/${id}/capture-sessions`, {
        method: "POST",
        body: { sourceType: withDisplay ? "mixed" : "mic", ...env },
      });
      sessionIdRef.current = session.id;
      pushLog(`Sessão criada (${session.id.slice(0, 8)}…)`);

      const c = new CaptureClient();
      await c.start({
        micDeviceId: selectedMic || undefined,
        withDisplay,
        callbacks: {
          onLevel: (l) => setLiveLevel(l),
          onError: (msg) => { pushLog(`⚠ ${msg}`); toast.warning(msg); },
          onDeviceLost: () => { pushLog("Dispositivo perdido"); toast.error("Dispositivo de áudio desconectado"); },
        },
      });
      captureRef.current = c;
      setRecState("recording");
      pushLog(withDisplay ? "Gravando microfone + áudio compartilhado" : "Gravando microfone");

      // Heartbeat a cada 15s
      heartbeatRef.current = setInterval(async () => {
        if (!sessionIdRef.current) return;
        try {
          await api(`/capture-sessions/${sessionIdRef.current}/heartbeat`, {
            method: "POST",
            body: { status: c["recorder"]?.state === "paused" ? "paused" : "recording", audioLevel: liveLevel, sourceType: c.source, streamStatus: "ok" },
          });
        } catch {}
      }, 15000);

      // Cronômetro
      const timer = setInterval(() => {
        if (!captureRef.current) { clearInterval(timer); return; }
        setElapsed(captureRef.current.elapsedSeconds);
      }, 1000);
    } catch (e: any) {
      toast.error(`Não foi possível iniciar: ${e.message}`);
      pushLog(`Falha ao iniciar: ${e.message}`);
      setRecState("error");
    }
  }

  function pauseCapture() {
    captureRef.current?.pause();
    setRecState("paused");
    pushLog("Captura pausada");
  }
  function resumeCapture() {
    captureRef.current?.resume();
    setRecState("recording");
    pushLog("Captura retomada");
  }

  async function stopAndUpload() {
    if (!captureRef.current || !sessionIdRef.current) return;
    setRecState("uploading");
    pushLog("Encerrando captura…");
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);

    const blob = await captureRef.current.stop();
    pushLog(`Áudio consolidado: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);

    try {
      await api(`/capture-sessions/${sessionIdRef.current}/end`, { method: "PATCH", body: { notes: quickNotes } });
    } catch {}

    // Upload via XHR para acompanhar progresso
    const fd = new FormData();
    fd.append("file", blob, `meeting-${id}.webm`);
    pushLog("Enviando arquivo…");
    const ok = await uploadWithProgress(`${API_BASE}/capture-sessions/${sessionIdRef.current}/upload`, fd, (p) => setUploadProgress(p));
    if (!ok) {
      setRecState("error");
      pushLog("Upload falhou");
      toast.error("Upload falhou");
      return;
    }
    pushLog("Upload concluído. Pipeline iniciado.");
    setRecState("done");
    toast.success("Captura enviada — processando transcrição.");
    setTimeout(() => navigate(`/app/meetings/${id}`), 1200);
  }

  function fmtTime(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return `${h ? h + ":" : ""}${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }

  if (!meeting) return <div className="text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/app/meetings")}>
        <ArrowLeft className="h-4 w-4 mr-1" />Voltar
      </Button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Bloco A: Info da reunião */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Informações</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Título</div>
              <div className="font-medium">{meeting.title}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Data e hora</div>
              <div>{new Date(meeting.scheduledAt).toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" })}</div>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary">{meeting.platform}</Badge>
              {meeting.captureEnabled && <Badge variant="outline"><Mic className="h-3 w-3 mr-1" />Captura</Badge>}
            </div>
            {meeting.meetingUrl && (
              <div className="space-y-2">
                <Button className="w-full" variant="outline" asChild>
                  <a href={meeting.meetingUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-2" />Abrir reunião</a>
                </Button>
                <Button className="w-full" variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(meeting.meetingUrl!); toast.success("Link copiado"); }}>
                  <Copy className="h-4 w-4 mr-2" />Copiar link
                </Button>
              </div>
            )}
            {meeting.preMeetingNotes && (
              <div>
                <div className="text-muted-foreground text-xs mb-1">Notas prévias</div>
                <div className="text-sm bg-muted/40 rounded p-2 whitespace-pre-wrap">{meeting.preMeetingNotes}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bloco B: Checklist técnico */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Checklist técnico</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <ChecklistRow
              ok={micPermission === "granted"}
              label="Permissão de microfone"
              action={micPermission !== "granted" && <Button size="sm" variant="outline" onClick={requestMicPermission}>Solicitar</Button>}
            />

            {micPermission === "granted" && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Microfone</Label>
                  <Select value={selectedMic} onValueChange={setSelectedMic}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {devices.map((d) => <SelectItem key={d.deviceId} value={d.deviceId}>{d.label || `Microfone (${d.deviceId.slice(0, 6)})`}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Teste de volume</Label>
                    <Button size="sm" variant={testStream ? "secondary" : "outline"} onClick={testStream ? stopMicTest : startMicTest}>
                      {testStream ? <><MicOff className="h-3 w-3 mr-1" />Parar teste</> : <><Volume2 className="h-3 w-3 mr-1" />Testar mic</>}
                    </Button>
                  </div>
                  <LevelBar value={testLevel} hint={testStream && testLevel < 0.02 ? "⚠ Sinal muito baixo. Fale mais alto ou aproxime do mic." : "Fale algo para verificar."} />
                </div>

                <ChecklistRow
                  ok={withDisplay}
                  label="Capturar áudio da aba/tela (opcional)"
                  action={
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={withDisplay} onChange={(e) => setWithDisplay(e.target.checked)} />
                      Habilitar
                    </label>
                  }
                />
                {withDisplay && (
                  <div className="text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/20 p-3 rounded">
                    <MonitorUp className="h-4 w-4 inline mr-1" />
                    Ao iniciar, o navegador pedirá para escolher uma aba/janela. <strong>Marque “Compartilhar áudio da aba”</strong> no diálogo, senão só o vídeo é capturado (sem som da reunião).
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Bloco C: Participantes */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base flex items-center justify-between">Participantes <ParticipantsAdd meetingId={id!} onAdded={load} /></CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {participants.length === 0 && <div className="text-sm text-muted-foreground">Nenhum participante.</div>}
            {participants.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-sm border rounded p-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{p.email || p.company || p.roleType}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={async () => { await api(`/meetings/${id}/participants/${p.id}`, { method: "DELETE" }); load(); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Bloco D: Captura ao vivo */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              Captura
              {recState === "recording" && <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><span className="h-2 w-2 rounded-full bg-red-500 animate-pulse mr-2" />REC {fmtTime(elapsed)}</Badge>}
              {recState === "paused" && <Badge variant="secondary">Pausada {fmtTime(elapsed)}</Badge>}
              {recState === "uploading" && <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Enviando {uploadProgress}%</Badge>}
              {recState === "done" && <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Enviado</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recState === "idle" && (
              <Button size="lg" className="w-full" onClick={startCapture} disabled={micPermission !== "granted"}>
                <Mic className="h-5 w-5 mr-2" />Iniciar captura
              </Button>
            )}

            {(recState === "recording" || recState === "paused") && (
              <div className="space-y-3">
                <LevelBar value={liveLevel} hint={liveLevel < 0.01 ? "⚠ Nenhum áudio detectado!" : "Áudio sendo capturado…"} />
                <div className="flex gap-2">
                  {recState === "recording" ? (
                    <Button variant="outline" onClick={pauseCapture}><Pause className="h-4 w-4 mr-1" />Pausar</Button>
                  ) : (
                    <Button variant="outline" onClick={resumeCapture}><Play className="h-4 w-4 mr-1" />Retomar</Button>
                  )}
                  <Button variant="destructive" onClick={stopAndUpload}><Square className="h-4 w-4 mr-1" />Encerrar e enviar</Button>
                </div>
                <div>
                  <Label className="text-xs">Notas rápidas (vão para o card)</Label>
                  <Textarea rows={3} value={quickNotes} onChange={(e) => setQuickNotes(e.target.value)} placeholder="Decisões, próximos passos…" />
                </div>
              </div>
            )}

            {recState === "uploading" && <Progress value={uploadProgress} />}

            <div className="border-t pt-3">
              <div className="text-xs text-muted-foreground mb-2">Logs operacionais</div>
              <div className="text-xs space-y-1 max-h-40 overflow-y-auto bg-muted/30 rounded p-2 font-mono">
                {logMessages.length === 0 && <div className="text-muted-foreground">—</div>}
                {logMessages.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ChecklistRow({ ok, label, action }: { ok: boolean; label: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      {ok ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <AlertCircle className="h-5 w-5 text-muted-foreground" />}
      <div className="flex-1 text-sm">{label}</div>
      {action}
    </div>
  );
}

function LevelBar({ value, hint }: { value: number; hint?: string }) {
  const pct = Math.round(value * 100);
  const color = value < 0.02 ? "bg-muted-foreground/40" : value < 0.5 ? "bg-emerald-500" : "bg-amber-500";
  return (
    <div>
      <div className="h-3 bg-muted rounded overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

function ParticipantsAdd({ meetingId, onAdded }: { meetingId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", roleType: "guest" });
  async function add() {
    if (!form.name) return;
    try {
      await api(`/meetings/${meetingId}/participants`, { method: "POST", body: form });
      setForm({ name: "", email: "", company: "", roleType: "guest" });
      setOpen(false);
      onAdded();
    } catch (e: any) { toast.error(e.message); }
  }
  return (
    <details open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)} className="text-sm">
      <summary className="cursor-pointer list-none"><Button size="sm" variant="ghost"><Plus className="h-4 w-4" /></Button></summary>
      <div className="mt-2 space-y-2 text-xs">
        <Input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input placeholder="Empresa" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        <Button size="sm" onClick={add} className="w-full">Adicionar</Button>
      </div>
    </details>
  );
}

/** Upload com progresso usando XHR */
function uploadWithProgress(url: string, formData: FormData, onProgress: (p: number) => void): Promise<boolean> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    const t = getToken();
    if (t) xhr.setRequestHeader("Authorization", `Bearer ${t}`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => resolve(false);
    xhr.send(formData);
  });
}
