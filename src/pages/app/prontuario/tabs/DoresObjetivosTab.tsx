// Aba: Dores, Gargalos e Oportunidades
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import { Plus, Loader2, AlertTriangle, Target, Sparkles, Trash2, Edit3 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Pain {
  id: string;
  type: "pain" | "bottleneck" | "opportunity";
  title: string;
  description?: string;
  category?: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "working" | "resolved" | "persistent";
  source?: string;
  createdAt: string;
}

interface Objective {
  id: string;
  title: string;
  description?: string;
  category?: string;
  priority: "low" | "medium" | "high";
  status: "planned" | "in_progress" | "done" | "paused" | "cancelled";
  dueDate?: string;
  reviewDate?: string;
  createdAt: string;
}

const TYPE_META = {
  pain:        { label: "Dor",          icon: AlertTriangle, cls: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  bottleneck:  { label: "Gargalo",      icon: AlertTriangle, cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  opportunity: { label: "Oportunidade", icon: Sparkles,      cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
};

const SEVERITY_META = {
  low:      { label: "Baixa",    cls: "bg-slate-500/15 text-slate-300" },
  medium:   { label: "Média",    cls: "bg-amber-500/15 text-amber-300" },
  high:     { label: "Alta",     cls: "bg-orange-500/15 text-orange-300" },
  critical: { label: "Crítica",  cls: "bg-rose-500/15 text-rose-300" },
};

const PAIN_STATUS = {
  open:       { label: "Aberta",      cls: "bg-rose-500/10 text-rose-300" },
  working:    { label: "Em ação",     cls: "bg-blue-500/10 text-blue-300" },
  resolved:   { label: "Resolvida",   cls: "bg-emerald-500/10 text-emerald-300" },
  persistent: { label: "Persistente", cls: "bg-amber-500/10 text-amber-300" },
};

const OBJ_STATUS = {
  planned:     { label: "Planejado",    cls: "bg-slate-500/10 text-slate-300" },
  in_progress: { label: "Em andamento", cls: "bg-blue-500/10 text-blue-300" },
  done:        { label: "Concluído",    cls: "bg-emerald-500/10 text-emerald-300" },
  paused:      { label: "Pausado",      cls: "bg-amber-500/10 text-amber-300" },
  cancelled:   { label: "Cancelado",    cls: "bg-zinc-500/10 text-zinc-400" },
};

const PRIORITY_META = {
  low:    { label: "Baixa",  cls: "bg-slate-500/15 text-slate-300" },
  medium: { label: "Média",  cls: "bg-amber-500/15 text-amber-300" },
  high:   { label: "Alta",   cls: "bg-rose-500/15 text-rose-300" },
};

export function DoresObjetivosTab({ recordId }: { recordId: string }) {
  return (
    <Tabs defaultValue="pains" className="space-y-3">
      <TabsList>
        <TabsTrigger value="pains">
          <AlertTriangle className="h-3 w-3 mr-1" />Dores, gargalos e oportunidades
        </TabsTrigger>
        <TabsTrigger value="objectives">
          <Target className="h-3 w-3 mr-1" />Objetivos & Metas
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pains"><PainsSection recordId={recordId} /></TabsContent>
      <TabsContent value="objectives"><ObjectivesSection recordId={recordId} /></TabsContent>
    </Tabs>
  );
}

// ============== Dores ==============
function PainsSection({ recordId }: { recordId: string }) {
  const [items, setItems] = useState<Pain[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Pain | null>(null);
  const [form, setForm] = useState<Partial<Pain>>({ type: "pain", severity: "medium", status: "open" });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try { setItems(await api<Pain[]>(`/prontuario/${recordId}/pains`)); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [recordId]);

  function openNew() {
    setEditing(null);
    setForm({ type: "pain", severity: "medium", status: "open" });
    setOpen(true);
  }
  function openEdit(p: Pain) {
    setEditing(p);
    setForm(p);
    setOpen(true);
  }

  async function save() {
    if (!form.title?.trim()) { toast.error("Informe o título"); return; }
    setSaving(true);
    try {
      if (editing) {
        await api(`/prontuario/${recordId}/pains/${editing.id}`, { method: "PATCH", body: form });
        toast.success("Atualizado");
      } else {
        await api(`/prontuario/${recordId}/pains`, { method: "POST", body: form });
        toast.success("Criado");
      }
      setOpen(false);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm("Remover este item?")) return;
    try {
      await api(`/prontuario/${recordId}/pains/${id}`, { method: "DELETE" });
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto my-8 text-primary" />;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Registre dores declaradas, gargalos detectados e oportunidades percebidas.
        </p>
        <Button size="sm" onClick={openNew} className="bg-gradient-primary hover:opacity-90">
          <Plus className="h-4 w-4 mr-1" />Adicionar
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Nenhum item ainda. Comece registrando o que você ouviu na última conversa.
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {items.map((p) => {
            const meta = TYPE_META[p.type];
            const Sev = SEVERITY_META[p.severity];
            const St = PAIN_STATUS[p.status];
            return (
              <Card key={p.id} className="p-4 space-y-2 hover:border-primary/30 transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={meta.cls}>
                      <meta.icon className="h-3 w-3 mr-1" />{meta.label}
                    </Badge>
                    {p.category && <Badge variant="secondary" className="text-xs">{p.category}</Badge>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}>
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(p.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div>
                  <div className="font-medium text-sm">{p.title}</div>
                  {p.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{p.description}</p>}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${Sev.cls}`}>{Sev.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${St.cls}`}>{St.label}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pain">Dor</SelectItem>
                  <SelectItem value="bottleneck">Gargalo</SelectItem>
                  <SelectItem value="opportunity">Oportunidade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Título *</Label>
              <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea rows={3} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Input placeholder="ex: comercial, financeiro" value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <div>
                <Label>Severidade</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SEVERITY_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAIN_STATUS).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
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

// ============== Objetivos ==============
function ObjectivesSection({ recordId }: { recordId: string }) {
  const [items, setItems] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Objective | null>(null);
  const [form, setForm] = useState<Partial<Objective>>({ priority: "medium", status: "planned" });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try { setItems(await api<Objective[]>(`/prontuario/${recordId}/objectives`)); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [recordId]);

  function openNew() {
    setEditing(null);
    setForm({ priority: "medium", status: "planned" });
    setOpen(true);
  }
  function openEdit(o: Objective) {
    setEditing(o);
    setForm(o);
    setOpen(true);
  }

  async function save() {
    if (!form.title?.trim()) { toast.error("Informe o título"); return; }
    setSaving(true);
    try {
      if (editing) {
        await api(`/prontuario/${recordId}/objectives/${editing.id}`, { method: "PATCH", body: form });
        toast.success("Atualizado");
      } else {
        await api(`/prontuario/${recordId}/objectives`, { method: "POST", body: form });
        toast.success("Criado");
      }
      setOpen(false);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm("Remover este objetivo?")) return;
    try {
      await api(`/prontuario/${recordId}/objectives/${id}`, { method: "DELETE" });
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto my-8 text-primary" />;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Defina o que esse mentorado precisa alcançar — com prazo, prioridade e responsável.
        </p>
        <Button size="sm" onClick={openNew} className="bg-gradient-primary hover:opacity-90">
          <Plus className="h-4 w-4 mr-1" />Novo objetivo
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          <Target className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Nenhum objetivo definido.
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((o) => {
            const Pri = PRIORITY_META[o.priority];
            const St = OBJ_STATUS[o.status];
            return (
              <Card key={o.id} className="p-4 hover:border-primary/30 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{o.title}</div>
                    {o.description && <p className="text-xs text-muted-foreground mt-1">{o.description}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${Pri.cls}`}>Prioridade: {Pri.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${St.cls}`}>{St.label}</span>
                      {o.category && <Badge variant="secondary" className="text-xs">{o.category}</Badge>}
                      {o.dueDate && <Badge variant="outline" className="text-xs">Prazo: {new Date(o.dueDate).toLocaleDateString("pt-BR")}</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(o)}>
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(o.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} objetivo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título *</Label>
              <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea rows={3} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Input value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <div>
                <Label>Prazo</Label>
                <Input type="date" value={form.dueDate || ""} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(OBJ_STATUS).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
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
