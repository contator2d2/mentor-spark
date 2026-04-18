import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Zap, Trash2, Power, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface Automation { id: string; name: string; description?: string; enabled: boolean; nodes: any[]; runCount: number; lastRunAt?: string; }

const TRIGGERS = [
  { value: "lead_created", label: "Quando um novo lead chegar" },
  { value: "lead_stage_changed", label: "Quando lead mudar de etapa" },
  { value: "test_submitted", label: "Quando lead responder um teste" },
  { value: "lead_no_activity_days", label: "Quando lead ficar inativo por X dias" },
];

const ACTIONS = [
  { value: "send_whatsapp", label: "Enviar WhatsApp" },
  { value: "send_email", label: "Enviar email" },
  { value: "send_in_app", label: "Notificar no app" },
  { value: "create_task", label: "Criar tarefa" },
  { value: "change_lead_stage", label: "Mover lead para etapa" },
  { value: "notify_mentor", label: "Notificar mentor" },
];

export default function AutomationsPage() {
  const [items, setItems] = useState<Automation[] | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Automation | null>(null);
  const [form, setForm] = useState<any>({
    name: "", description: "", enabled: true,
    triggerType: "lead_created", triggerConfig: {},
    actionType: "send_whatsapp", actionConfig: { body: "" },
  });

  async function load() { try { setItems(await api<Automation[]>("/automations")); } catch (e: any) { toast.error(e.message); } }
  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm({ name: "", description: "", enabled: true, triggerType: "lead_created", triggerConfig: {}, actionType: "send_whatsapp", actionConfig: { body: "" } });
    setOpen(true);
  }

  function openEdit(a: Automation) {
    const trigger = a.nodes.find((n) => n.kind === "trigger");
    const action = a.nodes.find((n) => n.kind === "action");
    setEditing(a);
    setForm({
      name: a.name, description: a.description, enabled: a.enabled,
      triggerType: trigger?.type || "lead_created", triggerConfig: trigger?.config || {},
      actionType: action?.type || "send_whatsapp", actionConfig: action?.config || { body: "" },
    });
    setOpen(true);
  }

  async function save() {
    if (!form.name) return toast.error("Dê um nome à automação");
    const triggerNode = { id: "t1", kind: "trigger", type: form.triggerType, config: form.triggerConfig, next: ["a1"] };
    const actionNode = { id: "a1", kind: "action", type: form.actionType, config: form.actionConfig };
    const payload = { name: form.name, description: form.description, enabled: form.enabled, nodes: [triggerNode, actionNode] };
    try {
      if (editing) await api(`/automations/${editing.id}`, { method: "PATCH", body: payload });
      else await api("/automations", { method: "POST", body: payload });
      toast.success("Salvo!"); setOpen(false); load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function toggle(a: Automation) { try { await api(`/automations/${a.id}`, { method: "PATCH", body: { enabled: !a.enabled } }); load(); } catch (e: any) { toast.error(e.message); } }
  async function remove(id: string) { if (!confirm("Excluir?")) return; try { await api(`/automations/${id}`, { method: "DELETE" }); load(); } catch (e: any) { toast.error(e.message); } }

  if (!items) return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const showsBody = ["send_whatsapp", "send_email", "send_in_app", "notify_mentor", "create_task"].includes(form.actionType);
  const showsSubject = ["send_email", "send_in_app"].includes(form.actionType);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display flex items-center gap-2"><Zap className="h-7 w-7 text-amber-400" />Automações</h1>
          <p className="text-muted-foreground mt-1">Crie regras "Quando X → Faz Y" para economizar tempo.</p>
        </div>
        <Button onClick={openNew} className="bg-gradient-primary"><Plus className="h-4 w-4 mr-2" />Nova automação</Button>
      </div>

      <div className="grid gap-3">
        {items.map((a) => {
          const trigger = a.nodes.find((n) => n.kind === "trigger");
          const action = a.nodes.find((n) => n.kind === "action");
          return (
            <Card key={a.id} className="p-4 cursor-pointer hover:border-primary/40" onClick={() => openEdit(a)}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{a.name}</span>
                    {a.enabled ? <Badge variant="outline" className="text-emerald-400">Ativa</Badge> : <Badge variant="outline" className="text-muted-foreground">Pausada</Badge>}
                    <Badge variant="outline" className="text-xs">{a.runCount} execuções</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                    <span>{TRIGGERS.find(t => t.value === trigger?.type)?.label || trigger?.type}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span>{ACTIONS.find(t => t.value === action?.type)?.label || action?.type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); toggle(a); }}><Power className={`h-4 w-4 ${a.enabled ? "text-emerald-400" : "text-muted-foreground"}`} /></Button>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); remove(a.id); }}><Trash2 className="h-4 w-4 text-rose-400" /></Button>
                </div>
              </div>
            </Card>
          );
        })}
        {items.length === 0 && <Card className="p-12 text-center text-muted-foreground"><Zap className="h-12 w-12 mx-auto mb-3 opacity-40" /><p>Nenhuma automação. Crie a primeira.</p></Card>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0"><DialogTitle>{editing ? "Editar" : "Nova"} automação</DialogTitle></DialogHeader>
          <div className="space-y-4 overflow-y-auto px-6 py-2 flex-1">
            <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
              <div><Label className="text-xs">Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="flex items-center gap-2 pt-5"><Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} /><span className="text-sm">Ativa</span></div>
            </div>
            <div><Label className="text-xs">Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

            <Card className="p-3 bg-muted/20 space-y-3">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Quando (gatilho)</div>
              <Select value={form.triggerType} onValueChange={(v) => setForm({ ...form, triggerType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TRIGGERS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
              {form.triggerType === "lead_stage_changed" && (
                <Select value={form.triggerConfig.stage || ""} onValueChange={(v) => setForm({ ...form, triggerConfig: { ...form.triggerConfig, stage: v } })}>
                  <SelectTrigger><SelectValue placeholder="Etapa..." /></SelectTrigger>
                  <SelectContent>
                    {["new", "tested", "engaged", "negotiating", "client", "lost"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {form.triggerType === "lead_no_activity_days" && (
                <div><Label className="text-xs">Dias sem atividade</Label><Input type="number" value={form.triggerConfig.days || 7} onChange={(e) => setForm({ ...form, triggerConfig: { ...form.triggerConfig, days: +e.target.value } })} /></div>
              )}
            </Card>

            <div className="text-center"><ArrowRight className="h-5 w-5 mx-auto text-muted-foreground" /></div>

            <Card className="p-3 bg-muted/20 space-y-3">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Então (ação)</div>
              <Select value={form.actionType} onValueChange={(v) => setForm({ ...form, actionType: v, actionConfig: {} })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ACTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
              {showsSubject && <div><Label className="text-xs">Assunto</Label><Input value={form.actionConfig.subject || ""} onChange={(e) => setForm({ ...form, actionConfig: { ...form.actionConfig, subject: e.target.value } })} /></div>}
              {form.actionType === "create_task" && <div><Label className="text-xs">Título da tarefa</Label><Input value={form.actionConfig.title || ""} onChange={(e) => setForm({ ...form, actionConfig: { ...form.actionConfig, title: e.target.value } })} /></div>}
              {form.actionType === "change_lead_stage" && (
                <Select value={form.actionConfig.stage || ""} onValueChange={(v) => setForm({ ...form, actionConfig: { ...form.actionConfig, stage: v } })}>
                  <SelectTrigger><SelectValue placeholder="Mover para..." /></SelectTrigger>
                  <SelectContent>{["new", "tested", "engaged", "negotiating", "client", "lost"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              )}
              {showsBody && <div><Label className="text-xs">{form.actionType === "create_task" ? "Descrição" : "Mensagem"}</Label><Textarea rows={4} value={form.actionConfig.body || form.actionConfig.description || ""} onChange={(e) => setForm({ ...form, actionConfig: { ...form.actionConfig, body: e.target.value, description: e.target.value } })} placeholder="Use {{primeiro_nome}}, {{empresa}}..." /></div>}
              <div><Label className="text-xs">Atrasar envio (minutos, opcional)</Label><Input type="number" value={form.actionConfig.delayMinutes || ""} onChange={(e) => setForm({ ...form, actionConfig: { ...form.actionConfig, delayMinutes: +e.target.value || undefined } })} /></div>
            </Card>
          </div>
          <DialogFooter className="px-6 pb-6 pt-2 shrink-0 border-t"><Button onClick={save}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
