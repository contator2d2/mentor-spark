// Aba: Tarefas — cria/lista tarefas do lead com responsável (mentor ou mentorado)
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, User, UserCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { ProntuarioPayload, relativeDate } from "../types";

type Assignee = "mentor" | "mentee";

export function TarefasTab({ data, onChanged }: { data: ProntuarioPayload; onChanged?: () => void }) {
  const { tasks, lead } = data;
  const menteeUserId: string | undefined = lead?.userId;

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    assignee: "mentor" as Assignee,
    remindWhatsapp: true,
  });

  function reset() {
    setForm({ title: "", description: "", dueDate: "", priority: "medium", assignee: "mentor", remindWhatsapp: true });
  }

  async function create() {
    if (!form.title.trim()) { toast.error("Título obrigatório"); return; }
    if (form.assignee === "mentee" && !menteeUserId) {
      toast.error("Este lead ainda não tem conta criada para receber tarefas. Libere o acesso primeiro.");
      return;
    }
    setSaving(true);
    try {
      await api("/tasks", {
        method: "POST",
        body: {
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          leadId: lead.id,
          assignedUserId: form.assignee === "mentee" ? menteeUserId : undefined,
          dueDate: form.dueDate || undefined,
          priority: form.priority,
          remindWhatsapp: form.remindWhatsapp,
          notifyOnAssign: form.assignee === "mentee",
        },
      });
      toast.success("Tarefa criada");
      setOpen(false);
      reset();
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function complete(id: string) {
    try {
      await api(`/tasks/${id}/complete`, { method: "POST" });
      toast.success("Tarefa concluída");
      onChanged?.();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {tasks.length} tarefa{tasks.length === 1 ? "" : "s"}
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-primary"><Plus className="h-4 w-4 mr-1" />Nova tarefa</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova tarefa</DialogTitle>
              <DialogDescription>Defina o responsável: você ({"mentor"}) ou o mentorado.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Título *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Descrição</Label>
                <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Prazo</Label>
                  <Input type="datetime-local" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Prioridade</Label>
                  <Select value={form.priority} onValueChange={(v: any) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Responsável</Label>
                <Select value={form.assignee} onValueChange={(v: Assignee) => setForm({ ...form, assignee: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mentor">Eu (mentor)</SelectItem>
                    <SelectItem value="mentee" disabled={!menteeUserId}>
                      Mentorado{!menteeUserId ? " (sem acesso ao app)" : ""}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {form.assignee === "mentee" && !menteeUserId && (
                  <p className="text-xs text-amber-400 mt-1">
                    O lead precisa ter acesso ao painel para receber tarefas.
                  </p>
                )}
              </div>
              {form.assignee === "mentee" && (
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/40">
                  <div>
                    <div className="text-sm font-medium">Notificar por WhatsApp</div>
                    <div className="text-xs text-muted-foreground">Aviso na criação + lembretes antes do prazo.</div>
                  </div>
                  <Switch checked={form.remindWhatsapp} onCheckedChange={(v) => setForm({ ...form, remindWhatsapp: v })} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={create} disabled={saving} className="bg-gradient-primary">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Criar tarefa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {tasks.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground text-sm">Nenhuma tarefa criada.</Card>
      ) : (
        tasks.map((t) => {
          const assignedToMentee = t.assignedUserId && t.assignedUserId === menteeUserId;
          const isDone = t.status === "done";
          return (
            <Card key={t.id} className="p-4 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium truncate">{t.title}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1 flex-wrap">
                  {assignedToMentee ? (
                    <span className="inline-flex items-center gap-1 text-violet-300">
                      <UserCheck className="h-3 w-3" />Mentorado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3 w-3" />Mentor
                    </span>
                  )}
                  {t.dueDate && <span>· Prazo: {relativeDate(t.dueDate)}</span>}
                  {t.priority && <Badge variant="outline" className="text-[10px] capitalize">{t.priority}</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="capitalize">{t.status}</Badge>
                {!isDone && (
                  <Button size="sm" variant="outline" onClick={() => complete(t.id)}>
                    <CheckCircle2 className="h-3 w-3 mr-1" />Concluir
                  </Button>
                )}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
