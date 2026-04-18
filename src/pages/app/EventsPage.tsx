import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Plus, CalendarDays, MapPin, Users, Sparkles, QrCode, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Event {
  id: string; name: string; location?: string; startsAt?: string; slug: string;
  isActive: boolean; leadsCount: number; convertedCount: number;
}

export default function EventsPage() {
  const [items, setItems] = useState<Event[] | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", location: "", startsAt: "" });
  const [me, setMe] = useState<any>(null);

  async function load() {
    try {
      const [evs, user] = await Promise.all([api<Event[]>("/events"), api<any>("/me")]);
      setItems(evs); setMe(user);
    } catch (e: any) { toast.error(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function create() {
    setSaving(true);
    try {
      await api("/events", { method: "POST", body: form });
      toast.success("Evento criado");
      setOpen(false); setForm({ name: "", location: "", startsAt: "" }); load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm("Excluir evento?")) return;
    await api(`/events/${id}`, { method: "DELETE" });
    load();
  }

  function publicLink(slug: string) {
    const base = window.location.origin;
    return `${base}/c/${me?.slug}?event=${slug}`;
  }

  if (!items) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const totals = {
    events: items.length,
    leads: items.reduce((s, e) => s + e.leadsCount, 0),
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
              <CalendarDays className="h-3 w-3 mr-1" /> Captação
            </Badge>
            <h1 className="text-4xl md:text-5xl font-display tracking-tight">Eventos de <span className="text-gradient">captação</span></h1>
            <p className="text-muted-foreground mt-2 max-w-lg">Cada evento gera link/QR próprio para rastrear de onde vieram seus leads.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90 shadow-glow"><Plus className="mr-2 h-4 w-4" />Novo evento</Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-border/60 max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display">Novo evento</DialogTitle>
                <DialogDescription>Workshop, palestra, feira… cada um terá seu link próprio.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Local</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
                <div><Label>Data</Label><Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button onClick={create} disabled={saving || !form.name} className="bg-gradient-primary hover:opacity-90">
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Criar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="relative grid grid-cols-3 gap-3 mt-8">
          <Stat label="Eventos" value={totals.events} icon={CalendarDays} />
          <Stat label="Leads gerados" value={totals.leads} icon={Users} accent="text-amber-400" />
          <Stat label="Mentorados" value={totals.converted} icon={Sparkles} accent="text-emerald-400" />
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="glass-card border-dashed"><CardContent className="py-16 text-center text-muted-foreground">Nenhum evento ainda. Crie o primeiro!</CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((e) => {
            const url = publicLink(e.slug);
            const conversion = e.leadsCount ? Math.round((e.convertedCount / e.leadsCount) * 100) : 0;
            return (
              <Card key={e.id} className="glass-card glass-card-hover border-border/60 group">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="font-display font-semibold text-base truncate">{e.name}</div>
                      {e.location && <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" /> {e.location}</div>}
                      {e.startsAt && <div className="text-xs text-muted-foreground mt-0.5">{new Date(e.startsAt).toLocaleString("pt-BR")}</div>}
                    </div>
                    <Badge variant={e.isActive ? "default" : "outline"} className={e.isActive ? "bg-gradient-primary border-0" : ""}>{e.isActive ? "Ativo" : "Inativo"}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-muted/30 rounded-lg p-2"><div className="text-base font-bold">{e.leadsCount}</div><div className="text-muted-foreground text-[10px]">Leads</div></div>
                    <div className="bg-muted/30 rounded-lg p-2"><div className="text-base font-bold text-emerald-400">{e.convertedCount}</div><div className="text-muted-foreground text-[10px]">Mentorados</div></div>
                    <div className="bg-muted/30 rounded-lg p-2"><div className="text-base font-bold text-violet-400">{conversion}%</div><div className="text-muted-foreground text-[10px]">Conversão</div></div>
                  </div>
                  <div className="flex items-center gap-1 text-xs bg-muted/20 rounded-lg p-2 border border-border/40">
                    <QrCode className="h-3 w-3 text-muted-foreground shrink-0" />
                    <code className="truncate flex-1 text-[10px]">{url}</code>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copiado"); }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex justify-end pt-1 border-t border-border/40">
                    <Button size="sm" variant="ghost" onClick={() => remove(e.id)} className="text-rose-400 hover:bg-rose-500/10"><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
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
