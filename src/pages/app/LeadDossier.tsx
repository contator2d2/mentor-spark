// Prontuário unificado do mentorado — /app/leads/:id
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Mail, Phone, Building2, Loader2, ClipboardList, Calendar,
  CheckSquare, Activity, Sparkles, Flame, Snowflake, Cloud,
  Link2, UserPlus, FileSignature, Copy, Download,
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

  // Action dialogs state
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [contractOpen, setContractOpen] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [tplId, setTplId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    api<Dossier>(`/dossier/lead/${id}`)
      .then(setData)
      .catch((e) => toast.error(e.message));
  }, [id]);

  async function generateLink() {
    try {
      const res = await api<{ url: string }>(`/leads/${id}/onboarding-link`, { method: "POST" });
      setLinkUrl(res.url);
      setLinkOpen(true);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function convert() {
    if (!confirm("Converter este lead em mentorado?")) return;
    setConverting(true);
    try {
      await api(`/leads/${id}/convert`, { method: "POST" });
      toast.success("Lead convertido em mentorado!");
      const updated = await api<Dossier>(`/dossier/lead/${id}`);
      setData(updated);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setConverting(false);
    }
  }

  async function openContract() {
    try {
      const list = await api<any[]>("/contract-templates");
      setTemplates(list);
      if (list.length > 0) setTplId(list[0].id);
      setContractOpen(true);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function generateContract() {
    if (!tplId) return;
    setGenerating(true);
    try {
      const res = await fetch(`${(import.meta as any).env.VITE_API_URL || ""}/contracts/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ leadId: id, templateId: tplId }),
      });
      if (!res.ok) throw new Error("Falha ao gerar contrato");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contrato-${data?.lead?.name || "lead"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Contrato gerado!");
      setContractOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGenerating(false);
    }
  }

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
            <div className="flex gap-2 mt-3 flex-wrap">
              <Badge variant="outline" className="capitalize">{lead.stage}</Badge>
              {tempBadge(lead.temperature)}
              {lead.score != null && <Badge variant="secondary">Score: {Math.round(lead.score)}%</Badge>}
              {lead.onboardingCompletedAt && <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Cadastro completo</Badge>}
              {lead.isPartner && (
                <Badge className="bg-violet-500/15 text-violet-400 border border-violet-500/30">
                  <Building2 className="h-3 w-3 mr-1" />Sócio{lead.partnerRole ? ` · ${lead.partnerRole}` : ""}
                </Badge>
              )}
            </div>
            {lead.companyId && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => nav(`/app/companies/${lead.companyId}`)}
              >
                <Building2 className="h-3 w-3 mr-2" />Abrir prontuário da empresa
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={generateLink}><Link2 className="h-4 w-4 mr-2" />Link de cadastro</Button>
            {lead.stage !== "client" && (
              <Button onClick={convert} disabled={converting} className="bg-emerald-500/90 hover:bg-emerald-500 text-white">
                {converting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                Converter em mentorado
              </Button>
            )}
            <Button onClick={openContract} className="bg-gradient-primary hover:opacity-90">
              <FileSignature className="h-4 w-4 mr-2" />Gerar contrato
            </Button>
          </div>
        </div>
      </Card>

      {/* Diálogos de ação */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Link de cadastro</DialogTitle>
            <DialogDescription>Envie este link ao lead para que preencha os dados completos para o contrato.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 items-center bg-muted/30 rounded-lg p-3 border border-border/40">
            <code className="text-xs flex-1 break-all">{linkUrl}</code>
            <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(linkUrl); toast.success("Copiado"); }}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={contractOpen} onOpenChange={setContractOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gerar contrato</DialogTitle>
            <DialogDescription>Escolha o template. Os dados do lead serão preenchidos automaticamente.</DialogDescription>
          </DialogHeader>
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum template criado. Vá em <b>Contratos</b> no menu para criar.</p>
          ) : (
            <Select value={tplId} onValueChange={setTplId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <DialogFooter>
            <Button onClick={generateContract} disabled={generating || !tplId} className="bg-gradient-primary hover:opacity-90">
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
