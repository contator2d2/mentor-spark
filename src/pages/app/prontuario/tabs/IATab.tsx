// Aba: IA & Insights — geração de insights pelo modelo configurado
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Brain, Sparkles, Loader2, Trash2, Star, AlertTriangle, ListChecks,
  Search, FileText, TrendingUp, Wand2, Copy,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { relativeDate } from "../types";

interface Insight {
  id: string;
  type: string;
  title: string;
  content: string;
  promoted: boolean;
  model?: string;
  sourceMeta?: any;
  createdAt: string;
}

const TYPES: Array<{ value: string; label: string; Icon: any; description: string }> = [
  { value: "executive_summary", label: "Resumo executivo", Icon: FileText,    description: "Consolidação 6-10 linhas para promover ao prontuário." },
  { value: "agenda_suggestion", label: "Pauta de reunião", Icon: ListChecks,  description: "Estrutura objetiva para próxima call." },
  { value: "risk_analysis",     label: "Análise de risco", Icon: AlertTriangle,description: "Sinais de churn e ações imediatas." },
  { value: "pattern_detection", label: "Padrões",          Icon: Search,      description: "Comportamentos e gargalos recorrentes." },
  { value: "next_steps",        label: "Próximos passos",  Icon: Wand2,       description: "5 ações priorizadas com prazo." },
  { value: "progress_report",   label: "Evolução",         Icon: TrendingUp,  description: "O que avançou, estagnou ou regrediu." },
];

interface Props { recordId: string; onSummaryPromoted?: () => void }

export function IATab({ recordId, onSummaryPromoted }: Props) {
  const [items, setItems] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("executive_summary");
  const [includeNotes, setIncludeNotes] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setItems(await api<Insight[]>(`/prontuario/${recordId}/insights`));
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [recordId]);

  async function generate() {
    setGenerating(true);
    try {
      const created = await api<Insight>(`/prontuario/${recordId}/insights/generate`, {
        method: "POST", body: { type, includeNotes },
      });
      toast.success("Insight gerado");
      setItems(prev => [created, ...prev]);
    } catch (e: any) {
      toast.error(e.message || "Falha ao gerar — verifique se há um provedor de IA configurado");
    }
    finally { setGenerating(false); }
  }

  async function promote(id: string) {
    try {
      await api(`/prontuario/${recordId}/insights/${id}/promote`, { method: "POST" });
      toast.success("Promovido para resumo executivo do prontuário");
      onSummaryPromoted?.();
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function remove(id: string) {
    if (!confirm("Excluir este insight?")) return;
    try {
      await api(`/prontuario/${recordId}/insights/${id}`, { method: "DELETE" });
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  const selectedType = TYPES.find(t => t.value === type)!;
  const TIcon = selectedType.Icon;

  return (
    <div className="space-y-4">
      <Card className="p-5 bg-gradient-to-br from-card via-card to-primary/5 border-primary/30">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg font-semibold">Gerar insight com IA</h3>
            <p className="text-sm text-muted-foreground">
              Usa seu prompt, metodologia e personalização configurados. Histórico preservado para acompanhar evolução.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3 mt-4">
          <div className="md:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tipo de insight</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map(t => {
                  const Ic = t.Icon;
                  return (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2"><Ic className="h-3 w-3" /> {t.label}</div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TIcon className="h-3 w-3" /> {selectedType.description}
            </p>
          </div>
          <div className="flex flex-col justify-end gap-3">
            <div className="flex items-center gap-2">
              <Switch id="notes" checked={includeNotes} onCheckedChange={setIncludeNotes} />
              <Label htmlFor="notes" className="text-sm">Incluir notas privadas</Label>
            </div>
            <Button onClick={generate} disabled={generating} className="bg-gradient-primary hover:opacity-90">
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Gerar
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <h4 className="font-display font-semibold">Histórico ({items.length})</h4>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">
          Nenhum insight gerado ainda. Use o botão acima para começar.
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map(i => {
            const meta = TYPES.find(t => t.value === i.type);
            const Icon = meta?.Icon || Brain;
            return (
              <Card key={i.id} className={`p-4 ${i.promoted ? "border-emerald-500/40 bg-emerald-500/5" : ""}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h5 className="font-medium">{i.title}</h5>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{relativeDate(i.createdAt)}</span>
                        {meta && <Badge variant="outline" className="text-xs">{meta.label}</Badge>}
                        {i.promoted && (
                          <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs">
                            <Star className="h-3 w-3 mr-1" /> Resumo oficial
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" title="Copiar" onClick={() => {
                      navigator.clipboard.writeText(i.content);
                      toast.success("Copiado");
                    }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    {i.type === "executive_summary" && !i.promoted && (
                      <Button size="sm" variant="outline" onClick={() => promote(i.id)}>
                        <Star className="h-3 w-3 mr-1" /> Promover
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => remove(i.id)}>
                      <Trash2 className="h-4 w-4 text-rose-400" />
                    </Button>
                  </div>
                </div>
                <div className="text-sm whitespace-pre-wrap leading-relaxed bg-muted/20 rounded-lg p-3 border border-border/40">
                  {i.content}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
