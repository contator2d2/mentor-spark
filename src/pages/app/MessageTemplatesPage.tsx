import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, MessageSquare, Mail, Smartphone, Bell } from "lucide-react";
import { toast } from "sonner";

interface Template { id: string; name: string; channel: "in_app" | "whatsapp" | "email"; subject?: string; body: string; description?: string; }

const CHANNEL_META = {
  in_app: { label: "App", icon: Bell, color: "text-blue-400" },
  whatsapp: { label: "WhatsApp", icon: Smartphone, color: "text-emerald-400" },
  email: { label: "Email", icon: Mail, color: "text-violet-400" },
};

export default function MessageTemplatesPage() {
  const [items, setItems] = useState<Template[] | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState<Partial<Template>>({ channel: "whatsapp", name: "", subject: "", body: "" });
  const [saving, setSaving] = useState(false);

  async function load() { try { setItems(await api<Template[]>("/messages/templates/all")); } catch (e: any) { toast.error(e.message); } }
  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm({ channel: "whatsapp", name: "", subject: "", body: "" }); setOpen(true); }
  function openEdit(t: Template) { setEditing(t); setForm(t); setOpen(true); }

  async function save() {
    if (!form.name || !form.body || !form.channel) return toast.error("Preencha nome, canal e mensagem");
    setSaving(true);
    try {
      if (editing) await api(`/messages/templates/${editing.id}`, { method: "PATCH", body: form });
      else await api("/messages/templates", { method: "POST", body: form });
      toast.success("Salvo!"); setOpen(false); load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm("Excluir template?")) return;
    try { await api(`/messages/templates/${id}`, { method: "DELETE" }); load(); } catch (e: any) { toast.error(e.message); }
  }

  if (!items) return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display flex items-center gap-2"><MessageSquare className="h-7 w-7 text-primary" />Templates de mensagens</h1>
          <p className="text-muted-foreground mt-1 text-sm">Use variáveis como <code className="text-xs bg-muted px-1 rounded">{`{{nome}}`}</code>, <code className="text-xs bg-muted px-1 rounded">{`{{primeiro_nome}}`}</code>, <code className="text-xs bg-muted px-1 rounded">{`{{empresa}}`}</code>, <code className="text-xs bg-muted px-1 rounded">{`{{mentor}}`}</code>.</p>
        </div>
        <Button onClick={openNew} className="bg-gradient-primary"><Plus className="h-4 w-4 mr-2" />Novo template</Button>
      </div>

      <div className="grid gap-3">
        {items.map((t) => {
          const meta = CHANNEL_META[t.channel];
          const Icon = meta.icon;
          return (
            <Card key={t.id} className="p-4 cursor-pointer hover:border-primary/40 transition-colors" onClick={() => openEdit(t)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={meta.color}><Icon className="h-3 w-3 mr-1" />{meta.label}</Badge>
                    <span className="font-medium">{t.name}</span>
                  </div>
                  {t.subject && <div className="text-xs text-muted-foreground mb-1">Assunto: {t.subject}</div>}
                  <p className="text-sm text-muted-foreground line-clamp-2">{t.body}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); remove(t.id); }}><Trash2 className="h-4 w-4 text-rose-400" /></Button>
              </div>
            </Card>
          );
        })}
        {items.length === 0 && <Card className="p-12 text-center text-muted-foreground"><MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-40" /><p>Nenhum template ainda.</p></Card>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing ? "Editar template" : "Novo template"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Nome *</Label><Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div>
                <Label className="text-xs">Canal *</Label>
                <Select value={form.channel} onValueChange={(v: any) => setForm({ ...form, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="in_app">App (notificação)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(form.channel === "email" || form.channel === "in_app") && (
              <div><Label className="text-xs">Assunto</Label><Input value={form.subject || ""} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
            )}
            <div>
              <Label className="text-xs">Mensagem *</Label>
              <Textarea rows={8} value={form.body || ""} onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Olá {{primeiro_nome}}, tudo bem? Gostaria de agendar uma conversa..." />
            </div>
          </div>
          <DialogFooter><Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
