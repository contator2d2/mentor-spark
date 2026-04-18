import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, PlayCircle, Lock, CheckCircle2, Award, ChevronLeft, FileText, Video, Headphones } from "lucide-react";
import { toast } from "sonner";

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
  useEffect(() => { api<any[]>("/trails").then(setTrails).catch(() => setTrails([])); }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-display font-bold flex items-center gap-2">
        <GraduationCap className="h-6 w-6 text-primary" /> Minhas Trilhas
      </h1>
      <div className="grid gap-3">
        {trails.map(t => (
          <Card key={t.id} className="overflow-hidden cursor-pointer hover:border-primary" onClick={() => navigate(`/me/trails/${t.id}`)}>
            <div className="flex">
              <div className="w-24 h-24 bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center shrink-0">
                {t.coverUrl ? <img src={t.coverUrl} className="h-full w-full object-cover" alt="" /> : <GraduationCap className="h-8 w-8 text-white/60" />}
              </div>
              <div className="p-3 flex-1 min-w-0">
                <div className="font-semibold truncate">{t.title}</div>
                <div className="text-xs text-muted-foreground line-clamp-1">{t.description}</div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-[10px]">{t.completedLessons || 0} aulas concluídas</Badge>
                </div>
              </div>
            </div>
          </Card>
        ))}
        {trails.length === 0 && <Card className="p-8 text-center text-muted-foreground">Nenhuma trilha disponível ainda.</Card>}
      </div>
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
          <p className="text-muted-foreground mt-2">Concedido por completar a trilha</p>
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
      <Button variant="ghost" size="sm" onClick={() => navigate("/me/trails")}><ChevronLeft className="h-4 w-4 mr-1" />Trilhas</Button>

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
                  {l.completed ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> : <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
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
