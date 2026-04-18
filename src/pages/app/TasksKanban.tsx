import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Plus,
  GripVertical,
  Trash2,
  Calendar as CalIcon,
  Send,
  User as UserIcon,
  AlarmClock,
} from "lucide-react";
import { toast } from "sonner";

type Priority = "low" | "medium" | "high" | "urgent";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "doing" | "done";
  dueDate?: string;
  leadId?: string;
  assignedUserId?: string;
  priority: Priority;
  remindWhatsapp: boolean;
  notifyOnAssign: boolean;
  remindersSent?: number;
  lastReminderAt?: string;
  nextReminderAt?: string;
}

interface AssigneeOption {
  id: string;          // userId
  name: string;
  phone?: string | null;
  leadId?: string;     // referência para vincular o lead também
  source: "mentorado" | "lead";
}

const COLUMNS = [
  { key: "todo" as const, label: "A Fazer", color: "border-t-blue-500" },
  { key: "doing" as const, label: "Fazendo", color: "border-t-amber-500" },
  { key: "done" as const, label: "Concluído", color: "border-t-emerald-500" },
];

const PRIORITY_META: Record<Priority, { label: string; emoji: string; className: string }> = {
  low:    { label: "Baixa",    emoji: "🟢", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  medium: { label: "Média",    emoji: "🟡", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  high:   { label: "Alta",     emoji: "🟠", className: "bg-orange-500/10 text-orange-700 dark:text-orange-300" },
  urgent: { label: "Urgente",  emoji: "🔴", className: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
};

export default function TasksKanban() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [mentorados, setMentorados] = useState<any[]>([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    assigneeKey: "" as string, // formato "user:<id>" ou "lead:<id>"
    dueDate: "",
    priority: "medium" as Priority,
    remindWhatsapp: true,
    notifyOnAssign: true,
  });

  const load = () => api<Task[]>("/tasks").then(setTasks).finally(() => setLoading(false));

  useEffect(() => {
    load();
    api<any[]>("/leads").then(setLeads).catch(() => {});
    api<any[]>("/mentor/mentorados").then(setMentorados).catch(() => setMentorados([]));
  }, []);

  /** Lista unificada de possíveis responsáveis. */
  const assignees: AssigneeOption[] = useMemo(() => {
    const list: AssigneeOption[] = [];
    mentorados.forEach((m: any) =>
      list.push({ id: m.id, name: m.name, phone: m.phone, source: "mentorado" })
    );
    leads.forEach((l: any) => {
      if (l.userId) list.push({ id: l.userId, name: l.name, phone: l.phone, leadId: l.id, source: "lead" });
    });
    // dedup por userId
    const seen = new Set<string>();
    return list.filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
  }, [leads, mentorados]);

  async function moveTask(id: string, status: Task["status"]) {
    await api(`/tasks/${id}`, { method: "PATCH", body: { status } });
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  }

  async function createTask() {
    if (!form.title) return toast.error("Informe o título");
    if (!form.assigneeKey) return toast.error("Selecione o responsável");
    setSaving(true);
    try {
      const [kind, refId] = form.assigneeKey.split(":");
      let assignedUserId: string | undefined;
      let leadId: string | undefined;
      if (kind === "user") {
        assignedUserId = refId;
        const matchLead = leads.find((l: any) => l.userId === refId);
        leadId = matchLead?.id;
      } else if (kind === "lead") {
        leadId = refId;
        const lead = leads.find((l: any) => l.id === refId);
        assignedUserId = lead?.userId;
      }
      await api("/tasks", {
        method: "POST",
        body: {
          title: form.title,
          description: form.description || undefined,
          dueDate: form.dueDate || undefined,
          priority: form.priority,
          remindWhatsapp: form.remindWhatsapp,
          notifyOnAssign: form.notifyOnAssign,
          assignedUserId,
          leadId,
        },
      });
      setOpen(false);
      setForm({ title: "", description: "", assigneeKey: "", dueDate: "", priority: "medium", remindWhatsapp: true, notifyOnAssign: true });
      toast.success("Tarefa criada — responsável notificado no WhatsApp");
      load();
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar tarefa");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTask(id: string) {
    if (!confirm("Excluir tarefa?")) return;
    await api(`/tasks/${id}`, { method: "DELETE" });
    toast.success("Excluída");
    load();
  }

  async function remindNow(id: string) {
    try {
      const r: any = await api(`/tasks/${id}/remind`, { method: "POST" });
      if (r?.ok) toast.success("Lembrete enviado no WhatsApp");
      else toast.error(r?.error || "Falha ao enviar lembrete");
      load();
    } catch (e: any) {
      toast.error(e.message || "Falha ao enviar lembrete");
    }
  }

  function assigneeName(t: Task): string | null {
    if (t.assignedUserId) {
      const u = assignees.find((a) => a.id === t.assignedUserId);
      if (u) return u.name;
    }
    if (t.leadId) {
      const l = leads.find((x: any) => x.id === t.leadId);
      if (l) return l.name;
    }
    return null;
  }

  if (loading) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Tarefas</h1>
          <p className="text-muted-foreground mt-1">
            Atribua tarefas aos seus mentorados — eles recebem lembretes automáticos no WhatsApp.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Nova Tarefa
        </Button>
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
                  const respName = assigneeName(t);
                  const overdue = t.dueDate && new Date(t.dueDate).getTime() < Date.now() && t.status !== "done";
                  const meta = PRIORITY_META[t.priority] || PRIORITY_META.medium;
                  return (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("taskId", t.id)}
                      className="bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <GripVertical className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm">{t.title}</p>
                            {respName && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <UserIcon className="h-3 w-3" />
                                {respName}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {t.remindWhatsapp && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-primary"
                              title="Enviar lembrete agora"
                              onClick={() => remindNow(t.id)}
                            >
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => deleteTask(t.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {t.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 ml-6">{t.description}</p>
                      )}

                      <div className="flex items-center flex-wrap gap-1.5 mt-2 ml-6">
                        <Badge variant="secondary" className={`text-[10px] ${meta.className}`}>
                          {meta.emoji} {meta.label}
                        </Badge>
                        {t.dueDate && (
                          <Badge
                            variant="secondary"
                            className={`text-[10px] gap-1 ${overdue ? "bg-rose-500/10 text-rose-700 dark:text-rose-300" : ""}`}
                          >
                            <CalIcon className="h-3 w-3" />
                            {new Date(t.dueDate).toLocaleDateString("pt-BR")}
                          </Badge>
                        )}
                        {t.remindWhatsapp && (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <AlarmClock className="h-3 w-3" />
                            {t.remindersSent ? `${t.remindersSent} lembr.` : "Lembrete on"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
                {items.length === 0 && (
                  <p className="text-xs text-muted-foreground/60 text-center py-6">Sem tarefas aqui.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Enviar resumo da reunião" />
            </div>

            <div className="space-y-2">
              <Label>Responsável *</Label>
              <Select value={form.assigneeKey} onValueChange={(v) => setForm({ ...form, assigneeKey: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione mentorado ou lead" /></SelectTrigger>
                <SelectContent>
                  {mentorados.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-[10px] uppercase text-muted-foreground">Mentorados</div>
                      {mentorados.map((m: any) => (
                        <SelectItem key={`u:${m.id}`} value={`user:${m.id}`}>
                          {m.name} {m.phone ? `· ${m.phone}` : "· (sem WhatsApp)"}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {leads.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-[10px] uppercase text-muted-foreground">Leads</div>
                      {leads.map((l: any) => (
                        <SelectItem key={`l:${l.id}`} value={l.userId ? `user:${l.userId}` : `lead:${l.id}`}>
                          {l.name} {l.phone ? `· ${l.phone}` : "· (sem WhatsApp)"}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                O responsável receberá a notificação imediatamente e lembretes 24h e 1h antes do prazo.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Priority })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PRIORITY_META) as Priority[]).map((p) => (
                      <SelectItem key={p} value={p}>{PRIORITY_META[p].emoji} {PRIORITY_META[p].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prazo</Label>
                <Input type="datetime-local" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="rounded-lg border border-border p-3 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Notificar agora no WhatsApp</p>
                  <p className="text-xs text-muted-foreground">Mensagem inicial assim que criar a tarefa.</p>
                </div>
                <Switch checked={form.notifyOnAssign} onCheckedChange={(v) => setForm({ ...form, notifyOnAssign: v })} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Lembretes automáticos</p>
                  <p className="text-xs text-muted-foreground">24h antes, 1h antes e no vencimento.</p>
                </div>
                <Switch checked={form.remindWhatsapp} onCheckedChange={(v) => setForm({ ...form, remindWhatsapp: v })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={createTask} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Criar tarefa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
