import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Loader2, Plus, Trash2, Users, Crown, Edit3, Headphones, Settings, Key, UserCheck, UserMinus } from "lucide-react";
import { toast } from "sonner";

 interface Member { id: string; name: string; email: string; phone?: string; role: "admin" | "editor" | "attendant"; status: 'active' | 'inactive'; createdAt: string; }
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
   const [form, setForm] = useState({ name: "", email: "", phone: "", role: "attendant" as Member["role"], password: "" });
   const [editingMember, setEditingMember] = useState<Member | null>(null);
   const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
   const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
   const [newPassword, setNewPassword] = useState("");

  async function load() {
    try {
      const [m, l] = await Promise.all([api<Member[]>("/team"), api<Limits>("/team/limits")]);
      setMembers(m); setLimits(l);
    } catch (e: any) { toast.error(e.message); }
  }
  useEffect(() => { load(); }, []);

   async function save() {
     if (!form.name || !form.email) return toast.error("Nome e email obrigatórios");
     setSaving(true);
     try {
       if (editingMember) {
         await api(`/team/${editingMember.id}`, { method: "PATCH", body: form });
         toast.success("Membro atualizado!");
         setIsEditDialogOpen(false);
       } else {
         await api("/team", { method: "POST", body: form });
         toast.success("Membro adicionado! Email com senha enviado.");
         setOpen(false);
       }
       setForm({ name: "", email: "", phone: "", role: "attendant", password: "" });
       setEditingMember(null);
       load();
     } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
   }
 
   async function updatePassword() {
     if (!editingMember || !newPassword) return toast.error("Senha obrigatória");
     setSaving(true);
     try {
       await api(`/team/${editingMember.id}/password`, { method: "PATCH", body: { password: newPassword } });
       toast.success("Senha atualizada!");
       setIsPasswordDialogOpen(false);
       setNewPassword("");
       setEditingMember(null);
     } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
   }
 
   async function toggleStatus(member: Member) {
     const newStatus = member.status === "active" ? "inactive" : "active";
     try {
       await api(`/team/${member.id}`, { method: "PATCH", body: { status: newStatus } });
       toast.success(`Membro ${newStatus === "active" ? "ativado" : "desativado"}`);
       load();
     } catch (e: any) { toast.error(e.message); }
   }

  async function remove(id: string) {
    if (!confirm("Remover este membro? Ele perderá acesso imediatamente.")) return;
    try { await api(`/team/${id}`, { method: "DELETE" }); load(); toast.success("Removido"); }
    catch (e: any) { toast.error(e.message); }
  }

   function startEdit(member: Member) {
     setEditingMember(member);
     setForm({ name: member.name, email: member.email, phone: member.phone || "", role: member.role, password: "" });
     setIsEditDialogOpen(true);
   }
 
   function startPasswordChange(member: Member) {
     setEditingMember(member);
     setNewPassword("");
     setIsPasswordDialogOpen(true);
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
                 <DialogFooter><Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Adicionar e enviar convite</Button></DialogFooter>
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

       {/* Edit Member Dialog */}
       <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
         <DialogContent>
           <DialogHeader><DialogTitle>Editar membro da equipe</DialogTitle></DialogHeader>
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
           <DialogFooter><Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar alterações</Button></DialogFooter>
         </DialogContent>
       </Dialog>
 
       {/* Password Change Dialog */}
       <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
         <DialogContent>
           <DialogHeader><DialogTitle>Trocar senha: {editingMember?.name}</DialogTitle></DialogHeader>
           <div className="space-y-3">
             <div>
               <Label className="text-xs">Nova senha</Label>
               <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
             </div>
           </div>
           <DialogFooter><Button onClick={updatePassword} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Atualizar senha</Button></DialogFooter>
         </DialogContent>
       </Dialog>
 
       <div className="grid gap-3">
         {members.map((m) => {
           const meta = ROLE_META[m.role];
           const Icon = meta?.icon || Users;
           const isActive = m.status === 'active';
 
           return (
             <Card key={m.id} className={`p-4 flex items-center justify-between gap-4 ${!isActive ? 'opacity-60 bg-muted/30' : ''}`}>
               <div className="flex items-center gap-3 min-w-0">
                 <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground ${isActive ? 'bg-gradient-primary' : 'bg-slate-400'}`}>
                   {m.name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()}
                 </div>
                 <div className="min-w-0">
                   <div className="font-medium truncate flex items-center gap-2">
                     {m.name}
                     {!isActive && <Badge variant="secondary" className="text-[10px] h-4">Inativo</Badge>}
                   </div>
                   <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                 </div>
               </div>
               <div className="flex items-center gap-2">
                 <Badge variant="outline" className={`${meta?.color} hidden sm:flex`}><Icon className="h-3 w-3 mr-1" />{meta?.label}</Badge>
                 
                 <div className="flex items-center border rounded-md p-1 bg-background/50">
                   <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(m)} title="Editar perfil">
                     <Settings className="h-4 w-4" />
                   </Button>
                   <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startPasswordChange(m)} title="Trocar senha">
                     <Key className="h-4 w-4" />
                   </Button>
                   <Button 
                     variant="ghost" 
                     size="icon" 
                     className={`h-8 w-8 ${isActive ? 'text-amber-500' : 'text-emerald-500'}`} 
                     onClick={() => toggleStatus(m)} 
                     title={isActive ? "Desativar" : "Ativar"}
                   >
                     {isActive ? <UserMinus className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                   </Button>
                   <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => remove(m.id)} title="Excluir permanentemente">
                     <Trash2 className="h-4 w-4" />
                   </Button>
                 </div>
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
