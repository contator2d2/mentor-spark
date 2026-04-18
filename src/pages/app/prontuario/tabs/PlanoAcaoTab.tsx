// Aba: Plano de Ação — reaproveita o módulo de tarefas existente filtrando pelo lead
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
import { Plus, Loader2, CheckSquare, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: "todo" | "doing" | "done";
  createdAt: string;
}

const STATUS = {
  todo:  { label: "A fazer",     cls: "bg-slate-500/10 text-slate-300" },
  doing: { label: "Em andamento", cls: "bg-blue-500/10 text-blue-300" },
  done:  { label: "Concluída",   cls: "bg-emerald-500/10 text-emerald-300" },
};

export function PlanoAcaoTab({ leadId }: { leadId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Task>>({ status: "todo" });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const all = await api<Task[]>(`/tasks?leadId=${leadId}`);
      setTasks(all);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [leadId]);

  async function save() {
    if (!form.title?.trim()) { toast.error("Informe o título"); return; }
    setSaving(true);
    try {
      await api("/tasks", { method: "POST", body: { ...form, leadId } });
      toast.success("Tarefa criada");
      setOpen(false);
      setForm({ status: "todo" });
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function updateStatus(id: string, status: Task["status"]) {
    try {
      await api(`/tasks/${id}`, { method: "PATCH", body: { status } });
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function remove(id: string) {
    if (!confirm("Remover tarefa?")) return;
    try {
      await api(`/tasks/${id}`, { method: "DELETE" });
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto my-8 text-primary" />;

  const grouped = {
    todo: tasks.filter((t) => t.status === "todo"),
    doing: tasks.filter((t) => t.status === "doing"),
    done: tasks.filter((t) => t.status === "done"),
  };

  const total = tasks.length;
  const done = grouped.done.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="text-sm">
          <span className="text-muted-foreground">Taxa de execução: </span>
          <span className="font-bold text-emerald-400">{pct}%</span>
          <span className="text-muted-foreground"> ({done}/{total})</span>
        </div>
        <Button size="sm" onClick={() => setOpen(true)} className="bg-gradient-primary hover:opacity-90">
          <Plus className="h-4 w-4 mr-1" />Nova tarefa
        </Button>
      </div>

      {tasks.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Nenhuma tarefa. Crie a primeira ação concreta.
        </Card>
      ) : (
        <div className="grid md:grid-cols-3 gap-3">
          {(["todo", "doing", "done"] as const).map((col) => (
            <div key={col} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className={`text-xs uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS[col].cls}`}>
                  {STATUS[col].label}
                </span>
                <span className="text-xs text-muted-foreground">{grouped[col].length}</span>
              </div>
              {grouped[col].map((t) => (
                <Card key={t.id} className="p-3 hover:border-primary/30 transition">
                  <div className="text-sm font-medium">{t.title}</div>
                  {t.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                  {t.dueDate && (
                    <Badge variant="outline" className="text-[10px] mt-2">
                      {new Date(t.dueDate).toLocaleDateString("pt-BR")}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1 mt-2">
                    <Select value={t.status} onValueChange={(v) => updateStatus(t.id, v as any)}>
                      <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(t.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova tarefa</DialogTitle></DialogHeader>
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
                <Label>Prazo</Label>
                <Input type="date" value={form.dueDate || ""} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
              <div>
                <Label>Status inicial</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-gradient-primary hover:opacity-90">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
