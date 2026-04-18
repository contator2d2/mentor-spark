import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, RefreshCw, Download, FileText, AlertCircle, CheckCircle2, Loader2, Mic, Sparkles, Users, Paperclip, X,
} from "lucide-react";
import { toast } from "sonner";
import { MediaUpload, UploadedMedia } from "@/components/MediaUpload";

type Meeting = any;
type Session = { id: string; status: string; totalChunks: number; completedChunks: number; durationSeconds: number; errorMessage?: string; createdAt: string };
type ChunkInfo = { id: string; orderIndex: number; status: string; transcript?: string; errorMessage?: string; startSecond: number; endSecond: number };

const STATUS_TEXT: Record<string, string> = {
  pending: "Aguardando", preparing: "Preparando", recording: "Gravando", paused: "Pausada", stopped: "Encerrada",
  uploaded: "Upload concluído", inspecting: "Inspecionando arquivo", chunking: "Quebrando em partes",
  transcribing: "Transcrevendo", merging: "Consolidando texto", transcript_ready: "Transcrição pronta",
  summarizing: "Gerando resumo IA", summarized: "Resumo pronto", failed: "Falha",
};

export default function MeetingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [chunks, setChunks] = useState<ChunkInfo[]>([]);
  const [consolidated, setConsolidated] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);

  async function load() {
    try {
      const m = await api<Meeting>(`/meetings/${id}`);
      setMeeting(m);
      const ss = await api<Session[]>(`/meetings/${id}/capture-sessions`);
      setSessions(ss);
      const last = ss[0];
      setActiveSession(last || null);
      if (last) {
        const tr = await api<{ consolidated: string; chunks: ChunkInfo[] }>(`/capture-sessions/${last.id}/transcription`);
        setConsolidated(tr.consolidated);
        setChunks(tr.chunks);
        const lg = await api<any[]>(`/capture-sessions/${last.id}/logs`);
        setLogs(lg);
      }
      const ps = await api<any[]>(`/meetings/${id}/participants`);
      setParticipants(ps);
    } catch (e: any) { toast.error(e.message); }
  }
  useEffect(() => { load(); }, [id]);

  // Auto-refresh enquanto está processando
  useEffect(() => {
    if (!activeSession) return;
    const final = ["summarized", "failed", "transcript_ready"].includes(activeSession.status);
    if (final) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [activeSession?.status, activeSession?.id]);

  async function reprocess() {
    if (!activeSession) return;
    try {
      await api(`/capture-sessions/${activeSession.id}/reprocess`, { method: "POST" });
      toast.success("Reprocessamento iniciado");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function regenerateSummary() {
    try {
      await api(`/meetings/${id}/generate-summary`, { method: "POST" });
      toast.success("Resumo regenerado");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  if (!meeting) return <div className="text-muted-foreground">Carregando…</div>;

  const progress = activeSession?.totalChunks ? Math.round((activeSession.completedChunks / activeSession.totalChunks) * 100) : 0;
  const isProcessing = activeSession && !["summarized", "failed", "transcript_ready"].includes(activeSession.status);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/app/meetings")}>
        <ArrowLeft className="h-4 w-4 mr-1" />Voltar
      </Button>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline">{meeting.platform}</Badge>
            <Badge variant="secondary">{meeting.status}</Badge>
          </div>
          <h1 className="text-2xl font-display tracking-tight">{meeting.title}</h1>
          <div className="text-muted-foreground text-sm mt-1">
            {new Date(meeting.scheduledAt).toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" })}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/app/meetings/${id}/prepare`)}>
            <Mic className="h-4 w-4 mr-1" />Nova captura
          </Button>
          {activeSession?.status === "transcript_ready" && (
            <Button onClick={regenerateSummary}><Sparkles className="h-4 w-4 mr-1" />Gerar resumo</Button>
          )}
        </div>
      </div>

      {isProcessing && (
        <Card className="border-violet-500/30 bg-violet-500/5">
          <CardContent className="py-4 flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-violet-500 animate-spin" />
            <div className="flex-1">
              <div className="font-medium text-sm">{STATUS_TEXT[activeSession!.status] || activeSession!.status}</div>
              {activeSession!.totalChunks > 0 && (
                <>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Transcrevendo parte {activeSession!.completedChunks} de {activeSession!.totalChunks}
                  </div>
                  <Progress value={progress} className="mt-2 h-1" />
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeSession?.status === "failed" && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div className="flex-1 text-sm">
              <div className="font-medium">Pipeline falhou</div>
              <div className="text-xs text-muted-foreground">{activeSession.errorMessage}</div>
            </div>
            <Button size="sm" variant="outline" onClick={reprocess}><RefreshCw className="h-4 w-4 mr-1" />Reprocessar</Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Resumo</TabsTrigger>
          <TabsTrigger value="participants">Participantes ({participants.length})</TabsTrigger>
          <TabsTrigger value="attachments">Anexos ({(meeting.attachments || []).length})</TabsTrigger>
          <TabsTrigger value="capture">Captura & transcrição</TabsTrigger>
          <TabsTrigger value="logs">Logs técnicos</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          {meeting.aiSummary ? (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center"><Sparkles className="h-4 w-4 mr-2 text-primary" />Resumo IA</CardTitle></CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap leading-relaxed">{meeting.aiSummary}</CardContent>
            </Card>
          ) : (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Nenhum resumo ainda. Faça uma captura ou aguarde o processamento.</CardContent></Card>
          )}
          {meeting.aiInsights && (
            <div className="grid md:grid-cols-3 gap-4">
              <InsightBox title="Pontos-chave" items={meeting.aiInsights.keyPoints} />
              <InsightBox title="Decisões" items={meeting.aiInsights.decisions} />
              <InsightBox title="Próximas ações" items={meeting.aiInsights.nextActions} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="participants" className="space-y-2">
          {participants.length === 0 && <div className="text-sm text-muted-foreground">Nenhum participante.</div>}
          {participants.map((p) => (
            <Card key={p.id}><CardContent className="py-3 flex items-center gap-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <div className="font-medium text-sm">{p.name}</div>
                <div className="text-xs text-muted-foreground">{[p.email, p.company, p.roleType].filter(Boolean).join(" · ")}</div>
              </div>
              <Badge variant="outline" className="text-xs">{p.attendanceStatus}</Badge>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="attachments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <Paperclip className="h-4 w-4 mr-2 text-primary" />
                Adicionar anexo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                PDFs, slides, materiais de apoio ou um áudio gravado externamente para transcrever.
              </p>
              <MediaUpload
                onChange={async (m) => {
                  if (!m) return;
                  const newAttach = {
                    url: m.url,
                    name: m.originalName,
                    kind: m.kind,
                    mimetype: m.mimetype,
                    size: m.size,
                    uploadedAt: new Date().toISOString(),
                  };
                  const next = [...(meeting.attachments || []), newAttach];
                  await api(`/meetings/${id}`, { method: "PATCH", body: { attachments: next } });
                  setMeeting({ ...meeting, attachments: next });
                  toast.success("Anexo salvo");
                }}
              />
            </CardContent>
          </Card>

          {(meeting.attachments || []).length > 0 ? (
            <div className="space-y-2">
              {(meeting.attachments as any[]).map((a, idx) => (
                <Card key={idx} className="group">
                  <CardContent className="py-3 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      {a.kind === "image" ? <FileText className="h-4 w-4" /> : a.kind === "audio" ? <Mic className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <a href={a.url} target="_blank" rel="noreferrer" className="text-sm font-medium hover:text-primary truncate block">
                        {a.name}
                      </a>
                      <div className="text-xs text-muted-foreground">
                        {(a.size / 1024 / 1024).toFixed(2)} MB · {new Date(a.uploadedAt).toLocaleString("pt-BR")}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={async () => {
                        const next = (meeting.attachments as any[]).filter((_, i) => i !== idx);
                        await api(`/meetings/${id}`, { method: "PATCH", body: { attachments: next } });
                        setMeeting({ ...meeting, attachments: next });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                Nenhum anexo. Use o uploader acima.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="capture" className="space-y-4">
          {sessions.length === 0 && <div className="text-sm text-muted-foreground">Nenhuma sessão de captura.</div>}
          {activeSession && (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Sessão atual</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Stat label="Status" value={STATUS_TEXT[activeSession.status] || activeSession.status} />
                    <Stat label="Duração" value={`${Math.floor(activeSession.durationSeconds / 60)}min ${activeSession.durationSeconds % 60}s`} />
                    <Stat label="Chunks" value={`${activeSession.completedChunks}/${activeSession.totalChunks}`} />
                    <Stat label="Iniciada em" value={new Date(activeSession.createdAt).toLocaleString("pt-BR")} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={reprocess}><RefreshCw className="h-4 w-4 mr-1" />Reprocessar</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Partes (chunks)</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {chunks.length === 0 && <div className="text-sm text-muted-foreground">Sem chunks ainda.</div>}
                  {chunks.map((c) => (
                    <div key={c.id} className="border rounded p-2 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium">Parte {c.orderIndex + 1}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{Math.round(c.startSecond)}s → {Math.round(c.endSecond)}s</span>
                          <ChunkBadge status={c.status} />
                        </div>
                      </div>
                      {c.transcript && <div className="text-muted-foreground line-clamp-2">{c.transcript}</div>}
                      {c.errorMessage && <div className="text-destructive">⚠ {c.errorMessage}</div>}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base flex items-center"><FileText className="h-4 w-4 mr-2" />Transcrição consolidada</CardTitle></CardHeader>
                <CardContent>
                  {consolidated ? (
                    <div className="text-sm whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto bg-muted/30 rounded p-3">{consolidated}</div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Aguardando consolidação…</div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-2">
          {logs.length === 0 && <div className="text-sm text-muted-foreground">Nenhum log.</div>}
          {logs.map((l) => (
            <div key={l.id} className="border rounded p-2 text-xs font-mono flex gap-2">
              <Badge variant={l.level === "error" ? "destructive" : l.level === "warn" ? "secondary" : "outline"} className="text-xs h-fit">{l.level}</Badge>
              <div className="flex-1">
                <div>{l.message}</div>
                <div className="text-muted-foreground">{new Date(l.createdAt).toLocaleString("pt-BR")} · {l.eventType}</div>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InsightBox({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <Card><CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent><ul className="text-sm space-y-1 list-disc pl-4">{items.map((it, i) => <li key={i}>{it}</li>)}</ul></CardContent>
    </Card>
  );
}
function Stat({ label, value }: { label: string; value: any }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="font-medium text-sm">{value}</div></div>;
}
function ChunkBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    pending: { cls: "bg-muted text-muted-foreground", label: "Pendente" },
    queued: { cls: "bg-blue-500/10 text-blue-600", label: "Na fila" },
    transcribing: { cls: "bg-violet-500/10 text-violet-600", label: "Transcrevendo" },
    transcribed: { cls: "bg-emerald-500/10 text-emerald-600", label: "Pronto" },
    failed: { cls: "bg-destructive/10 text-destructive", label: "Falhou" },
  };
  const m = map[status] || map.pending;
  return <Badge variant="outline" className={m.cls}>{m.label}</Badge>;
}
