import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, Mail, Smartphone, Bell, Clock, MessageSquare, Check, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Message { id: string; channel: "in_app" | "whatsapp" | "email"; direction: string; subject?: string; body: string; status: string; scheduledAt?: string; sentAt?: string; createdAt: string; errorMessage?: string; }
interface Template { id: string; name: string; channel: string; subject?: string; body: string; }

const CHANNEL_META: Record<string, { label: string; icon: any; color: string }> = {
  in_app: { label: "App", icon: Bell, color: "text-blue-400" },
  whatsapp: { label: "WhatsApp", icon: Smartphone, color: "text-emerald-400" },
  email: { label: "Email", icon: Mail, color: "text-violet-400" },
};

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  queued: { label: "Na fila", color: "text-slate-400", icon: Clock },
  scheduled: { label: "Agendada", color: "text-amber-400", icon: Clock },
  sending: { label: "Enviando", color: "text-blue-400", icon: Loader2 },
  sent: { label: "Enviada", color: "text-emerald-400", icon: Check },
  delivered: { label: "Entregue", color: "text-emerald-400", icon: Check },
  read: { label: "Lida", color: "text-emerald-400", icon: Check },
  failed: { label: "Falhou", color: "text-rose-400", icon: AlertTriangle },
};

export default function CommunicationPanel({ leadId }: { leadId: string }) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [channel, setChannel] = useState<"in_app" | "whatsapp" | "email">("whatsapp");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [sending, setSending] = useState(false);

  async function load() {
    try {
      const [m, t] = await Promise.all([
        api<Message[]>(`/messages?leadId=${leadId}`),
        api<Template[]>("/messages/templates/all"),
      ]);
      setMessages(m); setTemplates(t);
    } catch (e: any) { toast.error(e.message); }
  }
  useEffect(() => { load(); }, [leadId]);

  function applyTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setChannel(t.channel as any);
    if (t.subject) setSubject(t.subject);
    setBody(t.body);
  }

  async function send() {
    if (!body.trim()) return toast.error("Escreva uma mensagem");
    setSending(true);
    try {
      await api("/messages", { method: "POST", body: { leadId, channel, subject, body, scheduledAt: scheduledAt || undefined } });
      toast.success(scheduledAt ? "Agendada!" : "Enviada!");
      setBody(""); setSubject(""); setScheduledAt("");
      load();
    } catch (e: any) { toast.error(e.message); } finally { setSending(false); }
  }

  async function retry(id: string) {
    try { await api(`/messages/${id}/retry`, { method: "POST" }); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  const filteredTemplates = templates.filter((t) => t.channel === channel);

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Enviar mensagem</h3>
        </div>
        <Tabs value={channel} onValueChange={(v: any) => setChannel(v)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="whatsapp"><Smartphone className="h-3 w-3 mr-1.5" />WhatsApp</TabsTrigger>
            <TabsTrigger value="email"><Mail className="h-3 w-3 mr-1.5" />Email</TabsTrigger>
            <TabsTrigger value="in_app"><Bell className="h-3 w-3 mr-1.5" />App</TabsTrigger>
          </TabsList>
        </Tabs>

        {filteredTemplates.length > 0 && (
          <div>
            <Label className="text-xs">Usar template</Label>
            <Select onValueChange={applyTemplate}>
              <SelectTrigger><SelectValue placeholder="Escolha um template..." /></SelectTrigger>
              <SelectContent>{filteredTemplates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}

        {(channel === "email" || channel === "in_app") && (
          <div><Label className="text-xs">Assunto</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
        )}
        <div><Label className="text-xs">Mensagem</Label><Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escreva ou selecione um template acima..." /></div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" />Agendar (opcional)</Label>
            <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
          <Button onClick={send} disabled={sending} className="bg-gradient-primary mt-5">
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            {scheduledAt ? "Agendar" : "Enviar"}
          </Button>
        </div>
      </Card>

      <div>
        <h4 className="font-semibold text-sm mb-3">Histórico unificado</h4>
        {!messages ? <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" /> :
          messages.length === 0 ? <Card className="p-8 text-center text-muted-foreground text-sm">Nenhuma mensagem ainda.</Card> :
          <div className="space-y-2">
            {messages.map((m) => {
              const cm = CHANNEL_META[m.channel];
              const sm = STATUS_META[m.status] || STATUS_META.queued;
              const CIcon = cm.icon, SIcon = sm.icon;
              return (
                <Card key={m.id} className="p-3">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={cm.color}><CIcon className="h-3 w-3 mr-1" />{cm.label}</Badge>
                      <Badge variant="outline" className={sm.color}><SIcon className={`h-3 w-3 mr-1 ${m.status === 'sending' ? 'animate-spin' : ''}`} />{sm.label}</Badge>
                      {m.scheduledAt && <span className="text-xs text-muted-foreground">⏰ {new Date(m.scheduledAt).toLocaleString("pt-BR")}</span>}
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(m.sentAt || m.createdAt).toLocaleString("pt-BR")}</span>
                  </div>
                  {m.subject && <div className="text-sm font-medium mb-1">{m.subject}</div>}
                  <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                  {m.errorMessage && (
                    <div className="mt-2 text-xs text-rose-400 flex items-center justify-between gap-2">
                      <span>{m.errorMessage}</span>
                      <Button size="sm" variant="ghost" onClick={() => retry(m.id)}>Tentar novamente</Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        }
      </div>
    </div>
  );
}
