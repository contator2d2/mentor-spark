import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Copy, ExternalLink, Trash2, Settings } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";

interface Availability {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  bufferMinutes: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  weeklyHours: Record<string, [string, string][]>;
  blockedDates: string[];
  color: string;
  slug?: string;
  autoMeetLink: boolean;
  requireApproval: boolean;
  active: boolean;
}

const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function SchedulingPage() {
  const { user } = useAuth();
  const [list, setList] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Availability> | null>(null);
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    try {
      const r = await api<Availability[]>("/scheduling/availabilities");
      setList(r);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing) return;
    try {
      if (editing.id) await api(`/scheduling/availabilities/${editing.id}`, { method: "PATCH", body: editing });
      else await api("/scheduling/availabilities", { method: "POST", body: editing });
      toast.success("Salvo!");
      setEditing(null);
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function remove(id: string) {
    if (!confirm("Remover este tipo de agendamento?")) return;
    await api(`/scheduling/availabilities/${id}`, { method: "DELETE" });
    load();
  }

  function publicUrl(slug?: string) {
    if (!user?.slug) return "";
    return `${window.location.origin}/agendar/${user.slug}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <Calendar className="h-7 w-7 text-primary" /> Agenda Pública
          </h1>
          <p className="text-muted-foreground mt-1">Receba agendamentos automaticamente — estilo Calendly.</p>
        </div>
        <div className="flex gap-2">
          {user?.slug && (
            <Button variant="outline" onClick={() => {
              navigator.clipboard.writeText(publicUrl());
              toast.success("Link copiado!");
            }}>
              <Copy className="h-4 w-4 mr-2" /> Copiar link público
            </Button>
          )}
          <Button onClick={() => setEditing({
            title: "Sessão de 30 min",
            durationMinutes: 30,
            bufferMinutes: 5,
            minNoticeHours: 2,
            maxAdvanceDays: 30,
            weeklyHours: { "1": [["09:00","12:00"]], "2": [["09:00","12:00"]], "3": [["09:00","12:00"]], "4": [["09:00","12:00"]], "5": [["09:00","12:00"]] },
            blockedDates: [],
            color: "#6366f1",
            autoMeetLink: true,
            requireApproval: false,
            active: true,
          })}>
            <Plus className="h-4 w-4 mr-2" /> Novo tipo
          </Button>
        </div>
      </div>

      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <ExternalLink className="h-4 w-4" />
            <span className="font-medium">Link público:</span>
            <code className="text-xs bg-background px-2 py-1 rounded">{publicUrl() || "Configure seu slug em Branding"}</code>
          </div>
          <Button size="sm" variant="ghost" onClick={() => navigate("/app/scheduling/bookings")}>
            Ver agendamentos →
          </Button>
        </div>
      </Card>

      {loading ? <div>Carregando...</div> : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map(a => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg shrink-0" style={{ background: a.color }} />
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{a.title}</div>
                    <div className="text-sm text-muted-foreground">{a.durationMinutes}min · {a.minNoticeHours}h antecedência</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.entries(a.weeklyHours).map(([d, ranges]) =>
                        <Badge key={d} variant="secondary" className="text-[10px]">{DOW[+d]}: {ranges.map(r => r.join("-")).join(", ")}</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  {a.active ? <Badge className="bg-green-500">Ativo</Badge> : <Badge variant="outline">Inativo</Badge>}
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(a)}><Settings className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {list.length === 0 && <Card className="p-8 text-center text-muted-foreground col-span-2">Crie seu primeiro tipo de agendamento.</Card>}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar" : "Novo"} tipo de agendamento</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Duração (min)</Label>
                  <Input type="number" value={editing.durationMinutes} onChange={(e) => setEditing({ ...editing, durationMinutes: +e.target.value })} />
                </div>
                <div>
                  <Label>Buffer entre slots (min)</Label>
                  <Input type="number" value={editing.bufferMinutes} onChange={(e) => setEditing({ ...editing, bufferMinutes: +e.target.value })} />
                </div>
                <div>
                  <Label>Antecedência mín. (h)</Label>
                  <Input type="number" value={editing.minNoticeHours} onChange={(e) => setEditing({ ...editing, minNoticeHours: +e.target.value })} />
                </div>
                <div>
                  <Label>Janela máxima (dias)</Label>
                  <Input type="number" value={editing.maxAdvanceDays} onChange={(e) => setEditing({ ...editing, maxAdvanceDays: +e.target.value })} />
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Disponibilidade semanal</Label>
                <div className="space-y-2">
                  {DOW.map((d, idx) => {
                    const ranges = editing.weeklyHours?.[idx] || [];
                    return (
                      <div key={idx} className="flex items-center gap-2 flex-wrap p-2 bg-muted/30 rounded">
                        <div className="w-12 text-sm font-medium">{d}</div>
                        {ranges.map((r, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <Input className="h-7 w-20" value={r[0]} onChange={(e) => {
                              const wh = { ...editing.weeklyHours };
                              wh[idx] = [...ranges];
                              wh[idx][i] = [e.target.value, r[1]];
                              setEditing({ ...editing, weeklyHours: wh });
                            }} />
                            <span>-</span>
                            <Input className="h-7 w-20" value={r[1]} onChange={(e) => {
                              const wh = { ...editing.weeklyHours };
                              wh[idx] = [...ranges];
                              wh[idx][i] = [r[0], e.target.value];
                              setEditing({ ...editing, weeklyHours: wh });
                            }} />
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                              const wh = { ...editing.weeklyHours };
                              wh[idx] = ranges.filter((_, j) => j !== i);
                              if (!wh[idx].length) delete wh[idx];
                              setEditing({ ...editing, weeklyHours: wh });
                            }}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        ))}
                        <Button size="sm" variant="outline" className="h-7" onClick={() => {
                          const wh = { ...editing.weeklyHours };
                          wh[idx] = [...(wh[idx] || []), ["09:00","17:00"]];
                          setEditing({ ...editing, weeklyHours: wh });
                        }}>+ janela</Button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>Gerar Google Meet automaticamente</Label>
                <Switch checked={editing.autoMeetLink} onCheckedChange={(v) => setEditing({ ...editing, autoMeetLink: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Exigir minha aprovação</Label>
                <Switch checked={editing.requireApproval} onCheckedChange={(v) => setEditing({ ...editing, requireApproval: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Ativo</Label>
                <Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
