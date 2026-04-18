// Aba: Indicadores e Métricas (customizáveis por mentor/mentorado)
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Loader2, BarChart3, TrendingUp, TrendingDown, Minus, Trash2, Edit3,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Metric {
  id: string;
  name: string;
  category?: string;
  unit?: string;
  currentValue?: number;
  previousValue?: number;
  targetValue?: number;
  trend?: "up" | "down" | "flat";
  frequency: "daily" | "weekly" | "monthly" | "quarterly";
  referenceDate?: string;
  notes?: string;
  history?: Array<{ date: string; value: number }>;
  createdAt: string;
}

const FREQ = {
  daily:     "Diário",
  weekly:    "Semanal",
  monthly:   "Mensal",
  quarterly: "Trimestral",
};

const QUICK_TEMPLATES = [
  { name: "Faturamento",        category: "Financeiro",    unit: "R$" },
  { name: "Margem",             category: "Financeiro",    unit: "%" },
  { name: "Leads gerados",      category: "Comercial",     unit: "" },
  { name: "Taxa de conversão",  category: "Comercial",     unit: "%" },
  { name: "Ticket médio",       category: "Comercial",     unit: "R$" },
  { name: "Produtividade",      category: "Operacional",   unit: "%" },
  { name: "Tempo de resposta",  category: "Atendimento",   unit: "h" },
  { name: "Contratos ativos",   category: "Operacional",   unit: "" },
];

function fmtNumber(v?: number, unit?: string) {
  if (v == null) return "—";
  const n = Number(v);
  const formatted = n >= 1000 ? n.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : n.toString();
  if (unit === "R$") return `R$ ${formatted}`;
  if (unit === "%") return `${formatted}%`;
  return unit ? `${formatted} ${unit}` : formatted;
}

function trendIcon(t?: string) {
  if (t === "up")   return <TrendingUp className="h-4 w-4 text-emerald-400" />;
  if (t === "down") return <TrendingDown className="h-4 w-4 text-rose-400" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export function IndicadoresTab({ recordId }: { recordId: string }) {
  const [items, setItems] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Metric | null>(null);
  const [form, setForm] = useState<Partial<Metric>>({ frequency: "monthly" });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try { setItems(await api<Metric[]>(`/prontuario/${recordId}/metrics`)); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [recordId]);

  function openNew(template?: Partial<Metric>) {
    setEditing(null);
    setForm({ frequency: "monthly", ...template });
    setOpen(true);
  }
  function openEdit(m: Metric) {
    setEditing(m);
    setForm(m);
    setOpen(true);
  }

  async function save() {
    if (!form.name?.trim()) { toast.error("Informe o nome"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        currentValue: form.currentValue != null && form.currentValue !== "" as any ? Number(form.currentValue) : undefined,
        targetValue: form.targetValue != null && form.targetValue !== "" as any ? Number(form.targetValue) : undefined,
      };
      if (editing) {
        await api(`/prontuario/${recordId}/metrics/${editing.id}`, { method: "PATCH", body: payload });
        toast.success("Atualizado");
      } else {
        await api(`/prontuario/${recordId}/metrics`, { method: "POST", body: payload });
        toast.success("Criado");
      }
      setOpen(false);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm("Remover este indicador?")) return;
    try {
      await api(`/prontuario/${recordId}/metrics/${id}`, { method: "DELETE" });
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto my-8 text-primary" />;

  // Agrupar por categoria
  const groups = items.reduce<Record<string, Metric[]>>((acc, m) => {
    const k = m.category || "Sem categoria";
    (acc[k] = acc[k] || []).push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <p className="text-sm text-muted-foreground">
          Métricas customizáveis. Atualize o valor atual e o sistema guarda o histórico para mostrar tendência.
        </p>
        <Button size="sm" onClick={() => openNew()} className="bg-gradient-primary hover:opacity-90">
          <Plus className="h-4 w-4 mr-1" />Novo indicador
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="p-10 text-center text-sm">
          <BarChart3 className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground mb-4">Nenhum indicador ainda. Comece por um destes:</p>
          <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
            {QUICK_TEMPLATES.map((t) => (
              <Button key={t.name} size="sm" variant="outline" onClick={() => openNew(t)}>
                {t.name}
              </Button>
            ))}
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          {Object.entries(groups).map(([cat, list]) => (
            <div key={cat}>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{cat}</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {list.map((m) => {
                  const pct = m.targetValue && Number(m.targetValue) !== 0
                    ? Math.round((Number(m.currentValue || 0) / Number(m.targetValue)) * 100)
                    : null;
                  const chartData = (m.history || []).map((h, i) => ({ i, v: h.value }));
                  return (
                    <Card key={m.id} className="p-4 hover:border-primary/30 transition">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{m.name}</div>
                          <Badge variant="outline" className="text-[10px] mt-1">{FREQ[m.frequency]}</Badge>
                        </div>
                        <div className="flex gap-0.5">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEdit(m)}>
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => remove(m.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-end justify-between mt-3">
                        <div>
                          <div className="text-2xl font-display font-bold">
                            {fmtNumber(m.currentValue, m.unit)}
                          </div>
                          {m.targetValue != null && (
                            <div className="text-xs text-muted-foreground">
                              Meta: {fmtNumber(m.targetValue, m.unit)} {pct != null && `(${pct}%)`}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {trendIcon(m.trend)}
                          {m.previousValue != null && (
                            <span className="text-xs text-muted-foreground">
                              {fmtNumber(m.previousValue, m.unit)}
                            </span>
                          )}
                        </div>
                      </div>

                      {chartData.length >= 2 && (
                        <div className="h-12 mt-3 -mx-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                              <Tooltip
                                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                                labelFormatter={() => ""}
                                formatter={(v: any) => [fmtNumber(Number(v), m.unit), ""]}
                              />
                              <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {m.targetValue != null && pct != null && (
                        <div className="mt-2 h-1 w-full rounded-full bg-muted/40 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-400" : "bg-gradient-primary"}`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      )}

                      {m.notes && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{m.notes}</p>}
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} indicador</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Nome *</Label>
                <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Faturamento mensal" />
              </div>
              <div>
                <Label>Categoria</Label>
                <Input value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Financeiro" />
              </div>
              <div>
                <Label>Unidade</Label>
                <Input value={form.unit || ""} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="R$, %, h" />
              </div>
              <div>
                <Label>Valor atual</Label>
                <Input type="number" step="any" value={form.currentValue ?? ""} onChange={(e) => setForm({ ...form, currentValue: e.target.value as any })} />
              </div>
              <div>
                <Label>Meta</Label>
                <Input type="number" step="any" value={form.targetValue ?? ""} onChange={(e) => setForm({ ...form, targetValue: e.target.value as any })} />
              </div>
              <div className="col-span-2">
                <Label>Frequência</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FREQ).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Observação</Label>
                <Textarea rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-gradient-primary hover:opacity-90">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
