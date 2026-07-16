import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Users, Plus, Trash2, Search, X } from "lucide-react";
import { toast } from "sonner";

type Kind = "manual" | "event" | "tag" | "plan";

interface Group {
  id: string;
  name: string;
  description?: string;
  color?: string;
  kind: Kind;
  filter: any;
  memberCount?: number;
  members?: any[];
}

const KIND_LABEL: Record<Kind, string> = {
  manual: "Manual",
  event: "Por Evento",
  tag: "Por Tag/Origem",
  plan: "Por Plano",
};

export default function AccessGroupsPage() {
  const [list, setList] = useState<Group[]>([]);
  const [creating, setCreating] = useState<Partial<Group> | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Group | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  async function load() {
    try { setList(await api<Group[]>("/access-groups")); } catch (e: any) { toast.error(e.message); }
  }
  async function loadDetail(id: string) {
    setDetail(await api<Group>(`/access-groups/${id}`));
  }
  useEffect(() => { load(); api<any[]>("/leads").then(setLeads).catch(() => {}); api<any[]>("/events").then(setEvents).catch(() => {}); }, []);
  useEffect(() => { if (openId) loadDetail(openId); }, [openId]);

  async function save() {
    if (!creating?.name) return toast.error("Nome obrigatório");
    await api("/access-groups", { method: "POST", body: { ...creating, kind: creating.kind || "manual", filter: creating.filter || {} } });
    setCreating(null); load();
  }
  async function remove(id: string) {
    if (!confirm("Remover grupo?")) return;
    await api(`/access-groups/${id}`, { method: "DELETE" });
    load();
  }
  async function addMember(leadId: string) {
    if (!detail) return;
    await api(`/access-groups/${detail.id}/members`, { method: "POST", body: { leadIds: [leadId] } });
    loadDetail(detail.id); load();
  }
  async function removeMember(leadId: string) {
    if (!detail) return;
    await api(`/access-groups/${detail.id}/members/${leadId}`, { method: "DELETE" });
    loadDetail(detail.id); load();
  }
  async function importEvent(eventId: string) {
    if (!detail) return;
    const r = await api<any>(`/access-groups/${detail.id}/import-event/${eventId}`, { method: "POST" });
    toast.success(`${r.added} membros adicionados`);
    loadDetail(detail.id); load();
  }

  const filteredLeads = leads.filter((l) => `${l.name} ${l.email}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" /> Grupos de Acesso
          </h1>
          <p className="text-muted-foreground">Organize mentorados em grupos para liberar cursos e conteúdos.</p>
        </div>
        <Button onClick={() => setCreating({ name: "", kind: "manual", filter: {} })}>
          <Plus className="h-4 w-4 mr-1" /> Novo grupo
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {list.map((g) => (
          <Card key={g.id} className="p-4 hover:border-primary cursor-pointer" onClick={() => setOpenId(g.id)}>
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <div className="font-semibold truncate">{g.name}</div>
                <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{g.description || "Sem descrição"}</div>
              </div>
              <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); remove(g.id); }}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
            <div className="flex items-center justify-between mt-3">
              <Badge variant="secondary">{KIND_LABEL[g.kind]}</Badge>
              <Badge variant="outline">{g.memberCount || 0} membros</Badge>
            </div>
          </Card>
        ))}
        {list.length === 0 && <Card className="p-8 text-center text-muted-foreground col-span-full">Nenhum grupo ainda.</Card>}
      </div>

      {/* Criar */}
      <Dialog open={!!creating} onOpenChange={(o) => !o && setCreating(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo grupo</DialogTitle></DialogHeader>
          {creating && (
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={creating.name || ""} onChange={(e) => setCreating({ ...creating, name: e.target.value })} placeholder="Ex.: Evento Marketing 2025" /></div>
              <div><Label>Descrição</Label><Textarea value={creating.description || ""} onChange={(e) => setCreating({ ...creating, description: e.target.value })} /></div>
              <div>
                <Label>Tipo</Label>
                <Select value={creating.kind || "manual"} onValueChange={(v: Kind) => setCreating({ ...creating, kind: v, filter: {} })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual (escolho cada pessoa)</SelectItem>
                    <SelectItem value="event">Por Evento (auto: inscritos do evento)</SelectItem>
                    <SelectItem value="tag">Por Tag/Origem (auto: leads com a tag)</SelectItem>
                    <SelectItem value="plan">Por Plano (auto: assinantes do plano)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {creating.kind === "event" && (
                <div>
                  <Label>Evento</Label>
                  <Select value={creating.filter?.eventId || ""} onValueChange={(v) => setCreating({ ...creating, filter: { ...creating.filter, eventId: v } })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {events.map((ev) => <SelectItem key={ev.id} value={ev.id}>{ev.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {creating.kind === "tag" && (
                <div><Label>Tag/Origem</Label><Input value={creating.filter?.tag || ""} onChange={(e) => setCreating({ ...creating, filter: { ...creating.filter, tag: e.target.value } })} placeholder="ex.: cliente-2024" /></div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(null)}>Cancelar</Button>
            <Button onClick={save}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalhe + membros */}
      <Dialog open={!!openId} onOpenChange={(o) => { if (!o) { setOpenId(null); setDetail(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{detail?.name}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="flex items-center gap-2"><Badge>{KIND_LABEL[detail.kind]}</Badge><Badge variant="outline">{detail.memberCount} membros</Badge></div>

              {detail.kind === "event" && (
                <Button variant="outline" size="sm" onClick={() => detail.filter?.eventId && importEvent(detail.filter.eventId)}>Sincronizar inscritos do evento</Button>
              )}

              <div>
                <Label>Adicionar mentorado</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome/email" />
                </div>
                <div className="max-h-40 overflow-y-auto border rounded mt-2">
                  {filteredLeads.slice(0, 30).map((l) => {
                    const already = detail.members?.some((m) => m.id === l.id);
                    return (
                      <div key={l.id} className="flex items-center justify-between p-2 hover:bg-muted/30">
                        <div className="text-sm">{l.name} <span className="text-muted-foreground">— {l.email}</span></div>
                        <Button size="sm" variant={already ? "ghost" : "outline"} disabled={already} onClick={() => addMember(l.id)}>
                          {already ? "Já no grupo" : "+ Adicionar"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label>Membros ({detail.members?.length || 0})</Label>
                <div className="max-h-60 overflow-y-auto border rounded">
                  {detail.members?.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-2 hover:bg-muted/30">
                      <div className="text-sm">{m.name} <span className="text-muted-foreground">— {m.email}</span></div>
                      <Button size="icon" variant="ghost" onClick={() => removeMember(m.id)}><X className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  {!detail.members?.length && <div className="p-4 text-center text-xs text-muted-foreground">Nenhum membro ainda.</div>}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}