import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, GripVertical, Trash2, Calendar as CalIcon } from "lucide-react";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "doing" | "done";
  dueDate?: string;
  leadId: string;
}

const COLUMNS = [
  { key: "todo" as const, label: "A Fazer", color: "border-t-blue-500" },
  { key: "doing" as const, label: "Fazendo", color: "border-t-amber-500" },
  { key: "done" as const, label: "Concluído", color: "border-t-emerald-500" },
];

export default function TasksKanban() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", leadId: "", dueDate: "" });
  const [leads, setLeads] = useState<any[]>([]);

  const load = () => api<Task[]>("/tasks").then(setTasks).finally(() => setLoading(false));

  useEffect(() => {
    load();
    api("/leads").then(setLeads).catch(() => {});
  }, []);

  async function moveTask(id: string, status: Task["status"]) {
    await api(`/tasks/${id}`, { method: "PATCH", body: { status } });
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  }

  async function createTask() {
    if (!form.title || !form.leadId) return toast.error("Preencha título e selecione o lead");
    await api("/tasks", { method: "POST", body: { ...form, dueDate: form.dueDate || undefined } });
    setOpen(false);
    setForm({ title: "", description: "", leadId: "", dueDate: "" });
    toast.success("Tarefa criada");
    load();
  }

  async function deleteTask(id: string) {
    if (!confirm("Excluir tarefa?")) return;
    await api(`/tasks/${id}`, { method: "DELETE" });
    toast.success("Excluída");
    load();
  }

  if (loading) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Tarefas</h1>
          <p className="text-muted-foreground mt-1">Kanban de tarefas dos seus mentorados.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Nova Tarefa</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const items = tasks.filter((t) => t.status === col.key);
          return (
            <div
              key={col.key}
              className={`bg-muted/30 rounded-xl border-t-4 ${col.color} p-3 min-h-[300px]`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const id = e.dataTransfer.getData("taskId");
                if (id) moveTask(id, col.key);
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">{col.label}</h3>
                <span className="text-xs bg-background rounded-full px-2 py-0.5">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((t) => {
                  const lead = leads.find((l: any) => l.id === t.leadId);
                  return (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("taskId", t.id)}
                      className="bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2 min-w-0">
                          <GripVertical className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{t.title}</p>
                            {lead && <p className="text-xs text-muted-foreground truncate">{lead.name}</p>}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                          onClick={() => deleteTask(t.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {t.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2 ml-6">{t.description}</p>}
                      {t.dueDate && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2 ml-6">
                          <CalIcon className="h-3 w-3" />
                          {new Date(t.dueDate).toLocaleDateString("pt-BR")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Lead / Mentorado</Label>
              <Select value={form.leadId} onValueChange={(v) => setForm({ ...form, leadId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {leads.map((l: any) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="space-y-2"><Label>Prazo</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={createTask}>Criar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
