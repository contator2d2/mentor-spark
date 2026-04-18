// Prontuário Inteligente — /app/leads/:id
// Substitui o antigo LeadDossier. Mostra capa + 10 abas (3 ativas na Fase 1).
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
  ArrowLeft, Loader2, Activity, ClipboardList, Calendar, CheckSquare, Sparkles,
  Target, BarChart3, FileText, Lock, Bell, Brain, ListChecks, Folder, Settings,
  Link2, UserPlus, FileSignature, Copy, Download, Building2, DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { ProntuarioPayload, MentoredRecord, STAGE_META } from "./types";
import { VisaoGeralTab } from "./tabs/VisaoGeralTab";
import { ResumoExecutivoTab } from "./tabs/ResumoExecutivoTab";
import { TimelineTab } from "./tabs/TimelineTab";
import { TestesTab } from "./tabs/TestesTab";
import { ReunioesTab } from "./tabs/ReunioesTab";
import { TarefasTab } from "./tabs/TarefasTab";
import { DoresObjetivosTab } from "./tabs/DoresObjetivosTab";
import { IndicadoresTab } from "./tabs/IndicadoresTab";
import { PlanoAcaoTab } from "./tabs/PlanoAcaoTab";
import { NotasPrivadasTab } from "./tabs/NotasPrivadasTab";
import { AlertasTab } from "./tabs/AlertasTab";
import { MateriaisTab } from "./tabs/MateriaisTab";
import { IATab } from "./tabs/IATab";
import { PersonalizacaoTab } from "./tabs/PersonalizacaoTab";
import { FinanceiroTab } from "./tabs/FinanceiroTab";

export default function ProntuarioPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState<ProntuarioPayload | null>(null);
  const [recalculating, setRecalculating] = useState(false);

  // Ações herdadas do antigo Dossier
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [contractOpen, setContractOpen] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [tplId, setTplId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [converting, setConverting] = useState(false);

  const dossierLeadId = data?.lead?.id ?? id;

  useEffect(() => {
    if (!id) return;
    api<ProntuarioPayload>(`/prontuario/${id}`)
      .then((res) => {
        setData(res);
        if (res.lead?.id && res.lead.id !== id) {
          nav(`/app/leads/${res.lead.id}`, { replace: true });
        }
      })
      .catch((e) => toast.error(e.message));
  }, [id, nav]);

  async function recalculate() {
    if (!data) return;
    setRecalculating(true);
    try {
      const updated = await api<MentoredRecord>(`/prontuario/${data.record.id}/recalculate`, { method: "POST" });
      setData({ ...data, record: updated });
      toast.success("Scores recalculados");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRecalculating(false);
    }
  }

  function onRecordUpdated(rec: MentoredRecord) {
    if (data) setData({ ...data, record: rec });
  }

  async function generateLink() {
    if (!dossierLeadId) return;
    try {
      const res = await api<{ url: string }>(`/leads/${dossierLeadId}/onboarding-link`, { method: "POST" });
      setLinkUrl(res.url);
      setLinkOpen(true);
    } catch (e: any) { toast.error(e.message); }
  }

  async function convert() {
    if (!dossierLeadId || !confirm("Converter este lead em mentorado?")) return;
    setConverting(true);
    try {
      await api(`/leads/${dossierLeadId}/convert`, { method: "POST" });
      toast.success("Lead convertido em mentorado!");
      const updated = await api<ProntuarioPayload>(`/prontuario/${dossierLeadId}`);
      setData(updated);
    } catch (e: any) { toast.error(e.message); }
    finally { setConverting(false); }
  }

  async function openContract() {
    try {
      const list = await api<any[]>("/contract-templates");
      setTemplates(list);
      if (list.length > 0) setTplId(list[0].id);
      setContractOpen(true);
    } catch (e: any) { toast.error(e.message); }
  }

  async function generateContract() {
    if (!tplId || !dossierLeadId) return;
    setGenerating(true);
    try {
      const res = await fetch(`${(import.meta as any).env.VITE_API_URL || ""}/contracts/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ leadId: dossierLeadId, templateId: tplId }),
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
    } catch (e: any) { toast.error(e.message); }
    finally { setGenerating(false); }
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const { lead, record } = data;
  const stage = STAGE_META[record.currentStage];

  return (
    <div className="space-y-4">
      {/* Header de navegação + ações */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => nav("/app/leads")}>
          <ArrowLeft className="h-4 w-4 mr-2" />Voltar ao funil
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={generateLink}>
            <Link2 className="h-4 w-4 mr-2" />Link de cadastro
          </Button>
          {lead.stage !== "client" && (
            <Button
              size="sm"
              onClick={convert}
              disabled={converting}
              className="bg-emerald-500/90 hover:bg-emerald-500 text-white"
            >
              {converting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Converter em mentorado
            </Button>
          )}
          <Button size="sm" onClick={openContract} className="bg-gradient-primary hover:opacity-90">
            <FileSignature className="h-4 w-4 mr-2" />Gerar contrato
          </Button>
        </div>
      </div>

      {/* Capa do prontuário (compacta) */}
      <Card className="p-5 bg-gradient-to-br from-card via-card to-primary/5 border-primary/20">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">{lead.name}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline" className={stage.cls}>{stage.label}</Badge>
              <Badge variant="outline" className="capitalize">Funil: {lead.stage}</Badge>
              {lead.isPartner && (
                <Badge className="bg-violet-500/15 text-violet-300 border border-violet-500/30">
                  <Building2 className="h-3 w-3 mr-1" />
                  Sócio{lead.partnerRole ? ` · ${lead.partnerRole}` : ""}
                </Badge>
              )}
              {lead.companyId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => nav(`/app/companies/${lead.companyId}`)}
                >
                  Abrir prontuário da empresa
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Score geral</div>
            <div className="font-display text-4xl font-bold text-gradient">{record.overallScore}%</div>
          </div>
        </div>
      </Card>

      {/* Diálogos */}
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

      {/* Abas */}
      <Tabs defaultValue="overview" className="space-y-3">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview"><Activity className="h-3 w-3 mr-1" />Visão geral</TabsTrigger>
          <TabsTrigger value="summary"><FileText className="h-3 w-3 mr-1" />Resumo executivo</TabsTrigger>
          <TabsTrigger value="pains"><Target className="h-3 w-3 mr-1" />Dores & Objetivos</TabsTrigger>
          <TabsTrigger value="metrics"><BarChart3 className="h-3 w-3 mr-1" />Indicadores</TabsTrigger>
          <TabsTrigger value="plan"><ListChecks className="h-3 w-3 mr-1" />Plano de ação</TabsTrigger>
          <TabsTrigger value="tests"><ClipboardList className="h-3 w-3 mr-1" />Testes ({data.tests.length})</TabsTrigger>
          <TabsTrigger value="meetings"><Calendar className="h-3 w-3 mr-1" />Reuniões ({data.meetings.length})</TabsTrigger>
          <TabsTrigger value="tasks"><CheckSquare className="h-3 w-3 mr-1" />Tarefas ({data.tasks.length})</TabsTrigger>
          <TabsTrigger value="timeline"><Sparkles className="h-3 w-3 mr-1" />Timeline</TabsTrigger>
          <TabsTrigger value="notes"><Lock className="h-3 w-3 mr-1" />Notas privadas</TabsTrigger>
          <TabsTrigger value="alerts"><Bell className="h-3 w-3 mr-1" />Alertas</TabsTrigger>
          <TabsTrigger value="materials"><Folder className="h-3 w-3 mr-1" />Materiais</TabsTrigger>
          <TabsTrigger value="finance"><DollarSign className="h-3 w-3 mr-1" />Financeiro</TabsTrigger>
          <TabsTrigger value="ai"><Brain className="h-3 w-3 mr-1" />IA & Insights</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="h-3 w-3 mr-1" />Personalização</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <VisaoGeralTab data={data} recalculating={recalculating} onRecalculate={recalculate} />
        </TabsContent>

        <TabsContent value="summary">
          <ResumoExecutivoTab record={record} onUpdated={onRecordUpdated} />
        </TabsContent>

        <TabsContent value="pains"><DoresObjetivosTab recordId={record.id} /></TabsContent>
        <TabsContent value="metrics"><IndicadoresTab recordId={record.id} /></TabsContent>
        <TabsContent value="plan"><PlanoAcaoTab leadId={lead.id} /></TabsContent>

        <TabsContent value="tests"><TestesTab data={data} /></TabsContent>
        <TabsContent value="meetings"><ReunioesTab data={data} /></TabsContent>
        <TabsContent value="tasks"><TarefasTab data={data} /></TabsContent>

        <TabsContent value="timeline"><TimelineTab data={data} recordId={record.id} /></TabsContent>
        <TabsContent value="notes"><NotasPrivadasTab recordId={record.id} /></TabsContent>
        <TabsContent value="alerts"><AlertasTab recordId={record.id} /></TabsContent>
        <TabsContent value="materials"><MateriaisTab recordId={record.id} /></TabsContent>
        <TabsContent value="finance"><FinanceiroTab leadId={lead.id} /></TabsContent>

        <TabsContent value="ai">
          <IATab
            recordId={record.id}
            onSummaryPromoted={() => {
              // Recarrega prontuário para refletir novo currentSummary
              api<ProntuarioPayload>(`/prontuario/${id}`).then(setData).catch(() => {});
            }}
          />
        </TabsContent>

        <TabsContent value="settings"><PersonalizacaoTab /></TabsContent>
      </Tabs>
    </div>
  );
}
