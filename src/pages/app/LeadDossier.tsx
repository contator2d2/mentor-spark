// Prontuário unificado do mentorado — /app/leads/:id
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Loader2,
  ClipboardList,
  Calendar,
  CheckSquare,
  Activity,
  Sparkles,
  Flame,
  Snowflake,
  Cloud,
} from "lucide-react";
import { toast } from "sonner";

interface Dossier {
  lead: any;
  account: any;
  stats: { testsCount: number; meetingsCount: number; tasksCount: number; avgScore: number | null };
  tests: any[];
  meetings: any[];
  tasks: any[];
  timeline: Array<{ type: string; at: string; title: string; ref: string; meta?: any }>;
}

function tempBadge(t?: string) {
  if (t === "hot") return <Badge className="bg-orange-600 hover:bg-orange-600"><Flame className="h-3 w-3 mr-1" />Quente</Badge>;
  if (t === "warm") return <Badge className="bg-amber-500 hover:bg-amber-500"><Cloud className="h-3 w-3 mr-1" />Morno</Badge>;
  if (t === "cold") return <Badge className="bg-sky-600 hover:bg-sky-600"><Snowflake className="h-3 w-3 mr-1" />Frio</Badge>;
  return null;
}

function relativeDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function LeadDossier() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState<Dossier | null>(null);

  useEffect(() => {
    api<Dossier>(`/dossier/lead/${id}`)
      .then(setData)
      .catch((e) => toast.error(e.message));
  }, [id]);

  if (!data) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
  const { lead, stats, tests, meetings, tasks, timeline } = data;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => nav("/app/leads")}><ArrowLeft className="h-4 w-4 mr-2" />Voltar ao funil</Button>

      {/* Header */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">{lead.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>
              {lead.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>}
              {lead.company && <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{lead.company}</span>}
            </div>
            <div className="flex gap-2 mt-3">
              <Badge variant="outline" className="capitalize">{lead.stage}</Badge>
              {tempBadge(lead.temperature)}
              {lead.score != null && <Badge variant="secondary">Score: {Math.round(lead.score)}%</Badge>}
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs"><ClipboardList className="h-3 w-3" />Testes</div>
          <div className="text-2xl font-bold mt-1">{stats.testsCount}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs"><Calendar className="h-3 w-3" />Reuniões</div>
          <div className="text-2xl font-bold mt-1">{stats.meetingsCount}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs"><CheckSquare className="h-3 w-3" />Tarefas</div>
          <div className="text-2xl font-bold mt-1">{stats.tasksCount}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs"><Sparkles className="h-3 w-3" />Score médio</div>
          <div className="text-2xl font-bold mt-1">{stats.avgScore != null ? `${stats.avgScore}%` : "—"}</div>
        </Card>
      </div>

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline"><Activity className="h-3 w-3 mr-1" />Linha do tempo</TabsTrigger>
          <TabsTrigger value="tests">Testes ({tests.length})</TabsTrigger>
          <TabsTrigger value="meetings">Reuniões ({meetings.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tarefas ({tasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-3">
          {timeline.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground text-sm">Sem atividades.</Card>
          ) : (
            <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border">
              {timeline.map((e, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[18px] top-1 h-2 w-2 rounded-full bg-primary" />
                  <Card className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium">{e.title}</div>
                        <div className="text-xs text-muted-foreground">{relativeDate(e.at)}</div>
                      </div>
                      {e.meta?.classification && tempBadge(e.meta.classification)}
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tests" className="space-y-3">
          {tests.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground text-sm">Nenhum teste respondido.</Card>
          ) : (
            tests.map((t) => (
              <Card key={t.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{t.template?.title || "Teste"}</div>
                    <div className="text-xs text-muted-foreground">{relativeDate(t.createdAt)}</div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Badge variant="outline">{Math.round(Number(t.scorePct))}%</Badge>
                    {tempBadge(t.classification)}
                  </div>
                </div>
                {t.aiAnalysis && (
                  <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap border-l-2 border-primary">
                    <div className="flex items-center gap-1 text-xs font-semibold text-primary mb-1">
                      <Sparkles className="h-3 w-3" />Análise IA
                    </div>
                    {t.aiAnalysis}
                  </div>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="meetings" className="space-y-3">
          {meetings.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground text-sm">Nenhuma reunião agendada.</Card>
          ) : (
            meetings.map((m) => (
              <Card key={m.id} className="p-4">
                <div className="font-semibold">{m.title}</div>
                <div className="text-xs text-muted-foreground">{relativeDate(m.scheduledAt)} · {m.status}</div>
                {m.aiSummary && <p className="text-sm mt-2">{m.aiSummary}</p>}
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-3">
          {tasks.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground text-sm">Nenhuma tarefa.</Card>
          ) : (
            tasks.map((t) => (
              <Card key={t.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{t.title}</div>
                  {t.dueDate && <div className="text-xs text-muted-foreground">Prazo: {relativeDate(t.dueDate)}</div>}
                </div>
                <Badge variant="outline" className="capitalize">{t.status}</Badge>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
