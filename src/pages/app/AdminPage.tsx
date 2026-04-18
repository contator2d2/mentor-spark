import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, Check, X, ShieldCheck, Search, Pencil, Crown, Clock, UserCheck, Ban,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";

interface Mentor {
  id: string;
  name: string;
  email: string;
  phone?: string;
  brandName?: string;
  brandLogoUrl?: string;
  slug?: string;
  status: "pending" | "active" | "suspended";
  createdAt: string;
  planId: string | null;
  planName: string | null;
  planPriceMonthly: number;
  planExpiresAt: string | null;
  planBillingType: "monthly" | "upfront" | null;
  planPaymentMethods: string[];
  planDueDay: number | null;
  planAmount: number | null;
  planNotes: string | null;
  isExpired: boolean;
}

type PaymentMethod = "pix" | "boleto" | "credit_card";
const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "pix", label: "Pix" },
  { value: "boleto", label: "Boleto" },
  { value: "credit_card", label: "Cartão de crédito" },
];

interface Plan {
  id: string;
  name: string;
  slug: string;
  priceMonthly: number;
  isActive: boolean;
}

const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  active:    { label: "Ativo",    cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400" },
  pending:   { label: "Pendente", cls: "bg-amber-500/10 text-amber-400 border-amber-500/30",       dot: "bg-amber-400 animate-pulse" },
  suspended: { label: "Bloqueado",cls: "bg-rose-500/10 text-rose-400 border-rose-500/30",          dot: "bg-rose-400" },
};

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}
function avatarFromName(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

export default function AdminPage() {
  const [mentors, setMentors] = useState<Mentor[] | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Mentor | null>(null);
  const [form, setForm] = useState<{
    planId: string;
    planExpiresAt: string;
    status: string;
    planBillingType: "monthly" | "upfront" | "";
    planPaymentMethods: PaymentMethod[];
    planDueDay: string;
    planAmount: string;
    planNotes: string;
  }>({
    planId: "",
    planExpiresAt: "",
    status: "active",
    planBillingType: "",
    planPaymentMethods: [],
    planDueDay: "",
    planAmount: "",
    planNotes: "",
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [ms, ps] = await Promise.all([api<Mentor[]>("/admin/mentors"), api<Plan[]>("/plans")]);
      setMentors(ms);
      setPlans(ps);
    } catch (e: any) {
      toast.error(e.message || "Erro ao carregar");
    }
  }
  useEffect(() => { load(); }, []);

  async function quickStatus(id: string, status: string) {
    try {
      await api(`/admin/mentors/${id}/status`, { method: "PATCH", body: { status } });
      setMentors((m) => m?.map((x) => (x.id === id ? { ...x, status: status as any } : x)) || null);
      toast.success("Status atualizado");
    } catch (e: any) { toast.error(e.message); }
  }

  function openEdit(m: Mentor) {
    setEditing(m);
    setForm({
      planId: m.planId || "none",
      planExpiresAt: m.planExpiresAt ? m.planExpiresAt.slice(0, 10) : "",
      status: m.status,
      planBillingType: (m.planBillingType as any) || "",
      planPaymentMethods: (m.planPaymentMethods || []) as PaymentMethod[],
      planDueDay: m.planDueDay ? String(m.planDueDay) : "",
      planAmount: m.planAmount != null ? String(m.planAmount) : "",
      planNotes: m.planNotes || "",
    });
  }

  function togglePm(pm: PaymentMethod) {
    setForm((f) => ({
      ...f,
      planPaymentMethods: f.planPaymentMethods.includes(pm)
        ? f.planPaymentMethods.filter((x) => x !== pm)
        : [...f.planPaymentMethods, pm],
    }));
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      await api(`/admin/mentors/${editing.id}`, {
        method: "PATCH",
        body: {
          planId: form.planId === "none" ? null : form.planId,
          planExpiresAt: form.planExpiresAt || null,
          status: form.status,
          planBillingType: form.planBillingType || null,
          planPaymentMethods: form.planPaymentMethods,
          planDueDay: form.planDueDay ? Number(form.planDueDay) : null,
          planAmount: form.planAmount ? Number(form.planAmount) : null,
          planNotes: form.planNotes || null,
        },
      });
      toast.success("Mentor atualizado");
      setEditing(null);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  if (!mentors) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const filtered = mentors.filter(
    (m) =>
      !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      (m.brandName || "").toLowerCase().includes(search.toLowerCase()),
  );

  const stats = {
    total: mentors.length,
    active: mentors.filter((m) => m.status === "active").length,
    pending: mentors.filter((m) => m.status === "pending").length,
    suspended: mentors.filter((m) => m.status === "suspended").length,
    paying: mentors.filter((m) => m.status === "active" && m.planPriceMonthly > 0 && !m.isExpired).length,
  };

  return (
    <div className="space-y-8">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-hero border border-border/60 p-8 md:p-10">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />

        <div className="relative">
          <Badge variant="outline" className="mb-3 border-primary/40 bg-primary/10 text-primary">
            <ShieldCheck className="h-3 w-3 mr-1" /> Super Admin
          </Badge>
          <h1 className="text-4xl md:text-5xl font-display tracking-tight text-balance">
            Aprovação de <span className="text-gradient">mentores</span>
          </h1>
          <p className="text-muted-foreground mt-2 max-w-lg">
            Gerencie acessos, planos e cobranças de toda a plataforma.
          </p>
        </div>

        <div className="relative grid grid-cols-2 md:grid-cols-5 gap-3 mt-8">
          {[
            { label: "Total",      value: stats.total,     icon: ShieldCheck, glow: "text-foreground" },
            { label: "Ativos",     value: stats.active,    icon: UserCheck,   glow: "text-emerald-400" },
            { label: "Pendentes",  value: stats.pending,   icon: Clock,       glow: "text-amber-400" },
            { label: "Bloqueados", value: stats.suspended, icon: Ban,         glow: "text-rose-400" },
            { label: "Pagantes",   value: stats.paying,    icon: Crown,       glow: "text-violet-400" },
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
          placeholder="Buscar por nome, email ou marca…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card/50 border-border/60 backdrop-blur"
        />
      </div>

      {/* GRID */}
      {filtered.length === 0 ? (
        <Card className="glass-card border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground">
            Nenhum mentor encontrado.
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m, i) => {
            const status = STATUS_META[m.status] || STATUS_META.pending;
            return (
              <Card
                key={m.id}
                className={`glass-card glass-card-hover border-border/60 group animate-fade-in anim-delay-${Math.min((i + 1) * 100, 600)}`}
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    {m.brandLogoUrl ? (
                      <img src={m.brandLogoUrl} alt={m.brandName || m.name} className="h-14 w-14 rounded-2xl object-contain bg-muted shrink-0" />
                    ) : (
                      <div className="h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center text-base font-bold text-primary-foreground shadow-glow shrink-0">
                        {avatarFromName(m.brandName || m.name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-semibold text-base truncate">
                        {m.brandName || m.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                      {m.slug && <div className="text-xs text-muted-foreground/70 truncate">/c/{m.slug}</div>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className={`inline-flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-full border ${status.cls}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
                    {m.planName ? (
                      <span className={`inline-flex items-center gap-1 font-medium ${m.isExpired ? "text-rose-400" : "text-violet-400"}`}>
                        <Crown className="h-3 w-3" />
                        {m.planName}
                        {m.isExpired && " (vencido)"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Sem plano</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted/30 rounded-lg p-2">
                      <div className="text-muted-foreground uppercase tracking-wider text-[10px]">
                        {m.planBillingType === "upfront" ? "Valor à vista" : "Mensalidade"}
                      </div>
                      <div className="font-semibold text-foreground">
                        {fmtBRL(m.planAmount != null ? m.planAmount : m.planPriceMonthly || 0)}
                      </div>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2">
                      <div className="text-muted-foreground uppercase tracking-wider text-[10px] flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        {m.planBillingType === "monthly" && m.planDueDay ? "Vence dia" : "Expira"}
                      </div>
                      <div className={`font-semibold ${m.isExpired ? "text-rose-400" : "text-foreground"}`}>
                        {m.planBillingType === "monthly" && m.planDueDay
                          ? `Todo dia ${m.planDueDay}`
                          : fmtDate(m.planExpiresAt)}
                      </div>
                    </div>
                  </div>

                  {(m.planBillingType || (m.planPaymentMethods && m.planPaymentMethods.length > 0)) && (
                    <div className="flex flex-wrap gap-1">
                      {m.planBillingType && (
                        <Badge variant="outline" className="text-[10px]">
                          {m.planBillingType === "monthly" ? "Mensal" : "À vista"}
                        </Badge>
                      )}
                      {(m.planPaymentMethods || []).map((pm) => (
                        <Badge key={pm} variant="outline" className="text-[10px] capitalize">
                          {pm === "credit_card" ? "Cartão" : pm}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
                    <Button size="sm" variant="outline" className="flex-1 min-w-[100px]" onClick={() => openEdit(m)}>
                      <Pencil className="h-3 w-3 mr-1" /> Editar
                    </Button>
                    {m.status !== "active" && (
                      <Button size="sm" className="flex-1 min-w-[100px] bg-emerald-500/90 hover:bg-emerald-500 text-white" onClick={() => quickStatus(m.id, "active")}>
                        <Check className="h-3 w-3 mr-1" /> Ativar
                      </Button>
                    )}
                    {m.status !== "suspended" && (
                      <Button size="sm" variant="outline" className="flex-1 min-w-[100px] text-rose-400 border-rose-500/30 hover:bg-rose-500/10" onClick={() => quickStatus(m.id, "suspended")}>
                        <X className="h-3 w-3 mr-1" /> Bloquear
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* EDIT DIALOG */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="glass-card border-border/60 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display">Editar mentor</DialogTitle>
            <DialogDescription>
              {editing?.brandName || editing?.name} — {editing?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* PLANO */}
            <div className="space-y-3 rounded-lg border border-border/60 p-4 bg-muted/20">
              <div className="text-sm font-semibold flex items-center gap-2">
                <Crown className="h-4 w-4 text-violet-400" /> Plano & Cobrança
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Plano</Label>
                  <Select value={form.planId} onValueChange={(v) => setForm({ ...form, planId: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione um plano" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem plano (free/trial)</SelectItem>
                      {plans.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — {fmtBRL(Number(p.priceMonthly))}/mês
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Tipo de cobrança</Label>
                  <Select
                    value={form.planBillingType || "none"}
                    onValueChange={(v) => setForm({ ...form, planBillingType: v === "none" ? "" : (v as any) })}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Não definido —</SelectItem>
                      <SelectItem value="monthly">Mensal (recorrente)</SelectItem>
                      <SelectItem value="upfront">À vista (pagamento único)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Valor combinado (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={form.planAmount}
                    onChange={(e) => setForm({ ...form, planAmount: e.target.value })}
                    placeholder={editing ? String(editing.planPriceMonthly || "") : "0,00"}
                  />
                  <p className="text-[11px] text-muted-foreground">Em branco = usa preço padrão do plano.</p>
                </div>

                {form.planBillingType === "monthly" ? (
                  <div className="space-y-1.5">
                    <Label>Dia do vencimento (1-28)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={28}
                      value={form.planDueDay}
                      onChange={(e) => setForm({ ...form, planDueDay: e.target.value })}
                      placeholder="Ex: 10"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label>Data de vencimento</Label>
                    <Input
                      type="date"
                      value={form.planExpiresAt}
                      onChange={(e) => setForm({ ...form, planExpiresAt: e.target.value })}
                    />
                    <p className="text-[11px] text-muted-foreground">Para acesso por tempo limitado.</p>
                  </div>
                )}
              </div>

              {form.planBillingType === "monthly" && (
                <div className="space-y-1.5">
                  <Label>Acesso expira em (opcional)</Label>
                  <Input
                    type="date"
                    value={form.planExpiresAt}
                    onChange={(e) => setForm({ ...form, planExpiresAt: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground">Em branco = renovação contínua.</p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Métodos de pagamento aceitos</Label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_METHODS.map((pm) => {
                    const active = form.planPaymentMethods.includes(pm.value);
                    return (
                      <button
                        key={pm.value}
                        type="button"
                        onClick={() => togglePm(pm.value)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/40 border-border hover:border-primary/50"
                        }`}
                      >
                        {active && <Check className="h-3 w-3 inline mr-1" />}
                        {pm.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Observações internas</Label>
                <Input
                  value={form.planNotes}
                  onChange={(e) => setForm({ ...form, planNotes: e.target.value })}
                  placeholder="Ex: Negociado 20% de desconto nos 3 primeiros meses"
                />
              </div>
            </div>

            {/* STATUS */}
            <div className="space-y-1.5">
              <Label>Status de acesso</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="suspended">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={saving} className="bg-gradient-primary hover:opacity-90">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
