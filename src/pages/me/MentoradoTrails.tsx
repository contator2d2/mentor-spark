import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, PlayCircle, Lock, CheckCircle2, Award, ChevronLeft, FileText, Video, Headphones, DollarSign, Clock } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const LESSON_ICONS: any = { video: Video, article: FileText, audio: Headphones, pdf: FileText };

function getEmbedUrl(url: string): string {
  if (!url) return "";
  // YouTube
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  // Vimeo
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return url;
}

export function MentoradoTrailsList() {
  const navigate = useNavigate();
  const [trails, setTrails] = useState<any[]>([]);
  const [reqOpen, setReqOpen] = useState<any>(null);
  const [reqMsg, setReqMsg] = useState("");
  function load() { api<any[]>("/trails").then(setTrails).catch(() => setTrails([])); }
  useEffect(() => { load(); }, []);

  async function requestAccess(trail: any) {
    try {
      const r: any = await api(`/trail-access/trails/${trail.id}/request`, { method: "POST", body: { message: reqMsg } });
      if (r?.chargeId) {
        toast.success("Cobrança gerada! Verifique seu Financeiro.");
        setReqOpen(null); setReqMsg("");
        return;
      }
      toast.success("Solicitação enviada ao mentor!");
      setReqOpen(null); setReqMsg(""); load();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-display font-bold flex items-center gap-2">
        <GraduationCap className="h-6 w-6 text-primary" /> Minha Academy
      </h1>
      <div className="grid gap-3">
        {trails.map(t => {
          const locked = t.locked;
          const cta = t.cta;
          return (
            <Card key={t.id} className="overflow-hidden hover:border-primary transition-colors">
              <div className="flex">
                <div className="relative w-28 h-28 bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center shrink-0">
                  {t.coverUrl ? (
                    <img src={t.coverUrl} className={`h-full w-full object-cover ${locked ? "blur-sm scale-110" : ""}`} alt="" />
                  ) : (
                    <GraduationCap className="h-8 w-8 text-white/60" />
                  )}
                  {locked && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center">
                      <div className="h-10 w-10 rounded-full bg-background/90 border border-primary/40 flex items-center justify-center shadow">
                        <Lock className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-3 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold truncate">{t.title}</div>
                    {locked && <Badge variant="outline" className="text-[10px] border-warning/40 text-warning">Bloqueado</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{locked ? t.accessMessage : t.description}</div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {!locked && <Badge variant="secondary" className="text-[10px]">{t.completedLessons || 0} aulas concluídas</Badge>}
                    {locked && cta?.kind === "pay" && (
                      <Button size="sm" onClick={() => setReqOpen(t)}>
                        <DollarSign className="h-3 w-3 mr-1" /> {cta.label}
                      </Button>
                    )}
                    {locked && cta?.kind === "request" && (
                      <Button size="sm" variant="outline" disabled={!!cta.pendingRequestId} onClick={() => setReqOpen(t)}>
                        {cta.pendingRequestId ? "Solicitação enviada" : cta.label}
                      </Button>
                    )}
                    {locked && cta?.kind === "wait" && (
                      <Badge variant="outline" className="text-[10px]"><Clock className="h-3 w-3 mr-1" />{cta.label}</Badge>
                    )}
                    {!locked && (
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/me/trails/${t.id}`)}>Acessar →</Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
        {trails.length === 0 && <Card className="p-8 text-center text-muted-foreground">Nenhum curso disponível ainda.</Card>}
      </div>

      <Dialog open={!!reqOpen} onOpenChange={(o) => { if (!o) { setReqOpen(null); setReqMsg(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{reqOpen?.cta?.kind === "pay" ? "Desbloquear curso" : "Solicitar acesso"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">{reqOpen?.title}</div>
            {reqOpen?.cta?.kind === "pay" && (
              <div className="text-sm">Será gerada uma cobrança PIX no valor de <strong>R$ {((reqOpen.priceCents || 0) / 100).toFixed(2).replace(".", ",")}</strong>. Você poderá pagar pelo seu Financeiro.</div>
            )}
            <div>
              <label className="text-xs text-muted-foreground">Mensagem ao mentor (opcional)</label>
              <Textarea value={reqMsg} onChange={(e) => setReqMsg(e.target.value)} placeholder="Por que você quer esse curso?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReqOpen(null)}>Cancelar</Button>
            <Button onClick={() => requestAccess(reqOpen)}>{reqOpen?.cta?.kind === "pay" ? "Gerar cobrança" : "Enviar solicitação"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MentoradoTrailPlayer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trail, setTrail] = useState<any>(null);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [cert, setCert] = useState<any>(null);

  async function load() {
    try { setTrail(await api(`/trails/${id}`)); } catch (e: any) { toast.error(e.message); }
  }
  useEffect(() => { if (id) load(); }, [id]);

  async function complete(lessonId: string) {
    await api(`/trails/lessons/${lessonId}/complete`, { method: "POST", body: { percent: 100 } });
    toast.success("Aula concluída!");
    load();
  }

  async function getCert() {
    try { setCert(await api(`/trails/${id}/certificate`)); }
    catch (e: any) { toast.error(e.message); }
  }

  if (!trail) return <div>Carregando...</div>;

  const progress = trail.totalLessons ? (trail.completedLessons / trail.totalLessons) * 100 : 0;

  if (cert) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setCert(null)}><ChevronLeft className="h-4 w-4 mr-1" />Voltar</Button>
        <Card className="p-8 text-center bg-gradient-to-br from-primary/10 to-accent/10 border-primary">
          <Award className="h-20 w-20 mx-auto text-primary mb-4" />
          <h2 className="text-3xl font-display font-bold">Certificado de Conclusão</h2>
          <p className="text-muted-foreground mt-2">Concedido por completar o curso</p>
          <div className="text-2xl font-bold my-4">{cert.trail.title}</div>
          <div className="text-sm text-muted-foreground">Emitido em {new Date(cert.issuedAt).toLocaleDateString("pt-BR")}</div>
          <div className="text-xs font-mono mt-2 bg-muted px-2 py-1 rounded inline-block">{cert.verificationCode}</div>
          <Button className="mt-6" onClick={() => window.print()}>Imprimir / Baixar PDF</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate("/me/trails")}><ChevronLeft className="h-4 w-4 mr-1" />Academy</Button>

      <Card className="overflow-hidden">
        <div className="h-32 bg-gradient-to-br from-primary/30 to-accent/30">
          {trail.coverUrl && <img src={trail.coverUrl} className="h-full w-full object-cover" alt="" />}
        </div>
        <div className="p-4">
          <h1 className="text-2xl font-display font-bold">{trail.title}</h1>
          {trail.description && <p className="text-sm text-muted-foreground mt-1">{trail.description}</p>}
          <div className="mt-3">
            <Progress value={progress} />
            <div className="text-xs text-muted-foreground mt-1">{trail.completedLessons}/{trail.totalLessons} aulas · {Math.round(progress)}%</div>
          </div>
          {trail.allDone && trail.certificateEnabled && (
            <Button className="mt-3 w-full" onClick={getCert}><Award className="h-4 w-4 mr-1" />Ver Certificado</Button>
          )}
        </div>
      </Card>

      {activeLesson && (
        <Card className="p-4">
          <Button variant="ghost" size="sm" onClick={() => setActiveLesson(null)} className="mb-3"><ChevronLeft className="h-4 w-4 mr-1" />Voltar à lista</Button>
          <h3 className="font-bold text-lg mb-2">{activeLesson.title}</h3>
          {activeLesson.type === "video" && activeLesson.contentUrl && (
            <div className="aspect-video">
              <iframe src={getEmbedUrl(activeLesson.contentUrl)} className="w-full h-full rounded" allow="autoplay; fullscreen" allowFullScreen />
            </div>
          )}
          {activeLesson.type === "article" && (
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{activeLesson.body}</div>
          )}
          {activeLesson.type === "pdf" && (
            <iframe src={activeLesson.contentUrl} className="w-full h-[70vh] rounded border" />
          )}
          {activeLesson.type === "audio" && (
            <audio src={activeLesson.contentUrl} controls className="w-full" />
          )}
          {!activeLesson.completed && (
            <Button className="mt-4 w-full" onClick={() => complete(activeLesson.id)}>
              <CheckCircle2 className="h-4 w-4 mr-1" />Marcar como concluída
            </Button>
          )}
        </Card>
      )}

      {!activeLesson && trail.modules?.map((m: any, idx: number) => (
        <Card key={m.id} className={`p-4 ${m.locked ? "opacity-60" : ""}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-7 w-7 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-bold">{idx + 1}</span>
            <div className="font-semibold flex-1">{m.title}</div>
            {m.locked && <Lock className="h-4 w-4 text-muted-foreground" />}
          </div>
          {m.description && <p className="text-xs text-muted-foreground mb-2 ml-9">{m.description}</p>}
          <div className="space-y-1 ml-9">
            {m.lessons?.map((l: any) => {
              const Icon = LESSON_ICONS[l.type] || FileText;
              return (
                <div key={l.id}
                  className={`flex items-center gap-2 p-2 rounded ${m.locked ? "" : "hover:bg-muted/30 cursor-pointer"}`}
                  onClick={() => !m.locked && setActiveLesson(l)}>
                  {l.completed ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" /> : <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <div className="text-sm flex-1 min-w-0 truncate">{l.title}</div>
                  {l.durationMinutes > 0 && <span className="text-xs text-muted-foreground">{l.durationMinutes}min</span>}
                  {!m.locked && !l.completed && <PlayCircle className="h-4 w-4 text-primary" />}
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
