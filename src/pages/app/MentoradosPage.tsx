import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { MaskedInput } from "@/components/MaskedInput";
import { toast } from "sonner";
import {
  Loader2, Plus, Users, Search, Mail, Phone, Building2, Sparkles, UserCheck, Clock,
} from "lucide-react";

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

function avatarFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  active:    { label: "Ativo",      cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400" },
  pending:   { label: "Pendente",   cls: "bg-amber-500/10 text-amber-400 border-amber-500/30",       dot: "bg-amber-400 animate-pulse" },
  suspended: { label: "Suspenso",   cls: "bg-rose-500/10 text-rose-400 border-rose-500/30",          dot: "bg-rose-400" },
};

export default function MentoradosPage() {
  const [items, setItems] = useState<Mentorado[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "" });

  async function load() {
    setLoading(true);
    try { setItems(await api<Mentorado[]>("/mentor/mentorados")); }
    catch (e: any) { toast.error(e.message || "Erro ao carregar"); }
    finally { setLoading(false); }
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
    } catch (e: any) { toast.error(e.message || "Erro"); }
    finally { setSaving(false); }
  }

  const filtered = items.filter(
    (m) =>
      !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      (m.company || "").toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: items.length,
    active: items.filter((m) => m.status === "active").length,
    pending: items.filter((m) => m.status === "pending").length,
    mentorados: items.filter((m) => m.role === "mentorado").length,
  };

  return (
    <div className="space-y-8">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-hero border border-border/60 p-8 md:p-10">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-secondary/20 blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="animate-fade-in">
            <Badge variant="outline" className="mb-3 border-secondary/40 bg-secondary/10 text-secondary">
              <Users className="h-3 w-3 mr-1" /> Comunidade
            </Badge>
            <h1 className="text-4xl md:text-5xl font-display tracking-tight text-balance">
              Seus <span className="text-gradient">mentorados</span>
            </h1>
            <p className="text-muted-foreground mt-2 max-w-lg">
              Gestão de quem está na sua jornada de transformação.
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90 shadow-glow">
                <Plus className="mr-2 h-4 w-4" />Convidar mentorado
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-border/60 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display">Convidar novo mentorado</DialogTitle>
                <DialogDescription>
                  Preencha os dados abaixo. Uma senha temporária será gerada automaticamente.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                <div className="md:col-span-2 space-y-1.5">
                  <Label htmlFor="m-name">Nome completo *</Label>
                  <Input
                    id="m-name"
                    placeholder="Ex: Maria Silva"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <Label htmlFor="m-email">Email *</Label>
                  <Input
                    id="m-email"
                    type="email"
                    placeholder="nome@empresa.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value.toLowerCase().trim() })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-phone">WhatsApp</Label>
                  <MaskedInput
                    id="m-phone"
                    mask="(00) 00000-0000"
                    inputMode="tel"
                    placeholder="(11) 98765-4321"
                    value={form.phone}
                    onAccept={(v) => setForm({ ...form, phone: v })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-company">Empresa</Label>
                  <Input
                    id="m-company"
                    placeholder="Nome da empresa"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={invite} disabled={saving || !form.name || !form.email} className="bg-gradient-primary hover:opacity-90">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar convite
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
          {[
            { label: "Total", value: stats.total, icon: Users, glow: "text-foreground" },
            { label: "Ativos", value: stats.active, icon: UserCheck, glow: "text-emerald-400" },
            { label: "Pendentes", value: stats.pending, icon: Clock, glow: "text-amber-400" },
            { label: "Mentorados", value: stats.mentorados, icon: Sparkles, glow: "text-violet-400" },
          ].map((s, i) => (
            <div key={s.label} className={`glass-card rounded-2xl p-4 animate-fade-in anim-delay-${(i + 1) * 100}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</span>
                <s.icon className={`h-4 w-4 ${s.glow}`} />
              </div>
              <div className={`text-3xl font-display font-bold mt-1 ${s.glow}`}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* SEARCH */}
      <div className="relative animate-fade-in">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou empresa…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card/50 border-border/60 backdrop-blur"
        />
      </div>

      {/* GRID */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="glass-card border-dashed">
          <CardContent className="py-16 text-center">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-secondary/10 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-secondary" />
            </div>
            <p className="text-muted-foreground">
              {items.length === 0 ? "Nenhum mentorado ainda. Convide o primeiro!" : "Nenhum resultado para a busca."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m, i) => {
            const status = STATUS_META[m.status] || STATUS_META.pending;
            return (
              <Card
                key={m.id}
                className={`glass-card glass-card-hover border-border/60 group cursor-pointer animate-fade-in anim-delay-${Math.min((i + 1) * 100, 600)}`}
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center text-base font-bold text-primary-foreground shadow-glow shrink-0 group-hover:scale-110 transition-transform">
                      {avatarFromName(m.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-semibold text-base truncate group-hover:text-gradient transition-all">
                        {m.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{m.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    {m.company && (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{m.company}</span>
                      </div>
                    )}
                    {m.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span>{m.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <Badge
                      variant={m.role === "mentorado" ? "default" : "secondary"}
                      className={m.role === "mentorado" ? "bg-gradient-primary border-0" : ""}
                    >
                      {m.role === "mentorado" ? "Mentorado" : "Prospect"}
                    </Badge>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${status.cls}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
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
