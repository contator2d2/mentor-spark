import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Users } from "lucide-react";

interface Mentorado {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  role: "mentorado" | "prospect";
  status: "active" | "pending" | "suspended";
  createdAt: string;
}

export default function MentoradosPage() {
  const [items, setItems] = useState<Mentorado[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "" });

  async function load() {
    setLoading(true);
    try {
      const data = await api<Mentorado[]>("/mentor/mentorados");
      setItems(data);
    } catch (e: any) {
      toast.error(e.message || "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function invite() {
    setSaving(true);
    try {
      const res = await api<{ tempPassword?: string; reused?: boolean }>("/mentor/mentorados", { method: "POST", body: form });
      toast.success(res.reused ? "Mentorado vinculado" : `Convite enviado! Senha temporária: ${res.tempPassword}`);
      setOpen(false);
      setForm({ name: "", email: "", phone: "", company: "" });
      load();
    } catch (e: any) {
      toast.error(e.message || "Erro");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-accent" />
          <div>
            <h1 className="font-display text-3xl font-bold">Mentorados</h1>
            <p className="text-muted-foreground">Gestão de quem está na sua jornada.</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Convidar mentorado</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Convidar novo mentorado</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>WhatsApp</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Empresa</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button onClick={invite} disabled={saving || !form.name || !form.email}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar convite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin inline" /></div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">Nenhum mentorado ainda. Convide o primeiro!</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left p-3">Nome</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Empresa</th>
                <th className="text-left p-3">Tipo</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3 font-medium">{m.name}</td>
                  <td className="p-3 text-muted-foreground">{m.email}</td>
                  <td className="p-3">{m.company || "-"}</td>
                  <td className="p-3"><Badge variant={m.role === "mentorado" ? "default" : "secondary"}>{m.role}</Badge></td>
                  <td className="p-3"><Badge variant={m.status === "active" ? "default" : "outline"}>{m.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
