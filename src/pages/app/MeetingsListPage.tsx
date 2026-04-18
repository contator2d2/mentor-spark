import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar, Plus, Search, Mic, ExternalLink, FileAudio, AlertCircle, CheckCircle2, Loader2, Play,
  Video, Sparkles, Clock, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

type Meeting = {
  id: string;
  title: string;
  scheduledAt: string;
  durationMinutes?: number;
  platform: string;
  meetingUrl?: string;
  status: string;
  leadId?: string;
  captureEnabled: boolean;
};

const STATUS_META: Record<string, { label: string; cls: string; dot: string; icon?: any }> = {
  scheduled:   { label: "Agendada",     cls: "bg-blue-500/10 text-blue-400 border-blue-500/30",       dot: "bg-blue-400" },
  confirmed:   { label: "Confirmada",   cls: "bg-blue-500/10 text-blue-400 border-blue-500/30",       dot: "bg-blue-400" },
  ready:       { label: "Pronta",       cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400" },
  in_progress: { label: "Em andamento", cls: "bg-amber-500/10 text-amber-400 border-amber-500/30",    dot: "bg-amber-400 animate-pulse", icon: Mic },
  ended:       { label: "Encerrada",    cls: "bg-muted text-muted-foreground border-border",          dot: "bg-muted-foreground" },
  processing:  { label: "Processando",  cls: "bg-violet-500/10 text-violet-400 border-violet-500/30", dot: "bg-violet-400 animate-pulse", icon: Loader2 },
  completed:   { label: "Concluída",    cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400", icon: CheckCircle2 },
  cancelled:   { label: "Cancelada",    cls: "bg-muted text-muted-foreground border-border",          dot: "bg-muted-foreground" },
  failed:      { label: "Falha",        cls: "bg-destructive/10 text-destructive border-destructive/30", dot: "bg-destructive", icon: AlertCircle },
};

const PLATFORM_META: Record<string, { label: string; color: string }> = {
  google_meet: { label: "Google Meet", color: "from-emerald-500/20 to-blue-500/20" },
  zoom:        { label: "Zoom",        color: "from-blue-500/20 to-cyan-500/20" },
  teams:       { label: "Teams",       color: "from-violet-500/20 to-blue-500/20" },
  external:    { label: "Link externo",color: "from-slate-500/20 to-zinc-500/20" },
  in_person:   { label: "Presencial",  color: "from-amber-500/20 to-orange-500/20" },
};

export default function MeetingsListPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    try { setMeetings(await api<Meeting[]>("/meetings")); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const filtered = meetings.filter((m) => {
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    if (search && !m.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: meetings.length,
    upcoming: meetings.filter((m) => ["scheduled", "confirmed", "ready"].includes(m.status) && new Date(m.scheduledAt) > new Date()).length,
    processing: meetings.filter((m) => ["in_progress", "processing"].includes(m.status)).length,
    completed: meetings.filter((m) => m.status === "completed").length,
  };

  return (
    <div className="space-y-8">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-hero border border-border/60 p-8 md:p-10">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-secondary/15 blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="animate-fade-in">
            <Badge variant="outline" className="mb-3 border-primary/40 bg-primary/10 text-primary">
              <Video className="h-3 w-3 mr-1" /> Teleatendimento inteligente
            </Badge>
            <h1 className="text-4xl md:text-5xl font-display tracking-tight text-balance">
              Suas <span className="text-gradient">reuniões</span>
            </h1>
            <p className="text-muted-foreground mt-2 max-w-lg">
              Agende, prepare e capture sessões com transcrição e resumo IA automáticos.
            </p>
          </div>
          <CreateMeetingDialog open={open} setOpen={setOpen} onCreated={load} />
        </div>

        {/* Mini stats */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
          {[
            { label: "Total", value: stats.total, icon: Video,        glow: "text-foreground" },
            { label: "Próximas", value: stats.upcoming, icon: Clock,     glow: "text-blue-400" },
            { label: "Processando", value: stats.processing, icon: Loader2, glow: "text-violet-400", spin: true },
            { label: "Concluídas", value: stats.completed, icon: Sparkles, glow: "text-emerald-400" },
          ].map((s, i) => (
            <div
              key={s.label}
              className={`glass-card rounded-2xl p-4 animate-fade-in anim-delay-${(i + 1) * 100}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</span>
                <s.icon className={`h-4 w-4 ${s.glow} ${s.spin && stats.processing > 0 ? "animate-spin" : ""}`} />
              </div>
              <div className={`text-3xl font-display font-bold mt-1 ${s.glow}`}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex flex-col md:flex-row gap-3 animate-fade-in">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card/50 border-border/60 backdrop-blur"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="md:w-56 bg-card/50 border-border/60"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(STATUS_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* LIST */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="glass-card border-dashed">
          <CardContent className="py-16 text-center">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Video className="h-8 w-8 text-primary" />
            </div>
            <p className="text-muted-foreground">
              Nenhuma reunião por aqui. Clique em <strong className="text-foreground">Nova reunião</strong> para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((m, i) => {
            const meta = STATUS_META[m.status] || STATUS_META.scheduled;
            const platform = PLATFORM_META[m.platform] || { label: m.platform, color: "from-muted to-muted" };
            const Icon = meta.icon;
            const isPast = new Date(m.scheduledAt) < new Date();

            return (
              <Card
                key={m.id}
                className={`glass-card glass-card-hover border-border/60 animate-fade-in anim-delay-${Math.min((i + 1) * 100, 600)} group cursor-pointer overflow-hidden`}
                onClick={() => navigate(`/app/meetings/${m.id}`)}
              >
                <CardContent className="p-0 flex flex-col md:flex-row">
                  {/* Platform colored stripe */}
                  <div className={`md:w-1.5 h-1.5 md:h-auto bg-gradient-to-b ${platform.color}`} />

                  <div className="flex-1 p-5 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${meta.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                          {Icon && <Icon className={`h-3 w-3 ${m.status === "processing" ? "animate-spin" : ""}`} />}
                          {meta.label}
                        </span>
                        <Badge variant="outline" className="text-xs border-border/60 bg-card/40">
                          {platform.label}
                        </Badge>
                        {m.captureEnabled && (
                          <Badge variant="outline" className="text-xs border-violet-500/30 bg-violet-500/10 text-violet-400">
                            <Mic className="h-3 w-3 mr-1" />Captura IA
                          </Badge>
                        )}
                      </div>

                      <div className="font-display text-lg font-semibold truncate group-hover:text-gradient transition-all">
                        {m.title}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1.5">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(m.scheduledAt).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" })}
                        </span>
                        {m.durationMinutes && (
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {m.durationMinutes}min
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {m.meetingUrl && !isPast && (
                        <Button variant="outline" size="sm" asChild className="border-border/60">
                          <a href={m.meetingUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4 mr-1" />Abrir
                          </a>
                        </Button>
                      )}
                      {!isPast && m.captureEnabled && !["completed", "ended"].includes(m.status) && (
                        <Button
                          size="sm"
                          className="bg-gradient-primary hover:opacity-90 shadow-glow"
                          onClick={() => navigate(`/app/meetings/${m.id}/prepare`)}
                        >
                          <Play className="h-4 w-4 mr-1" />Preparar
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/app/meetings/${m.id}`)}>
                        <FileAudio className="h-4 w-4 mr-1" />
                        Detalhes
                        <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                      </Button>
                    </div>
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

function CreateMeetingDialog({ open, setOpen, onCreated }: { open: boolean; setOpen: (v: boolean) => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    title: "",
    meetingType: "discovery",
    scheduledAt: "",
    durationMinutes: 60,
    platform: "google_meet",
    meetingUrl: "",
    leadId: "",
    captureEnabled: true,
    screenShareExpected: false,
    preMeetingNotes: "",
  });
  const [leads, setLeads] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) api<any[]>("/leads").then((l) => setLeads(l.map((x) => ({ id: x.id, name: x.name })))).catch(() => {});
  }, [open]);

  async function submit() {
    if (!form.title || !form.scheduledAt) {
      toast.error("Título e data/hora são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const payload: any = { ...form, scheduledAt: new Date(form.scheduledAt).toISOString() };
      if (!payload.leadId) delete payload.leadId;
      await api("/meetings", { method: "POST", body: payload });
      toast.success("Reunião criada");
      setOpen(false);
      onCreated();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary hover:opacity-90 shadow-glow">
          <Plus className="h-4 w-4 mr-1" />Nova reunião
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto glass-card border-border/60">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">Nova reunião</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Discovery com..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.meetingType} onValueChange={(v) => setForm({ ...form, meetingType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="discovery">Discovery</SelectItem>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                  <SelectItem value="mentoria">Sessão de mentoria</SelectItem>
                  <SelectItem value="closing">Fechamento</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Plataforma</Label>
              <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="google_meet">Google Meet</SelectItem>
                  <SelectItem value="zoom">Zoom</SelectItem>
                  <SelectItem value="teams">Microsoft Teams</SelectItem>
                  <SelectItem value="external">Link externo</SelectItem>
                  <SelectItem value="in_person">Presencial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data e hora *</Label>
              <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
            </div>
            <div>
              <Label>Duração (min)</Label>
              <Input type="number" min={5} max={600} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: +e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Link da reunião</Label>
            <Input value={form.meetingUrl} onChange={(e) => setForm({ ...form, meetingUrl: e.target.value })} placeholder="https://meet.google.com/..." />
          </div>
          <div>
            <Label>Lead vinculado (opcional)</Label>
            <Select value={form.leadId || "none"} onValueChange={(v) => setForm({ ...form, leadId: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Observações prévias</Label>
            <Textarea rows={3} value={form.preMeetingNotes} onChange={(e) => setForm({ ...form, preMeetingNotes: e.target.value })} />
          </div>
          <div className="flex items-center gap-6 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.captureEnabled} onChange={(e) => setForm({ ...form, captureEnabled: e.target.checked })} />
              Captura de áudio habilitada
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.screenShareExpected} onChange={(e) => setForm({ ...form, screenShareExpected: e.target.checked })} />
              Tela compartilhada
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving} className="bg-gradient-primary hover:opacity-90">
            {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Criando…</> : "Criar reunião"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
