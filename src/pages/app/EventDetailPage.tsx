import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import QRCode from "qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Loader2, ArrowLeft, QrCode, Users, ScanLine, Send, ClipboardList, Calendar,
  Sparkles, BarChart3, Copy, Trash2, UserCheck, RefreshCw, Megaphone, Building2, Zap, Ticket
} from "lucide-react";
import { toast } from "sonner";
import CheckinScanner from "@/components/events/CheckinScanner";
import StartQuizDialog from "@/components/quiz/StartQuizDialog";
import EventCouponsSection from "@/components/events/EventCouponsSection";

const STATUS_LABELS: Record<string, string> = {
  registered: "Inscrito",
  confirmed: "Confirmado",
  checked_in: "Presente",
  no_show: "Ausente",
  cancelled: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  registered: "border-sky-500/40 bg-sky-500/10 text-sky-400",
  confirmed: "border-violet-500/40 bg-violet-500/10 text-violet-400",
  checked_in: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  no_show: "border-rose-500/40 bg-rose-500/10 text-rose-400",
  cancelled: "border-muted bg-muted/20 text-muted-foreground",
};

export default function EventDetailPage() {
  const { id } = useParams();
  const [event, setEvent] = useState<any>(null);
  const [regs, setRegs] = useState<any[] | null>(null);
  const [actions, setActions] = useState<any[]>([]);
  const [nps, setNps] = useState<any>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
   const [broadcastOpen, setBroadcastOpen] = useState(false);
   const [bForm, setBForm] = useState({ 
     subject: "", 
     message: "", 
     channels: ["email", "whatsapp"], 
     onlyStatus: [] as string[],
     whatsappInstanceId: ""
   });
   const [sending, setSending] = useState(false);
   const [me, setMe] = useState<any>(null);
   const [instances, setInstances] = useState<any[]>([]);

   async function load() {
     try {
       const [ev, rg, acts, n, ts, user, wa] = await Promise.all([
         api(`/events/${id}`),
         api<any[]>(`/events/${id}/registrations`),
         api<any[]>(`/events/${id}/actions`),
         api(`/events/${id}/nps/summary`),
         api<any[]>("/tests/templates").catch(() => []),
         api("/me"),
         api<any>("/integrations/whatsapp").catch(() => ({ instances: [] }))
       ]);
       setEvent(ev); 
       setRegs(rg); 
       setActions(acts); 
       setNps(n); 
       setTests(ts); 
       setMe(user);
       setInstances(wa.instances || []);
     } catch (e: any) { toast.error(e.message); }
   }
  useEffect(() => { load(); }, [id]);

  function publicSignupUrl() {
    return `${window.location.origin}/e/${event?.slug}`;
  }

  async function setStatus(regId: string, status: string) {
    await api(`/events/${id}/registrations/${regId}/status`, { method: "PATCH", body: { status } });
    load();
  }
  async function removeReg(regId: string) {
    if (!confirm("Remover inscrito?")) return;
    await api(`/events/${id}/registrations/${regId}`, { method: "DELETE" });
    load();
  }
  async function convert(regId: string) {
    try {
      await api(`/events/${id}/registrations/${regId}/convert`, { method: "POST" });
      toast.success("Convertido em lead");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function sendNps() {
    setSending(true);
    try {
      const r = await api<any>(`/events/${id}/nps/send`, { method: "POST" });
      toast.success(`NPS enviado para ${r.sent} pessoas`);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setSending(false); }
  }

  async function sendTest(testId: string, onlyCheckedIn: boolean) {
    setSending(true);
    try {
      const r = await api<any>(`/events/${id}/send-test`, { method: "POST", body: { testTemplateId: testId, onlyCheckedIn } });
      toast.success(`Teste enviado para ${r.sent}/${r.total}`);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setSending(false); }
  }

  async function sendMeeting(onlyCheckedIn: boolean) {
    setSending(true);
    try {
      const r = await api<any>(`/events/${id}/send-meeting`, { method: "POST", body: { onlyCheckedIn } });
      toast.success(`Convite enviado para ${r.sent}/${r.total}`);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setSending(false); }
  }

  async function sendAnalysis() {
    setSending(true);
    try {
      const r = await api<any>(`/events/${id}/send-company-analysis`, { method: "POST" });
      toast.success(`Análise IA enviada para ${r.sent} empresas (${r.eligible} elegíveis)`);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setSending(false); }
  }

  async function broadcast() {
    if (!bForm.subject || !bForm.message) { toast.error("Preencha assunto e mensagem"); return; }
    setSending(true);
    try {
      const r = await api<any>(`/events/${id}/broadcast`, { method: "POST", body: bForm });
      toast.success(`${r.sent}/${r.total} enviados`);
      setBroadcastOpen(false);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setSending(false); }
  }

  if (!event || !regs) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const checkedIn = regs.filter((r) => r.status === "checked_in").length;
  const conversionRate = regs.length ? Math.round((checkedIn / regs.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild><Link to="/app/events"><ArrowLeft className="h-4 w-4 mr-2" />Eventos</Link></Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShareOpen(true)}><QrCode className="h-4 w-4 mr-2" />Compartilhar / QR</Button>
          <Button variant="outline" onClick={() => setQuizOpen(true)}><Zap className="h-4 w-4 mr-2" />Quiz PVP</Button>
          <Button onClick={() => setScannerOpen(true)} className="bg-gradient-primary hover:opacity-90 shadow-glow">
            <ScanLine className="h-4 w-4 mr-2" />Check-in
          </Button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-gradient-hero border border-border/60 p-8">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="relative space-y-2">
          <Badge variant="outline" className="border-accent/40 bg-accent/10">
            {event.modality === "virtual" ? "Virtual" : event.modality === "hybrid" ? "Híbrido" : "Presencial"}
          </Badge>
          <h1 className="text-4xl font-display">{event.name}</h1>
          {event.startsAt && <p className="text-muted-foreground">{new Date(event.startsAt).toLocaleString("pt-BR")} {event.location && `• ${event.location}`}</p>}
        </div>
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <Stat label="Inscritos" value={regs.length} icon={Users} />
          <Stat label="Presentes" value={checkedIn} icon={UserCheck} accent="text-emerald-400" />
          <Stat label="Comparecimento" value={`${conversionRate}%`} icon={BarChart3} accent="text-violet-400" />
          <Stat label="NPS" value={nps?.nps ?? "—"} icon={Sparkles} accent="text-amber-400" />
        </div>
      </div>

      <Tabs defaultValue="registrations">
        <TabsList className="bg-muted/30">
          <TabsTrigger value="registrations"><Users className="h-3 w-3 mr-1" />Inscritos</TabsTrigger>
          <TabsTrigger value="actions"><Send className="h-3 w-3 mr-1" />Ações</TabsTrigger>
          <TabsTrigger value="nps"><BarChart3 className="h-3 w-3 mr-1" />NPS</TabsTrigger>
          <TabsTrigger value="coupons"><Ticket className="h-3 w-3 mr-1" />Cupons</TabsTrigger>
          <TabsTrigger value="history"><ClipboardList className="h-3 w-3 mr-1" />Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="registrations" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">{regs.length} inscritos</div>
            <Button size="sm" variant="outline" onClick={() => setBroadcastOpen(true)}><Megaphone className="h-3 w-3 mr-2" />Mensagem em massa</Button>
          </div>
          <Card className="glass-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Inscrito</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-12">Nenhum inscrito ainda.</TableCell></TableRow>}
                  {regs.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.email} {r.phone && `• ${r.phone}`}</div>
                      </TableCell>
                      <TableCell className="text-sm">{r.company || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={STATUS_COLORS[r.status]}>{STATUS_LABELS[r.status]}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Select value={r.status} onValueChange={(v) => setStatus(r.id, v)}>
                          <SelectTrigger className="w-32 h-8 inline-flex"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {!r.leadId && <Button size="sm" variant="ghost" onClick={() => convert(r.id)} title="Converter em lead"><UserCheck className="h-3 w-3" /></Button>}
                        <Button size="sm" variant="ghost" onClick={() => removeReg(r.id)} className="text-rose-400"><Trash2 className="h-3 w-3" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <ActionCard
              icon={BarChart3}
              title="Enviar NPS agora"
              description="Pesquisa de satisfação para quem fez check-in. (Também envia automaticamente após o evento se ativado.)"
              cta="Enviar NPS"
              onClick={sendNps}
              disabled={sending}
            />
            <ActionCard
              icon={Calendar}
              title="Agendar reunião 1:1"
              description="Envia link para inscritos agendarem uma sessão individual com você."
              cta="Enviar convites"
              onClick={() => sendMeeting(true)}
              disabled={sending}
            />
            <ActionCard
              icon={Building2}
              title="Análise IA da empresa"
              description="Para cada inscrito que informou empresa, IA gera um mini-dossiê estratégico e envia por email."
              cta="Disparar análises"
              onClick={sendAnalysis}
              disabled={sending}
            />
            <Card className="glass-card">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-3"><ClipboardList className="h-5 w-5 text-primary" /><div className="font-display font-semibold">Enviar teste/diagnóstico</div></div>
                <p className="text-xs text-muted-foreground">Escolha um teste da biblioteca e dispare para os inscritos.</p>
                <Select onValueChange={(v) => sendTest(v, true)}>
                  <SelectTrigger><SelectValue placeholder="Escolher teste..." /></SelectTrigger>
                  <SelectContent>
                    {tests.length === 0 && <div className="p-2 text-xs text-muted-foreground">Nenhum teste cadastrado.</div>}
                    {tests.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="nps" className="space-y-4">
          {nps && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Score NPS" value={nps.nps} icon={BarChart3} accent={nps.nps >= 50 ? "text-emerald-400" : nps.nps >= 0 ? "text-amber-400" : "text-rose-400"} />
                <Stat label="Promotores" value={nps.promoters} icon={Sparkles} accent="text-emerald-400" />
                <Stat label="Neutros" value={nps.passives} icon={Users} accent="text-amber-400" />
                <Stat label="Detratores" value={nps.detractors} icon={Users} accent="text-rose-400" />
              </div>
              <Card className="glass-card">
                <CardContent className="p-5 space-y-3">
                  <div className="text-sm text-muted-foreground">{nps.answered} respostas de {nps.sent} envios</div>
                  {nps.comments.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8 text-sm">Sem comentários ainda.</div>
                  ) : (
                    <div className="space-y-2">
                      {nps.comments.map((c: any, i: number) => (
                        <div key={i} className="bg-muted/30 rounded-lg p-3 text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <b>{c.name}</b>
                            <Badge variant="outline" className={c.score >= 9 ? "text-emerald-400 border-emerald-500/40" : c.score <= 6 ? "text-rose-400 border-rose-500/40" : "text-amber-400 border-amber-500/40"}>Nota {c.score}</Badge>
                          </div>
                          <div className="text-muted-foreground italic">"{c.comment}"</div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="coupons" className="space-y-2">
          {event && <EventCouponsSection eventId={event.id} />}
        </TabsContent>

        <TabsContent value="history" className="space-y-2">
          {actions.length === 0 ? (
            <Card className="glass-card"><CardContent className="py-12 text-center text-muted-foreground text-sm">Nenhuma ação registrada.</CardContent></Card>
          ) : actions.map((a) => (
            <Card key={a.id} className="glass-card">
              <CardContent className="p-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium capitalize">{a.type.replace(/_/g, " ")}</div>
                  <div className="text-xs text-muted-foreground">{a.message || a.channel}</div>
                </div>
                <div className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString("pt-BR")}</div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Scanner */}
      <CheckinScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onCheckedIn={load} />

      {/* Quiz PVP */}
      <StartQuizDialog open={quizOpen} onClose={() => setQuizOpen(false)} eventId={id} />

      {/* Compartilhar */}
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} url={publicSignupUrl()} eventName={event.name} />

      {/* Broadcast */}
      <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
        <DialogContent className="glass-card max-w-lg">
          <DialogHeader>
            <DialogTitle>Mensagem em massa</DialogTitle>
            <DialogDescription>Use {`{{nome}}`} e {`{{evento}}`} como variáveis.</DialogDescription>
          </DialogHeader>
           <div className="space-y-4">
             {bForm.channels.includes("whatsapp") && (
               <div className="space-y-1">
                 <Label className="text-xs">Conexão WhatsApp para este envio</Label>
                 <Select value={bForm.whatsappInstanceId} onValueChange={(v) => setBForm({ ...bForm, whatsappInstanceId: v })}>
                    <SelectTrigger><SelectValue placeholder="Usar conexão padrão..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Usar conexão padrão do sistema</SelectItem>
                      {instances.filter(i => i.status === 'connected').map(inst => (
                        <SelectItem key={inst.id} value={inst.id}>{inst.name} (+{inst.phoneNumber})</SelectItem>
                      ))}
                      {instances.filter(i => i.status === 'connected').length === 0 && (
                        <div className="p-2 text-[10px] text-center text-muted-foreground">Nenhuma conexão ativa</div>
                      )}
                    </SelectContent>
                 </Select>
               </div>
             )}
             <div><Label>Assunto (email)</Label><Input value={bForm.subject} onChange={(e) => setBForm({ ...bForm, subject: e.target.value })} /></div>
             <div><Label>Mensagem</Label><Textarea rows={5} value={bForm.message} onChange={(e) => setBForm({ ...bForm, message: e.target.value })} /></div>
             <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={bForm.channels.includes("email")} onCheckedChange={(v) => setBForm({ ...bForm, channels: v ? [...bForm.channels, "email"] : bForm.channels.filter(c => c !== "email") })} />Email</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={bForm.channels.includes("whatsapp")} onCheckedChange={(v) => setBForm({ ...bForm, channels: v ? [...bForm.channels, "whatsapp"] : bForm.channels.filter(c => c !== "whatsapp") })} />WhatsApp</label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={broadcast} disabled={sending} className="bg-gradient-primary hover:opacity-90">
              {sending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, icon: Icon, accent = "text-foreground" }: any) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span><Icon className={`h-4 w-4 ${accent}`} /></div>
      <div className={`text-3xl font-display font-bold mt-1 ${accent}`}>{value}</div>
    </div>
  );
}

function ActionCard({ icon: Icon, title, description, cta, onClick, disabled }: any) {
  return (
    <Card className="glass-card glass-card-hover">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-3"><Icon className="h-5 w-5 text-primary" /><div className="font-display font-semibold">{title}</div></div>
        <p className="text-xs text-muted-foreground">{description}</p>
        <Button size="sm" onClick={onClick} disabled={disabled} className="w-full">{cta}</Button>
      </CardContent>
    </Card>
  );
}

function ShareDialog({ open, onClose, url, eventName }: any) {
  const [qrUrl, setQrUrl] = useState<string>("");
  useEffect(() => {
    if (open && url) {
      QRCode.toDataURL(url, { width: 400, margin: 2 }).then(setQrUrl);
    }
  }, [open, url]);
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-card max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar evento</DialogTitle>
          <DialogDescription>QR e link público de inscrição</DialogDescription>
        </DialogHeader>
        {qrUrl && <img src={qrUrl} alt="QR" className="mx-auto rounded-2xl bg-white p-4" />}
        <div className="bg-muted/30 rounded-lg p-2 flex items-center gap-2">
          <code className="text-xs flex-1 truncate">{url}</code>
          <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copiado"); }}><Copy className="h-3 w-3" /></Button>
        </div>
        <Button asChild variant="outline">
          <a href={qrUrl} download={`qr-${eventName}.png`}>Baixar QR</a>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
