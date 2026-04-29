import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Plus, CalendarDays, MapPin, Users, Sparkles, QrCode, Copy, Trash2, Video, ExternalLink, Settings } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

interface Event {
  id: string; name: string; location?: string; virtualUrl?: string; modality: string;
  startsAt?: string; slug: string; isActive: boolean;
  registrationsCount: number; checkedInCount: number; leadsCount: number; convertedCount: number;
}

interface PaymentProvider {
  id: string; type: string; label?: string; environment?: string;
}

export default function EventsPage() {
  const [items, setItems] = useState<Event[] | null>(null);
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
   name: "", description: "", location: "", virtualUrl: "", modality: "physical",
   startsAt: "", endsAt: "", capacity: "", npsEnabled: true, npsDelayHours: 2,
   isPaid: false, paymentProviderId: "",
   automationEnabled: true, automationTemplateId: "",
  });
  const [qrSlug, setQrSlug] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  async function load() {
    try {
      const evs = await api<Event[]>("/events");
      setItems(evs);
    } catch (e: any) { toast.error(e.message); }
  }
  async function loadProviders() {
    try {
      const p = await api<PaymentProvider[]>("/event-payments/providers");
      setProviders(p);
    } catch {}
  }
  useEffect(() => { load(); loadProviders(); }, []);

  async function create() {
    setSaving(true);
    try {
      const payload = {
        ...form,
        capacity: form.capacity ? parseInt(form.capacity) : undefined,
      };
      await api("/events", { method: "POST", body: payload });
      toast.success("Evento criado");
      setOpen(false);
       setForm({ 
         name: "", description: "", location: "", virtualUrl: "", modality: "physical", 
         startsAt: "", endsAt: "", capacity: "", npsEnabled: true, npsDelayHours: 2, 
         isPaid: false, paymentProviderId: "",
         automationEnabled: true, automationTemplateId: "" 
       });
       load();
     } catch (e: any) { toast.error(e.message); }
     finally { setSaving(false); }
   }

   const [templates, setTemplates] = useState<any[]>([]);
   async function loadTemplates() {
     try {
       const items = await api<any[]>("/messages/templates/all");
       setTemplates(items.filter(t => t.channel === 'whatsapp' || t.channel === 'email'));
     } catch {}
   }
   useEffect(() => { loadTemplates(); }, []);

  async function remove(id: string) {
    if (!confirm("Excluir evento e todos os inscritos?")) return;
    await api(`/events/${id}`, { method: "DELETE" });
    load();
  }

  function publicLink(slug: string) {
    return `${window.location.origin}/e/${slug}`;
  }

  async function showQr(slug: string) {
    setQrSlug(slug);
    const url = publicLink(slug);
    setQrDataUrl(await QRCode.toDataURL(url, { width: 400, margin: 2 }));
  }

  if (!items) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const totals = {
    events: items.length,
    regs: items.reduce((s, e) => s + e.registrationsCount, 0),
    presents: items.reduce((s, e) => s + e.checkedInCount, 0),
    converted: items.reduce((s, e) => s + e.convertedCount, 0),
  };

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-hero border border-border/60 p-8 md:p-10">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <Badge variant="outline" className="mb-3 border-accent/40 bg-accent/10 text-accent">
              <CalendarDays className="h-3 w-3 mr-1" /> Eventos
            </Badge>
            <h1 className="text-4xl md:text-5xl font-display tracking-tight">Eventos & <span className="text-gradient">Captação</span></h1>
            <p className="text-muted-foreground mt-2 max-w-lg">Inscrições, QR de check-in, NPS, ações pós-evento — tudo em um lugar.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90 shadow-glow"><Plus className="mr-2 h-4 w-4" />Novo evento</Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-border/60 max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display">Novo evento</DialogTitle>
                <DialogDescription>Workshop, palestra, feira, masterclass…</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Descrição</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Modalidade</Label>
                    <Select value={form.modality} onValueChange={(v) => setForm({ ...form, modality: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="physical">Presencial</SelectItem>
                        <SelectItem value="virtual">Virtual</SelectItem>
                        <SelectItem value="hybrid">Híbrido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Capacidade</Label><Input type="number" placeholder="Sem limite" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></div>
                </div>
                {(form.modality === "physical" || form.modality === "hybrid") && (
                  <div><Label>Local</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Endereço, sala..." /></div>
                )}
                {(form.modality === "virtual" || form.modality === "hybrid") && (
                  <div><Label>URL da sala virtual</Label><Input value={form.virtualUrl} onChange={(e) => setForm({ ...form, virtualUrl: e.target.value })} placeholder="https://meet.google.com/..." /></div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Início</Label><Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></div>
                  <div><Label>Fim</Label><Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.npsEnabled} onChange={(e) => setForm({ ...form, npsEnabled: e.target.checked })} />
                    Enviar NPS automaticamente após o evento
                  </label>
                  {form.npsEnabled && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pl-6">
                      <span>Disparar</span>
                      <Input type="number" className="w-16 h-7" value={form.npsDelayHours} onChange={(e) => setForm({ ...form, npsDelayHours: parseInt(e.target.value) || 2 })} />
                      <span>horas após o término</span>
                    </div>
                  )}
                </div>
                 <div className="bg-muted/30 rounded-lg p-3 space-y-3">
                   <label className="flex items-center gap-2 text-sm cursor-pointer">
                     <input type="checkbox" checked={form.automationEnabled} onChange={(e) => setForm({ ...form, automationEnabled: e.target.checked })} />
                     Automação de Boas-vindas (WhatsApp/Email)
                   </label>
                   {form.automationEnabled && (
                     <div className="space-y-2 pl-6">
                       <Label className="text-xs">Escolha o Template</Label>
                       <Select value={form.automationTemplateId} onValueChange={(v) => setForm({ ...form, automationTemplateId: v })}>
                         <SelectTrigger><SelectValue placeholder="Template de confirmação..." /></SelectTrigger>
                         <SelectContent>
                           {templates.map((t) => (
                             <SelectItem key={t.id} value={t.id}>
                               [{t.channel.toUpperCase()}] {t.name}
                             </SelectItem>
                           ))}
                           {templates.length === 0 && <div className="p-2 text-xs text-center text-muted-foreground">Nenhum template disponível</div>}
                         </SelectContent>
                       </Select>
                       <p className="text-[10px] text-muted-foreground">Enviado automaticamente após a inscrição.</p>
                     </div>
                   )}
                 </div>

                 <div className="bg-muted/30 rounded-lg p-3 space-y-3">
                   <label className="flex items-center gap-2 text-sm cursor-pointer">
                     <input type="checkbox" checked={form.isPaid} onChange={(e) => setForm({ ...form, isPaid: e.target.checked })} />
                     Evento pago (cobrar inscrição)
                   </label>
                   {form.isPaid && (
                     <div className="space-y-2 pl-6">
                       <Label className="text-xs">Provedor de pagamento</Label>
                       {providers.length === 0 ? (
                         <p className="text-xs text-muted-foreground">
                           Nenhum provedor configurado. Vá em <Link to="/app/integrations" className="text-primary underline">Integrações</Link> para adicionar Asaas, Mercado Pago, Stripe ou link manual.
                         </p>
                       ) : (
                         <Select value={form.paymentProviderId} onValueChange={(v) => setForm({ ...form, paymentProviderId: v })}>
                           <SelectTrigger><SelectValue placeholder="Escolher provedor..." /></SelectTrigger>
                           <SelectContent>
                             {providers.map((p) => (
                               <SelectItem key={p.id} value={p.id}>
                                 {p.label || p.type} {p.environment === "sandbox" && "(sandbox)"}
                               </SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       )}
                       <p className="text-[10px] text-muted-foreground">Após criar, configure os lotes na página do evento.</p>
                     </div>
                   )}
                 </div>
              </div>
              <DialogFooter>
                <Button onClick={create} disabled={saving || !form.name} className="bg-gradient-primary hover:opacity-90">
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Criar evento
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
          <Stat label="Eventos" value={totals.events} icon={CalendarDays} />
          <Stat label="Inscritos" value={totals.regs} icon={Users} accent="text-sky-400" />
          <Stat label="Presentes" value={totals.presents} icon={Sparkles} accent="text-emerald-400" />
          <Stat label="Mentorados" value={totals.converted} icon={Sparkles} accent="text-violet-400" />
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="glass-card border-dashed"><CardContent className="py-16 text-center text-muted-foreground">Nenhum evento ainda. Crie o primeiro!</CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((e) => {
            const url = publicLink(e.slug);
            const attendance = e.registrationsCount ? Math.round((e.checkedInCount / e.registrationsCount) * 100) : 0;
            return (
              <Card key={e.id} className="glass-card glass-card-hover border-border/60 group">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <Link to={`/app/events/${e.id}`} className="font-display font-semibold text-base hover:text-primary truncate block">{e.name}</Link>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">
                          {e.modality === "virtual" ? <><Video className="h-2.5 w-2.5 mr-1" />Virtual</> :
                           e.modality === "hybrid" ? <><Video className="h-2.5 w-2.5 mr-1" />Híbrido</> :
                           <><MapPin className="h-2.5 w-2.5 mr-1" />Presencial</>}
                        </Badge>
                        {e.location && <span className="text-xs text-muted-foreground truncate">{e.location}</span>}
                      </div>
                      {e.startsAt && <div className="text-xs text-muted-foreground mt-1">{new Date(e.startsAt).toLocaleString("pt-BR")}</div>}
                    </div>
                    <Badge variant={e.isActive ? "default" : "outline"} className={e.isActive ? "bg-gradient-primary border-0" : ""}>{e.isActive ? "Ativo" : "Inativo"}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-muted/30 rounded-lg p-2"><div className="text-base font-bold">{e.registrationsCount}</div><div className="text-muted-foreground text-[10px]">Inscritos</div></div>
                    <div className="bg-muted/30 rounded-lg p-2"><div className="text-base font-bold text-emerald-400">{e.checkedInCount}</div><div className="text-muted-foreground text-[10px]">Presentes</div></div>
                    <div className="bg-muted/30 rounded-lg p-2"><div className="text-base font-bold text-violet-400">{attendance}%</div><div className="text-muted-foreground text-[10px]">Compareceram</div></div>
                  </div>
                  <div className="flex items-center gap-1 text-xs bg-muted/20 rounded-lg p-2 border border-border/40">
                    <QrCode className="h-3 w-3 text-muted-foreground shrink-0" />
                    <code className="truncate flex-1 text-[10px]">{url}</code>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copiado"); }}><Copy className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => showQr(e.slug)}><QrCode className="h-3 w-3" /></Button>
                  </div>
                  <div className="flex justify-between gap-2 pt-1 border-t border-border/40">
                    <Button size="sm" variant="ghost" asChild><Link to={`/app/events/${e.id}`}><Settings className="h-3 w-3 mr-1" />Gerenciar</Link></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(e.id)} className="text-rose-400 hover:bg-rose-500/10"><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!qrSlug} onOpenChange={() => setQrSlug(null)}>
        <DialogContent className="glass-card max-w-sm">
          <DialogHeader><DialogTitle>QR de inscrição</DialogTitle></DialogHeader>
          {qrDataUrl && <img src={qrDataUrl} alt="QR" className="mx-auto rounded-2xl bg-white p-4" />}
          <Button asChild variant="outline">
            <a href={qrDataUrl} download={`qr-${qrSlug}.png`}>Baixar imagem</a>
          </Button>
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
