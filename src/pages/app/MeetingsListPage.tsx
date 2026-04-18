import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Plus, Search, Mic, ExternalLink, FileAudio, AlertCircle, CheckCircle2, Loader2, Play } from "lucide-react";
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

const STATUS_META: Record<string, { label: string; cls: string; icon?: any }> = {
  scheduled:   { label: "Agendada",     cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  confirmed:   { label: "Confirmada",   cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  ready:       { label: "Pronta",       cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  in_progress: { label: "Em andamento", cls: "bg-amber-500/10 text-amber-700 border-amber-500/20", icon: Mic },
  ended:       { label: "Encerrada",    cls: "bg-muted text-foreground" },
  processing:  { label: "Processando",  cls: "bg-violet-500/10 text-violet-600 border-violet-500/20", icon: Loader2 },
  completed:   { label: "Concluída",    cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
  cancelled:   { label: "Cancelada",    cls: "bg-muted text-muted-foreground" },
  failed:      { label: "Falha",        cls: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertCircle },
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
    try {
      const data = await api<Meeting[]>("/meetings");
      setMeetings(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const filtered = meetings.filter((m) => {
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    if (search && !m.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display tracking-tight">Reuniões</h1>
          <p className="text-muted-foreground mt-1">Agende, prepare e capture reuniões com transcrição e resumo IA.</p>
        </div>
        <CreateMeetingDialog open={open} setOpen={setOpen} onCreated={load} />
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por título…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="md:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(STATUS_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando…</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Nenhuma reunião. Clique em <strong>Nova reunião</strong> para começar.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((m) => {
            const meta = STATUS_META[m.status] || STATUS_META.scheduled;
            const Icon = meta.icon;
            return (
              <Card key={m.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={meta.cls}>
                        {Icon && <Icon className={`h-3 w-3 mr-1 ${m.status === "processing" ? "animate-spin" : ""}`} />}
                        {meta.label}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">{platformLabel(m.platform)}</Badge>
                      {m.captureEnabled && <Badge variant="outline" className="text-xs"><Mic className="h-3 w-3 mr-1" />Captura</Badge>}
                    </div>
                    <div className="font-medium truncate">{m.title}</div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      <Calendar className="inline h-3.5 w-3.5 mr-1" />
                      {new Date(m.scheduledAt).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" })}
                      {m.durationMinutes ? ` · ${m.durationMinutes}min` : ""}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {m.meetingUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={m.meetingUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-1" />Abrir</a>
                      </Button>
                    )}
                    <Button size="sm" onClick={() => navigate(`/app/meetings/${m.id}/prepare`)}>
                      <Play className="h-4 w-4 mr-1" />Preparar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/app/meetings/${m.id}`)}>
                      <FileAudio className="h-4 w-4 mr-1" />Detalhes
                    </Button>
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

function platformLabel(p: string) {
  return ({ google_meet: "Google Meet", zoom: "Zoom", teams: "Teams", external: "Link externo", in_person: "Presencial" } as any)[p] || p;
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
        <Button><Plus className="h-4 w-4 mr-1" />Nova reunião</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova reunião</DialogTitle></DialogHeader>
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
          <Button onClick={submit} disabled={saving}>{saving ? "Criando…" : "Criar reunião"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
