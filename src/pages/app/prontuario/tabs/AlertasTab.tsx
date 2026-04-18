// Aba: Alertas — riscos automáticos + alertas manuais
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Bell, AlertTriangle, AlertOctagon, Info, Plus, RefreshCcw,
  CheckCircle2, EyeOff, Loader2, Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { relativeDate } from "../types";

interface Alert {
  id: string;
  type: string;
  severity: "info" | "warn" | "critical";
  status: "open" | "acknowledged" | "resolved" | "dismissed";
  title: string;
  description?: string;
  signature?: string;
  meta?: any;
  createdAt: string;
}

const SEVERITY_META: Record<string, { cls: string; Icon: any; label: string }> = {
  info:     { cls: "bg-sky-500/15 text-sky-300 border-sky-500/30",       Icon: Info,          label: "Info" },
  warn:     { cls: "bg-amber-500/15 text-amber-300 border-amber-500/30", Icon: AlertTriangle, label: "Atenção" },
  critical: { cls: "bg-rose-500/15 text-rose-300 border-rose-500/30",    Icon: AlertOctagon,  label: "Crítico" },
};

const STATUS_META: Record<string, { cls: string; label: string }> = {
  open:         { cls: "bg-rose-500/15 text-rose-300 border-rose-500/30",       label: "Aberto" },
  acknowledged: { cls: "bg-amber-500/15 text-amber-300 border-amber-500/30",    label: "Reconhecido" },
  resolved:     { cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", label: "Resolvido" },
  dismissed:    { cls: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",       label: "Descartado" },
};

interface Props { recordId: string }

export function AlertasTab({ recordId }: Props) {
  const [items, setItems] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"open" | "all">("open");

  // form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<Alert["severity"]>("warn");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const list = await api<Alert[]>(`/prontuario/${recordId}/alerts`);
      setItems(list);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [recordId]);

  async function evaluate() {
    setEvaluating(true);
    try {
      const list = await api<Alert[]>(`/prontuario/${recordId}/alerts/evaluate`, { method: "POST" });
      setItems(list);
      toast.success("Alertas avaliados");
    } catch (e: any) { toast.error(e.message); }
    finally { setEvaluating(false); }
  }

  async function changeStatus(a: Alert, status: Alert["status"]) {
    try {
      await api(`/prontuario/${recordId}/alerts/${a.id}`, { method: "PATCH", body: { status } });
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function remove(id: string) {
    if (!confirm("Excluir este alerta?")) return;
    try {
      await api(`/prontuario/${recordId}/alerts/${id}`, { method: "DELETE" });
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function createCustom() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await api(`/prontuario/${recordId}/alerts`, {
        method: "POST",
        body: { title, description, severity, type: "custom" },
      });
      toast.success("Alerta criado");
      setTitle(""); setDescription(""); setSeverity("warn"); setOpen(false);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  const visible = items.filter(a => filter === "all" ? true : a.status === "open" || a.status === "acknowledged");
  const counts = {
    open: items.filter(a => a.status === "open").length,
    critical: items.filter(a => a.severity === "critical" && a.status !== "resolved" && a.status !== "dismissed").length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground uppercase">Abertos</div>
          <div className="font-display text-2xl font-bold">{counts.open}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground uppercase">Críticos</div>
          <div className="font-display text-2xl font-bold text-rose-400">{counts.critical}</div>
        </Card>
        <Card className="p-3 col-span-2 md:col-span-2 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={evaluate} disabled={evaluating}>
            {evaluating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
            Reavaliar
          </Button>
          <Button size="sm" onClick={() => setOpen(true)} className="bg-gradient-primary hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" /> Manual
          </Button>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4" />
        <h3 className="font-display text-lg font-semibold">Alertas</h3>
        <div className="ml-auto">
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-[160px] h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Apenas ativos</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : visible.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-400/60" />
          Nenhum alerta ativo. Tudo sob controle.
        </Card>
      ) : (
        <div className="grid gap-3">
          {visible.map(a => {
            const sev = SEVERITY_META[a.severity];
            const st = STATUS_META[a.status];
            const SevIcon = sev.Icon;
            return (
              <Card key={a.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center border ${sev.cls}`}>
                    <SevIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-medium">{a.title}</h4>
                      <Badge variant="outline" className={sev.cls}>{sev.label}</Badge>
                      <Badge variant="outline" className={st.cls}>{st.label}</Badge>
                      {a.signature && <Badge variant="outline" className="text-xs">auto</Badge>}
                      <span className="text-xs text-muted-foreground ml-auto">{relativeDate(a.createdAt)}</span>
                    </div>
                    {a.description && <p className="text-sm text-muted-foreground">{a.description}</p>}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {a.status === "open" && (
                        <Button size="sm" variant="outline" onClick={() => changeStatus(a, "acknowledged")}>
                          Reconhecer
                        </Button>
                      )}
                      {a.status !== "resolved" && (
                        <Button size="sm" variant="outline" onClick={() => changeStatus(a, "resolved")}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Resolver
                        </Button>
                      )}
                      {a.status !== "dismissed" && (
                        <Button size="sm" variant="ghost" onClick={() => changeStatus(a, "dismissed")}>
                          <EyeOff className="h-3 w-3 mr-1" /> Descartar
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => remove(a.id)}>
                        <Trash2 className="h-3 w-3 text-rose-400" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo alerta manual</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea placeholder="Descrição (opcional)" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
            <Select value={severity} onValueChange={(v) => setSeverity(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Atenção</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button onClick={createCustom} disabled={saving || !title.trim()} className="bg-gradient-primary hover:opacity-90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
