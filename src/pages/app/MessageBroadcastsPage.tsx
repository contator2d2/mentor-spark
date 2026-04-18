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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Megaphone, Trash2, Send, Clock, ShieldCheck, AlertTriangle, ArrowLeft, X, Paperclip, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { MediaUpload } from "@/components/MediaUpload";

type Channel = "in_app" | "whatsapp" | "email";

interface Lead { id: string; name: string; email?: string; phone?: string; }
interface Step { body: string; subject?: string; delaySeconds?: number; attachments?: any[] }
interface Broadcast {
  id: string; name: string; channel: Channel; status: string;
  totalRecipients: number; sentCount: number; failedCount: number;
  scheduledAt?: string; startedAt?: string; finishedAt?: string;
  perRecipientDelaySeconds: number; jitter: number;
  sequence: Step[]; leadIds: string[];
}
interface Template { id: string; name: string; channel: Channel; subject?: string; body: string; attachments?: any[] }

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho", scheduled: "Agendado", running: "Em execução", completed: "Concluído", canceled: "Cancelado", failed: "Falhou",
};

export default function MessageBroadcastsPage() {
  const [items, setItems] = useState<Broadcast[] | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [reportFor, setReportFor] = useState<Broadcast | null>(null);

  async function load() {
    try { setItems(await api<Broadcast[]>("/messages/broadcasts")); }
    catch (e: any) { toast.error(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function cancelBc(id: string) {
    if (!confirm("Cancelar este disparo? Mensagens já agendadas serão paradas.")) return;
    try { await api(`/messages/broadcasts/${id}/cancel`, { method: "POST" }); toast.success("Cancelado"); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  if (!items) return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2"><Link to="/app/messages/templates"><ArrowLeft className="h-4 w-4 mr-1" />Templates</Link></Button>
          <h1 className="text-3xl font-display flex items-center gap-2"><Megaphone className="h-7 w-7 text-primary" />Disparos em massa</h1>
          <p className="text-muted-foreground text-sm mt-1">Envie sequências de mensagens para listas de leads com delay anti-bloqueio.</p>
        </div>
        <Button onClick={() => setComposerOpen(true)} className="bg-gradient-primary"><Plus className="h-4 w-4 mr-2" />Novo disparo</Button>
      </div>

      <div className="grid gap-3">
        {items.map((b) => {
          const total = b.totalRecipients || b.leadIds.length;
          const done = b.sentCount + b.failedCount;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          return (
            <Card key={b.id} className="p-4 hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setReportFor(b)}>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline">{b.channel}</Badge>
                    <Badge variant={b.status === "completed" ? "default" : b.status === "failed" ? "destructive" : "secondary"}>{STATUS_LABEL[b.status] || b.status}</Badge>
                    <span className="font-medium">{b.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                    <span>{total} destinatário(s)</span>
                    <span>{b.sequence.length} mensagem(s) na sequência</span>
                    <span>Delay: {b.perRecipientDelaySeconds}s ±{Math.round(b.jitter * 100)}%</span>
                    {b.scheduledAt && <span><Clock className="h-3 w-3 inline mr-1" />{new Date(b.scheduledAt).toLocaleString("pt-BR")}</span>}
                  </div>
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{b.sentCount} enviadas · {b.failedCount} falhas · {pct}%</div>
                </div>
                {(b.status === "scheduled" || b.status === "running") && (
                  <Button variant="ghost" size="icon" onClick={() => cancelBc(b.id)} title="Cancelar"><X className="h-4 w-4 text-destructive" /></Button>
                )}
              </div>
            </Card>
          );
        })}
        {items.length === 0 && (
          <Card className="p-12 text-center text-muted-foreground">
            <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Nenhum disparo ainda. Crie um para enviar mensagens em sequência para vários leads.</p>
          </Card>
        )}
      </div>

      {composerOpen && <ComposerDialog onClose={() => { setComposerOpen(false); load(); }} />}
      {reportFor && <ReportDialog id={reportFor.id} onClose={() => setReportFor(null)} />}
    </div>
  );
}

// =================== COMPOSER ===================
function ComposerDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [delay, setDelay] = useState(8);
  const [jitter, setJitter] = useState(0.3);
  const [scheduledAt, setScheduledAt] = useState("");
  const [steps, setSteps] = useState<Step[]>([{ body: "", delaySeconds: 0 }]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<Record<string, { isWhatsapp?: boolean; error?: string }>>({});
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    api<Lead[]>("/leads").then(setLeads).catch(() => {});
    api<Template[]>("/messages/templates/all").then(setTemplates).catch(() => {});
  }, []);

  const filteredLeads = useMemo(() => {
    const q = search.toLowerCase();
    return leads.filter((l) => !q || l.name?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q) || l.phone?.includes(q));
  }, [leads, search]);

  function toggleAll() {
    if (selected.size === filteredLeads.length) setSelected(new Set());
    else setSelected(new Set(filteredLeads.map((l) => l.id)));
  }
  function toggleLead(id: string) {
    const ns = new Set(selected); ns.has(id) ? ns.delete(id) : ns.add(id); setSelected(ns);
  }

  function addStep() { setSteps([...steps, { body: "", delaySeconds: 30 }]); }
  function removeStep(i: number) { setSteps(steps.filter((_, idx) => idx !== i)); }
  function updateStep(i: number, patch: Partial<Step>) {
    setSteps(steps.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  }
  function applyTemplate(i: number, tplId: string) {
    const t = templates.find((x) => x.id === tplId);
    if (!t) return;
    updateStep(i, { body: t.body, subject: t.subject, attachments: t.attachments });
  }
  function addAttachment(i: number, att: any) {
    const s = steps[i]; updateStep(i, { attachments: [...(s.attachments || []), att] });
  }
  function removeAttachment(i: number, attIdx: number) {
    const s = steps[i]; updateStep(i, { attachments: (s.attachments || []).filter((_, x) => x !== attIdx) });
  }

  async function validateAll() {
    if (channel !== "whatsapp") return toast.info("Validação só disponível para WhatsApp");
    if (selected.size === 0) return toast.error("Selecione destinatários");
    setValidating(true);
    try {
      const res = await api<{ results: Array<{ leadId: string; isWhatsapp?: boolean; error?: string }> }>("/messages/whatsapp/check-batch", {
        method: "POST", body: { leadIds: Array.from(selected) },
      });
      const map: Record<string, any> = {};
      for (const r of res.results) map[r.leadId] = { isWhatsapp: r.isWhatsapp, error: r.error };
      setValidation(map);
      const ok = res.results.filter((r) => r.isWhatsapp).length;
      toast.success(`${ok}/${res.results.length} números válidos no WhatsApp`);
    } catch (e: any) { toast.error(e.message); } finally { setValidating(false); }
  }

  async function save() {
    if (!name) return toast.error("Dê um nome ao disparo");
    if (steps.some((s) => !s.body)) return toast.error("Todas as mensagens precisam de conteúdo");
    if (selected.size === 0) return toast.error("Selecione ao menos um destinatário");
    setSaving(true);
    try {
      await api("/messages/broadcasts", {
        method: "POST",
        body: {
          name, channel, sequence: steps,
          leadIds: Array.from(selected),
          perRecipientDelaySeconds: delay, jitter,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        },
      });
      toast.success(scheduledAt ? "Disparo agendado!" : "Disparo iniciado!");
      onClose();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  const channelTemplates = templates.filter((t) => t.channel === channel);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Novo disparo em massa</DialogTitle></DialogHeader>
        <div className="space-y-5">
          {/* Configuração geral */}
          <Card className="p-4 space-y-3">
            <div className="grid md:grid-cols-3 gap-3">
              <div className="md:col-span-2"><Label className="text-xs">Nome do disparo *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Convite Workshop Outubro" /></div>
              <div>
                <Label className="text-xs">Canal *</Label>
                <Select value={channel} onValueChange={(v: any) => setChannel(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="in_app">App</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Delay entre destinatários (segundos)</Label>
                <Input type="number" min={1} value={delay} onChange={(e) => setDelay(Number(e.target.value))} />
                <p className="text-[10px] text-muted-foreground mt-1">Espaça envios para evitar bloqueio (recomendado 8-15s)</p>
              </div>
              <div>
                <Label className="text-xs">Variação aleatória (%)</Label>
                <Input type="number" min={0} max={100} value={Math.round(jitter * 100)} onChange={(e) => setJitter(Number(e.target.value) / 100)} />
                <p className="text-[10px] text-muted-foreground mt-1">Aleatoriedade no delay (recomendado 30%)</p>
              </div>
              <div>
                <Label className="text-xs">Agendar para</Label>
                <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                <p className="text-[10px] text-muted-foreground mt-1">Em branco = enviar agora</p>
              </div>
            </div>
          </Card>

          {/* Sequência de mensagens */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Sequência de mensagens</Label>
              <Button size="sm" variant="outline" onClick={addStep}><Plus className="h-3 w-3 mr-1" />Adicionar mensagem</Button>
            </div>
            <div className="space-y-3">
              {steps.map((s, i) => (
                <Card key={i} className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Mensagem {i + 1}</Badge>
                    {steps.length > 1 && <Button size="icon" variant="ghost" onClick={() => removeStep(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>}
                  </div>
                  {i > 0 && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <Label className="text-xs">Esperar</Label>
                      <Input type="number" className="w-24" value={s.delaySeconds || 0} onChange={(e) => updateStep(i, { delaySeconds: Number(e.target.value) })} />
                      <span className="text-xs text-muted-foreground">segundos após mensagem {i}</span>
                    </div>
                  )}
                  {channelTemplates.length > 0 && (
                    <Select onValueChange={(v) => applyTemplate(i, v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Aplicar template..." /></SelectTrigger>
                      <SelectContent>
                        {channelTemplates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  {(channel === "email" || channel === "in_app") && (
                    <Input placeholder="Assunto" value={s.subject || ""} onChange={(e) => updateStep(i, { subject: e.target.value })} />
                  )}
                  <Textarea rows={3} value={s.body} onChange={(e) => updateStep(i, { body: e.target.value })} placeholder="Mensagem... use {{primeiro_nome}}, {{empresa}}" />
                  {(s.attachments || []).map((a: any, ai: number) => (
                    <div key={ai} className="flex items-center justify-between bg-muted/40 rounded px-2 py-1 text-xs">
                      <span className="truncate flex items-center gap-1"><Paperclip className="h-3 w-3" />{a.originalName || a.url}</span>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeAttachment(i, ai)}><X className="h-3 w-3" /></Button>
                    </div>
                  ))}
                  <MediaUpload compact onChange={(res) => { if (res) addAttachment(i, { url: res.url, mimetype: res.mimetype, originalName: res.originalName, kind: res.kind }); }} />
                </Card>
              ))}
            </div>
          </div>

          {/* Destinatários */}
          <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <Label>Destinatários ({selected.size} selecionados)</Label>
              <div className="flex gap-2">
                <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-48" />
                <Button size="sm" variant="outline" onClick={toggleAll}>{selected.size === filteredLeads.length ? "Limpar" : "Selecionar todos"}</Button>
                {channel === "whatsapp" && (
                  <Button size="sm" variant="outline" onClick={validateAll} disabled={validating || selected.size === 0}>
                    {validating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ShieldCheck className="h-3 w-3 mr-1" />}Validar números
                  </Button>
                )}
              </div>
            </div>
            <Card className="max-h-72 overflow-y-auto">
              {filteredLeads.map((l) => {
                const v = validation[l.id];
                return (
                  <div key={l.id} className="flex items-center gap-2 px-3 py-2 border-b border-border/40 hover:bg-muted/30">
                    <Checkbox checked={selected.has(l.id)} onCheckedChange={() => toggleLead(l.id)} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm">{l.name}</div>
                      <div className="text-xs text-muted-foreground">{channel === "email" ? l.email : l.phone}</div>
                    </div>
                    {v && (v.isWhatsapp
                      ? <Badge variant="outline" className="text-xs"><CheckCircle2 className="h-3 w-3 mr-1 text-emerald-500" />WA</Badge>
                      : <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />{v.error || "Sem WA"}</Badge>)}
                  </div>
                );
              })}
              {filteredLeads.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">Nenhum lead encontrado.</div>}
            </Card>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="bg-gradient-primary">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}<Send className="h-4 w-4 mr-2" />{scheduledAt ? "Agendar disparo" : "Iniciar disparo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =================== REPORT ===================
function ReportDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api(`/messages/broadcasts/${id}`).then(setData).catch((e) => toast.error(e.message)); }, [id]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Relatório do disparo</DialogTitle></DialogHeader>
        {!data ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-medium mb-2">{data.broadcast.name}</h3>
              <div className="grid grid-cols-4 gap-3 text-center">
                <div><div className="text-2xl font-bold">{data.broadcast.totalRecipients}</div><div className="text-xs text-muted-foreground">Destinatários</div></div>
                <div><div className="text-2xl font-bold text-emerald-500">{data.summary.sent || 0}</div><div className="text-xs text-muted-foreground">Enviadas</div></div>
                <div><div className="text-2xl font-bold text-amber-500">{(data.summary.scheduled || 0) + (data.summary.queued || 0)}</div><div className="text-xs text-muted-foreground">Pendentes</div></div>
                <div><div className="text-2xl font-bold text-destructive">{data.summary.failed || 0}</div><div className="text-xs text-muted-foreground">Falhas</div></div>
              </div>
            </Card>
            <Card>
              <div className="max-h-96 overflow-y-auto">
                {data.messages.map((m: any) => (
                  <div key={m.id} className="px-3 py-2 border-b border-border/40 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono">{m.recipientAddress}</span>
                      <Badge variant={m.status === "sent" ? "default" : m.status === "failed" ? "destructive" : "secondary"} className="text-[10px]">{m.status}</Badge>
                    </div>
                    {m.errorMessage && <div className="text-destructive mt-1">{m.errorMessage}</div>}
                    {m.sentAt && <div className="text-muted-foreground">{new Date(m.sentAt).toLocaleString("pt-BR")}</div>}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
