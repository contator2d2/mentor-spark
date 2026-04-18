import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Users, Crown, Edit3, Headphones } from "lucide-react";
import { toast } from "sonner";

interface Member { id: string; name: string; email: string; phone?: string; role: "admin" | "editor" | "attendant"; status: string; createdAt: string; }
interface Limits { used: number; max: number; planName: string; canAdd: boolean; }

const ROLE_META: Record<string, { label: string; icon: any; color: string; desc: string }> = {
  admin: { label: "Administrador", icon: Crown, color: "text-amber-400", desc: "Acesso total: equipe, planos, financeiro." },
  editor: { label: "Editor", icon: Edit3, color: "text-violet-400", desc: "Gerencia leads, conteúdos e mensagens." },
  attendant: { label: "Atendente", icon: Headphones, color: "text-blue-400", desc: "Atende leads e mentorados." },
};

export default function TeamPage() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [limits, setLimits] = useState<Limits | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "attendant" as Member["role"] });

  async function load() {
    try {
      const [m, l] = await Promise.all([api<Member[]>("/team"), api<Limits>("/team/limits")]);
      setMembers(m); setLimits(l);
    } catch (e: any) { toast.error(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.name || !form.email) return toast.error("Nome e email obrigatórios");
    setSaving(true);
    try {
      await api("/team", { method: "POST", body: form });
      toast.success("Membro adicionado! Email com senha enviado.");
      setOpen(false); setForm({ name: "", email: "", phone: "", role: "attendant" });
      load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm("Remover este membro? Ele perderá acesso imediatamente.")) return;
    try { await api(`/team/${id}`, { method: "DELETE" }); load(); toast.success("Removido"); }
    catch (e: any) { toast.error(e.message); }
  }

  async function changeRole(id: string, role: Member["role"]) {
    try { await api(`/team/${id}`, { method: "PATCH", body: { role } }); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  if (!members) return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display flex items-center gap-2"><Users className="h-7 w-7 text-primary" />Equipe</h1>
          <p className="text-muted-foreground mt-1">Adicione colaboradores que ajudam a gerenciar seu negócio.</p>
        </div>
        {limits && (
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm py-1.5 px-3">
              {limits.used} / {limits.max === -1 ? "∞" : limits.max} membros · {limits.planName}
            </Badge>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button disabled={!limits.canAdd} className="bg-gradient-primary"><Plus className="h-4 w-4 mr-2" />Adicionar membro</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo membro da equipe</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label className="text-xs">Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><Label className="text-xs">Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div><Label className="text-xs">Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                  <div>
                    <Label className="text-xs">Perfil de acesso</Label>
                    <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_META).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label} — {v.desc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter><Button onClick={create} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Adicionar e enviar convite</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {!limits?.canAdd && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <p className="text-sm">Limite do plano atingido. Faça upgrade para adicionar mais membros.</p>
        </Card>
      )}

      <div className="grid gap-3">
        {members.map((m) => {
          const meta = ROLE_META[m.role];
          const Icon = meta?.icon || Users;
          return (
            <Card key={m.id} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                  {m.name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{m.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select value={m.role} onValueChange={(v: any) => changeRole(m.id, v)}>
                  <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Badge variant="outline" className={meta?.color}><Icon className="h-3 w-3 mr-1" />{meta?.label}</Badge>
                <Button variant="ghost" size="icon" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4 text-rose-400" /></Button>
              </div>
            </Card>
          );
        })}
        {members.length === 0 && (
          <Card className="p-12 text-center text-muted-foreground"><Users className="h-12 w-12 mx-auto mb-3 opacity-40" /><p>Nenhum membro ainda. Adicione seu primeiro colaborador.</p></Card>
        )}
      </div>
    </div>
  );
}
