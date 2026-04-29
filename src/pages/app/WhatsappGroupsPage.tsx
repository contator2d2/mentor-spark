import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Plus, Users, Megaphone, Send, UserPlus, Radio, RefreshCw, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";

interface Group {
  jid: string;
  name: string;
  isChannel?: boolean;
  participants?: number;
}

export default function WhatsappGroupsPage() {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [instances, setInstances] = useState<any[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [addMembersFor, setAddMembersFor] = useState<Group | null>(null);
  const [postFor, setPostFor] = useState<Group | null>(null);

  async function loadGroupsWithInstance(instanceId?: string) {
    const headers: any = {};
    if (instanceId) headers["x-instance-id"] = instanceId;
    return api<{ ok: boolean; groups?: Group[]; error?: string }>("/integrations/whatsapp/groups", { headers });
  }

  async function load() {
    try {
      const instRes = await api<{ instances: any[] }>("/integrations/whatsapp");
      setInstances(instRes.instances || []);
      const def = instRes.instances?.find((i: any) => i.isDefault) || instRes.instances?.find((i: any) => i.status === "connected");
      if (def && !selectedInstance) setSelectedInstance(def.id);
    } catch (e) {}
    setLoading(true);
    try {
      const r = await loadGroupsWithInstance(selectedInstance);
      if (!r.ok) {
        toast.error(r.error || "Falha ao listar");
        setGroups([]);
      } else {
        setGroups(r.groups || []);
      }
    } catch (e: any) {
      toast.error(e.message);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const onlyGroups = (groups || []).filter((g) => !g.isChannel);
  const onlyChannels = (groups || []).filter((g) => g.isChannel);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-display flex items-center gap-2">
            <Users className="h-7 w-7 text-emerald-400" />
            Grupos & Canais WhatsApp
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Crie grupos, canais e publique conteúdo via{" "}
            <Link to="/app/messages/broadcasts" className="text-primary underline">disparos</Link> ou pontualmente.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Atualizar
          </Button>
          <Button variant="outline" onClick={() => setCreateChannelOpen(true)}>
            <Radio className="h-4 w-4 mr-2" />Novo canal
          </Button>
          <Button onClick={() => setCreateGroupOpen(true)} className="bg-gradient-primary">
            <Plus className="h-4 w-4 mr-2" />Novo grupo
          </Button>
        </div>
      </div>

      {!groups ? (
        <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <Tabs defaultValue="groups">
          <TabsList>
            <TabsTrigger value="groups"><Users className="h-4 w-4 mr-2" />Grupos ({onlyGroups.length})</TabsTrigger>
            <TabsTrigger value="channels"><Radio className="h-4 w-4 mr-2" />Canais ({onlyChannels.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="groups" className="space-y-2 mt-4">
            {onlyGroups.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>Nenhum grupo. Crie um para começar.</p>
              </Card>
            ) : onlyGroups.map((g) => (
              <GroupCard key={g.jid} group={g} onAddMembers={() => setAddMembersFor(g)} onPost={() => setPostFor(g)} />
            ))}
          </TabsContent>

          <TabsContent value="channels" className="space-y-2 mt-4">
            {onlyChannels.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground">
                <Radio className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>Nenhum canal. Crie um para publicar atualizações.</p>
              </Card>
            ) : onlyChannels.map((g) => (
              <GroupCard key={g.jid} group={g} onAddMembers={() => setAddMembersFor(g)} onPost={() => setPostFor(g)} />
            ))}
          </TabsContent>
        </Tabs>
      )}

      {createGroupOpen && (
        <CreateGroupDialog onClose={(reload) => { setCreateGroupOpen(false); if (reload) load(); }} />
      )}
      {createChannelOpen && (
        <CreateChannelDialog onClose={(reload) => { setCreateChannelOpen(false); if (reload) load(); }} />
      )}
      {addMembersFor && (
        <AddMembersDialog group={addMembersFor} onClose={() => setAddMembersFor(null)} />
      )}
      {postFor && (
        <PostDialog group={postFor} onClose={() => setPostFor(null)} />
      )}
    </div>
  );
}

function GroupCard({ group, onAddMembers, onPost }: { group: Group; onAddMembers: () => void; onPost: () => void }) {
  return (
    <Card className="p-4 flex items-center justify-between gap-3 flex-wrap hover:border-primary/40 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          {group.isChannel ? <Radio className="h-4 w-4 text-accent" /> : <Users className="h-4 w-4 text-emerald-400" />}
          <span className="font-medium">{group.name}</span>
          <Badge variant="outline" className="text-[10px]">{group.participants || 0} membros</Badge>
        </div>
        <div className="text-xs text-muted-foreground truncate">{group.jid}</div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onAddMembers}><UserPlus className="h-3 w-3 mr-1" />Membros</Button>
        <Button size="sm" onClick={onPost}><Send className="h-3 w-3 mr-1" />Publicar</Button>
      </div>
    </Card>
  );
}

// ===== Dialogs =====
function CreateGroupDialog({ onClose }: { onClose: (reload?: boolean) => void }) {
  const [name, setName] = useState("");
  const [phones, setPhones] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    const list = phones.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    if (!name) return toast.error("Dê um nome ao grupo");
    if (list.length < 1) return toast.error("Adicione ao menos 1 número");
    setBusy(true);
    try {
      const r = await api<{ ok: boolean; jid?: string; error?: string }>("/integrations/whatsapp/groups", { method: "POST", body: { name, participants: list } });
      if (!r.ok) return toast.error(r.error || "Falha");
      toast.success("Grupo criado");
      onClose(true);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo grupo</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Mentorados Premium" /></div>
          <div>
            <Label>Participantes (um por linha)</Label>
            <Textarea rows={6} value={phones} onChange={(e) => setPhones(e.target.value)} placeholder="5511999999999&#10;5511888888888" />
            <p className="text-xs text-muted-foreground mt-1">Use formato com DDI (ex: 5511...). Pode separar por vírgula, ponto-e-vírgula ou linha.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onClose()}>Cancelar</Button>
          <Button onClick={save} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateChannelDialog({ onClose }: { onClose: (reload?: boolean) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!name) return toast.error("Nome obrigatório");
    setBusy(true);
    try {
      const r = await api<{ ok: boolean; jid?: string; error?: string }>("/integrations/whatsapp/channels", { method: "POST", body: { name, description } });
      if (!r.ok) return toast.error(r.error || "Falha");
      toast.success("Canal criado");
      onClose(true);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo canal</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Avisos da Mentoria" /></div>
          <div><Label>Descrição</Label><Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">A criação de canais depende do suporte da sua instância uazapi. Se falhar, crie diretamente no WhatsApp e atualize a lista.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onClose()}>Cancelar</Button>
          <Button onClick={save} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddMembersDialog({ group, onClose }: { group: Group; onClose: () => void }) {
  const [phones, setPhones] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    const list = phones.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    if (!list.length) return toast.error("Adicione pelo menos 1 número");
    setBusy(true);
    try {
      const r = await api<{ ok: boolean; error?: string }>(`/integrations/whatsapp/groups/${encodeURIComponent(group.jid)}/participants`, {
        method: "POST", body: { participants: list },
      });
      if (!r.ok) return toast.error(r.error || "Falha");
      toast.success("Participantes adicionados");
      onClose();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Adicionar membros — {group.name}</DialogTitle></DialogHeader>
        <Textarea rows={6} value={phones} onChange={(e) => setPhones(e.target.value)} placeholder="5511999999999&#10;5511888888888" />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}<UserPlus className="h-4 w-4 mr-2" />Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PostDialog({ group, onClose }: { group: Group; onClose: () => void }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  async function send() {
    if (!body.trim()) return toast.error("Mensagem vazia");
    setBusy(true);
    try {
      const r = await api<{ ok: boolean; error?: string }>(`/integrations/whatsapp/groups/${encodeURIComponent(group.jid)}/send`, {
        method: "POST", body: { message: body },
      });
      if (!r.ok) return toast.error(r.error || "Falha");
      toast.success("Publicado!");
      onClose();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />Publicar em {group.name}
          </DialogTitle>
        </DialogHeader>
        <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escreva sua mensagem..." />
        <p className="text-xs text-muted-foreground">
          Para envios programados ou em vários grupos, use{" "}
          <Link to="/app/messages/broadcasts" className="text-primary underline">disparos em massa</Link>.
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={send} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}<Send className="h-4 w-4 mr-2" />Enviar agora</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
