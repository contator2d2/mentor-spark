import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Plus, Trash2, MessageSquare, Mail, Smartphone, Bell, Send, Library, Copy, Paperclip, X, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import MediaUpload from "@/components/MediaUpload";

type Channel = "in_app" | "whatsapp" | "email";
type Category = "welcome" | "followup" | "event" | "reminder" | "sales" | "onboarding" | "reengage" | "thankyou" | "custom";

interface Attachment { url: string; mimetype?: string; originalName?: string; kind?: string }
interface Template {
  id: string; name: string; channel: Channel; category: Category;
  subject?: string; body: string; description?: string;
  attachments?: Attachment[]; isLibrary: boolean; mentorId?: string | null;
}

const CHANNEL_META: Record<Channel, { label: string; icon: any; color: string }> = {
  in_app: { label: "App", icon: Bell, color: "text-blue-400" },
  whatsapp: { label: "WhatsApp", icon: Smartphone, color: "text-emerald-400" },
  email: { label: "Email", icon: Mail, color: "text-violet-400" },
};

const CATEGORY_LABELS: Record<Category, string> = {
  welcome: "Boas-vindas", followup: "Follow-up", event: "Evento", reminder: "Lembrete",
  sales: "Vendas", onboarding: "Onboarding", reengage: "Reengajamento", thankyou: "Agradecimento", custom: "Personalizado",
};

export default function MessageTemplatesPage() {
  const [items, setItems] = useState<Template[] | null>(null);
  const [tab, setTab] = useState<"meus" | "biblioteca">("meus");
  const [filterChannel, setFilterChannel] = useState<Channel | "all">("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState<Partial<Template>>({ channel: "whatsapp", category: "custom", name: "", subject: "", body: "", attachments: [] });
  const [saving, setSaving] = useState(false);

  // Test dialog
  const [testOpen, setTestOpen] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testTpl, setTestTpl] = useState<Template | null>(null);
  const [testing, setTesting] = useState(false);

  async function load() {
    try { setItems(await api<Template[]>("/messages/templates/all")); }
    catch (e: any) { toast.error(e.message); }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    return items.filter((t) => {
      const isLib = !!t.isLibrary;
      if (tab === "meus" && isLib) return false;
      if (tab === "biblioteca" && !isLib) return false;
      if (filterChannel !== "all" && t.channel !== filterChannel) return false;
      return true;
    });
  }, [items, tab, filterChannel]);

  function openNew() {
    setEditing(null);
    setForm({ channel: "whatsapp", category: "custom", name: "", subject: "", body: "", attachments: [] });
    setEditorOpen(true);
  }
  function openEdit(t: Template) {
    if (t.isLibrary) { toast.info("Templates da biblioteca não podem ser editados. Clone primeiro."); return; }
    setEditing(t);
    setForm({ ...t, attachments: t.attachments || [] });
    setEditorOpen(true);
  }

  async function save() {
    if (!form.name || !form.body || !form.channel) return toast.error("Preencha nome, canal e mensagem");
    setSaving(true);
    try {
      if (editing) await api(`/messages/templates/${editing.id}`, { method: "PATCH", body: form });
      else await api("/messages/templates", { method: "POST", body: form });
      toast.success("Salvo!"); setEditorOpen(false); load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  async function clone(t: Template) {
    try {
      await api(`/messages/templates/${t.id}/clone`, { method: "POST" });
      toast.success("Template clonado para o seu acervo");
      setTab("meus"); load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function remove(t: Template) {
    if (t.isLibrary) return;
    if (!confirm("Excluir template?")) return;
    try { await api(`/messages/templates/${t.id}`, { method: "DELETE" }); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  function openTest(t: Template) { setTestTpl(t); setTestTo(""); setTestOpen(true); }
  async function runTest() {
    if (!testTpl) return;
    if (!testTo) return toast.error("Informe o destinatário");
    setTesting(true);
    try {
      await api("/messages/test", {
        method: "POST",
        body: { channel: testTpl.channel, to: testTo, subject: testTpl.subject, body: testTpl.body, attachments: testTpl.attachments },
      });
      toast.success("Mensagem de teste enviada! Verifique o destino.");
      setTestOpen(false);
    } catch (e: any) { toast.error(e.message); } finally { setTesting(false); }
  }

  function addAttachment(att: Attachment) {
    setForm((f) => ({ ...f, attachments: [...(f.attachments || []), att] }));
  }
  function removeAttachment(idx: number) {
    setForm((f) => ({ ...f, attachments: (f.attachments || []).filter((_, i) => i !== idx) }));
  }

  if (!items) return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-primary" />Templates de mensagens
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Use variáveis como <code className="text-xs bg-muted px-1 rounded">{`{{primeiro_nome}}`}</code>, <code className="text-xs bg-muted px-1 rounded">{`{{empresa}}`}</code>, <code className="text-xs bg-muted px-1 rounded">{`{{mentor}}`}</code>.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link to="/app/messages/broadcasts"><Megaphone className="h-4 w-4 mr-2" />Disparos</Link></Button>
          <Button onClick={openNew} className="bg-gradient-primary"><Plus className="h-4 w-4 mr-2" />Novo template</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="meus">Meus templates</TabsTrigger>
            <TabsTrigger value="biblioteca"><Library className="h-3 w-3 mr-1" />Biblioteca</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={filterChannel} onValueChange={(v: any) => setFilterChannel(v)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos canais</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="in_app">App</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((t) => {
          const meta = CHANNEL_META[t.channel];
          const Icon = meta.icon;
          return (
            <Card key={t.id} className="p-4 hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => openEdit(t)}>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline" className={meta.color}><Icon className="h-3 w-3 mr-1" />{meta.label}</Badge>
                    <Badge variant="secondary" className="text-xs">{CATEGORY_LABELS[t.category] || t.category}</Badge>
                    {t.isLibrary && <Badge className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30">Biblioteca</Badge>}
                    <span className="font-medium">{t.name}</span>
                  </div>
                  {t.subject && <div className="text-xs text-muted-foreground mb-1">Assunto: {t.subject}</div>}
                  <p className="text-sm text-muted-foreground line-clamp-2">{t.body}</p>
                  {!!t.attachments?.length && (
                    <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />{t.attachments.length} anexo(s)
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <Button variant="ghost" size="icon" title="Enviar teste" onClick={() => openTest(t)}><Send className="h-4 w-4" /></Button>
                  {t.isLibrary
                    ? <Button variant="ghost" size="icon" title="Clonar" onClick={() => clone(t)}><Copy className="h-4 w-4" /></Button>
                    : <Button variant="ghost" size="icon" onClick={() => remove(t)}><Trash2 className="h-4 w-4 text-rose-400" /></Button>}
                </div>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card className="p-12 text-center text-muted-foreground md:col-span-2">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>{tab === "biblioteca" ? "Nenhum template na biblioteca." : "Nenhum template ainda. Clone alguns da biblioteca para começar!"}</p>
          </Card>
        )}
      </div>

      {/* EDITOR */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar template" : "Novo template"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2"><Label className="text-xs">Nome *</Label><Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div>
                <Label className="text-xs">Canal *</Label>
                <Select value={form.channel} onValueChange={(v: any) => setForm({ ...form, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="in_app">App</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Categoria</Label>
              <Select value={form.category || "custom"} onValueChange={(v: any) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {(form.channel === "email" || form.channel === "in_app") && (
              <div><Label className="text-xs">Assunto</Label><Input value={form.subject || ""} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
            )}
            <div>
              <Label className="text-xs">Mensagem *</Label>
              <Textarea rows={8} value={form.body || ""} onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Olá {{primeiro_nome}}, tudo bem? ..." />
            </div>

            <div>
              <Label className="text-xs flex items-center gap-1"><Paperclip className="h-3 w-3" />Anexos</Label>
              <div className="space-y-1 mt-1">
                {(form.attachments || []).map((a, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 bg-muted/40 rounded px-2 py-1 text-xs">
                    <span className="truncate">{a.originalName || a.url}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeAttachment(i)}><X className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
              <div className="mt-2">
                <MediaUpload onUploaded={(res) => addAttachment({ url: res.url, mimetype: res.mimetype, originalName: res.originalName, kind: res.kind })} />
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TESTE */}
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Enviar teste — {testTpl?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Variáveis como <code>{`{{primeiro_nome}}`}</code> ficarão como estão no teste (não temos um lead de contexto).
            </p>
            <div>
              <Label className="text-xs">{testTpl?.channel === "email" ? "Email destinatário" : testTpl?.channel === "whatsapp" ? "Telefone (DDI+DDD)" : "User ID destinatário"}</Label>
              <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder={testTpl?.channel === "whatsapp" ? "5511999999999" : ""} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={runTest} disabled={testing}>{testing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}<Send className="h-4 w-4 mr-2" />Enviar teste</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
