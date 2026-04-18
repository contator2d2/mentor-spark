import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Layers, Trash2, Pencil, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface Plan {
  id: string;
  slug: string;
  name: string;
  description?: string;
  priceMonthly: number;
  maxMentorados: number;
  maxLeads: number;
  maxAiMessagesMonth: number;
  maxTeamMembers: number;
  maxKanbanBoards: number;
  allowWhatsapp: boolean;
  allowAi: boolean;
  allowCustomDomain: boolean;
  allowMeetings: boolean;
  allowGoogleCalendar: boolean;
  allowAutomations: boolean;
  allowLandingBuilder: boolean;
  allowMessaging: boolean;
  isActive: boolean;
  sortOrder: number;
}

const empty: Partial<Plan> = {
  slug: "",
  name: "",
  description: "",
  priceMonthly: 0,
  maxMentorados: 10,
  maxLeads: 100,
  maxAiMessagesMonth: 100,
  maxTeamMembers: 0,
  maxKanbanBoards: 1,
  allowWhatsapp: false,
  allowAi: true,
  allowCustomDomain: false,
  allowMeetings: false,
  allowGoogleCalendar: false,
  allowAutomations: false,
  allowLandingBuilder: false,
  allowMessaging: true,
  isActive: true,
  sortOrder: 0,
};

const MODULES: Array<{ key: keyof Plan; label: string; help?: string }> = [
  { key: "allowAi", label: "IA (assistente, análises)" },
  { key: "allowWhatsapp", label: "WhatsApp (uazapi)" },
  { key: "allowMessaging", label: "Mensagens (broadcasts/templates)" },
  { key: "allowMeetings", label: "Reuniões + transcrição" },
  { key: "allowGoogleCalendar", label: "Google Calendar (sync)" },
  { key: "allowAutomations", label: "Automações (gatilhos)" },
  { key: "allowLandingBuilder", label: "Landing pages" },
  { key: "allowCustomDomain", label: "Domínio próprio" },
];

export default function AdminPlans() {
  const [items, setItems] = useState<Plan[] | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Plan>>(empty);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    try {
      setItems(await api<Plan[]>("/plans"));
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditingId(null);
    setForm(empty);
    setOpen(true);
  }

  function openEdit(p: Plan) {
    setEditingId(p.id);
    setForm(p);
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      if (editingId) {
        await api(`/plans/${editingId}`, { method: "PATCH", body: form });
        toast.success("Plano atualizado");
      } else {
        await api("/plans", { method: "POST", body: form });
        toast.success("Plano criado");
      }
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir este plano?")) return;
    try {
      await api(`/plans/${id}`, { method: "DELETE" });
      toast.success("Excluído");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  if (!items) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Layers className="h-6 w-6 text-accent" />
          <div>
            <h1 className="font-display text-3xl font-bold">Planos</h1>
            <p className="text-muted-foreground">Defina os planos, limites e quais módulos cada um libera.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/app/admin/credentials">
              <Settings2 className="h-4 w-4 mr-2" />
              Credenciais (Google etc)
            </Link>
          </Button>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" />
            Novo plano
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((p) => (
          <div key={p.id} className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display text-xl font-bold">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.slug}</div>
              </div>
              {p.isActive ? <Badge>Ativo</Badge> : <Badge variant="outline">Inativo</Badge>}
            </div>
            <div className="text-3xl font-bold">
              R$ {Number(p.priceMonthly).toFixed(0)}
              <span className="text-sm font-normal text-muted-foreground">/mês</span>
            </div>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>Mentorados: {p.maxMentorados < 0 ? "∞" : p.maxMentorados}</li>
              <li>Leads: {p.maxLeads < 0 ? "∞" : p.maxLeads}</li>
              <li>IA/mês: {p.maxAiMessagesMonth < 0 ? "∞" : p.maxAiMessagesMonth}</li>
              <li>Equipe: {p.maxTeamMembers < 0 ? "∞" : p.maxTeamMembers}</li>
              <li>Kanbans: {p.maxKanbanBoards < 0 ? "∞" : p.maxKanbanBoards}</li>
            </ul>
            <div className="flex flex-wrap gap-1 pt-2">
              {MODULES.filter((m) => (p as any)[m.key]).map((m) => (
                <Badge key={m.key} variant="secondary" className="text-[10px]">
                  {m.label.split(" ")[0]}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                <Pencil className="h-3 w-3 mr-1" />
                Editar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar plano" : "Novo plano"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2 text-sm uppercase tracking-wider text-muted-foreground">Identificação</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Slug *</Label>
                  <Input value={form.slug || ""} onChange={(e) => setForm({ ...form, slug: e.target.value })} disabled={!!editingId} />
                </div>
                <div>
                  <Label>Nome *</Label>
                  <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Descrição</Label>
                  <Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div>
                  <Label>Preço (R$/mês)</Label>
                  <Input type="number" value={form.priceMonthly || 0} onChange={(e) => setForm({ ...form, priceMonthly: +e.target.value })} />
                </div>
                <div>
                  <Label>Ordem de exibição</Label>
                  <Input type="number" value={form.sortOrder || 0} onChange={(e) => setForm({ ...form, sortOrder: +e.target.value })} />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2 text-sm uppercase tracking-wider text-muted-foreground">Limites (-1 = ilimitado)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <Label>Mentorados</Label>
                  <Input type="number" value={form.maxMentorados ?? 10} onChange={(e) => setForm({ ...form, maxMentorados: +e.target.value })} />
                </div>
                <div>
                  <Label>Leads</Label>
                  <Input type="number" value={form.maxLeads ?? 100} onChange={(e) => setForm({ ...form, maxLeads: +e.target.value })} />
                </div>
                <div>
                  <Label>IA msgs/mês</Label>
                  <Input type="number" value={form.maxAiMessagesMonth ?? 100} onChange={(e) => setForm({ ...form, maxAiMessagesMonth: +e.target.value })} />
                </div>
                <div>
                  <Label>Membros equipe</Label>
                  <Input type="number" value={form.maxTeamMembers ?? 0} onChange={(e) => setForm({ ...form, maxTeamMembers: +e.target.value })} />
                </div>
                <div>
                  <Label>Kanban boards</Label>
                  <Input type="number" value={form.maxKanbanBoards ?? 1} onChange={(e) => setForm({ ...form, maxKanbanBoards: +e.target.value })} />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2 text-sm uppercase tracking-wider text-muted-foreground">Módulos liberados</h3>
              <div className="grid md:grid-cols-2 gap-2">
                {MODULES.map((m) => (
                  <div key={m.key} className="flex items-center justify-between bg-muted/30 rounded p-3">
                    <div>
                      <Label className="cursor-pointer">{m.label}</Label>
                      {m.help && <p className="text-xs text-muted-foreground">{m.help}</p>}
                    </div>
                    <Switch
                      checked={!!(form as any)[m.key]}
                      onCheckedChange={(v) => setForm({ ...form, [m.key]: v } as any)}
                    />
                  </div>
                ))}
                <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded p-3 md:col-span-2">
                  <Label className="cursor-pointer font-semibold">Plano ativo (visível para novos cadastros)</Label>
                  <Switch checked={!!form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={save} disabled={saving || !form.slug || !form.name}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
