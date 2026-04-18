import { useEffect, useMemo, useState } from "react";
import { api, setToken } from "@/lib/api";
import { toast } from "sonner";
import {
  Loader2, Building2, Settings2, KeyRound, LogIn, ShieldAlert,
  CreditCard, Copy, ExternalLink, UserCog, AlertTriangle, CheckCircle2, Clock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

interface Tenant {
  id: string;
  name: string;
  email: string;
  slug?: string;
  brandName?: string;
  brandLogoUrl?: string;
  brandPrimaryColor?: string;
  customDomain?: string;
  status: string;
  createdAt: string;
  metrics: { leads: number; mentorados: number; tests: number; meetings: number };
}

interface TenantDetail extends Tenant {
  phone?: string;
  role: string;
  mustChangePassword?: boolean;
  credentialsSentAt?: string;
  onboardingCompleted?: boolean;
  planId?: string | null;
  planName?: string | null;
  planPriceMonthly?: number;
  planExpiresAt?: string | null;
  planAmount?: number | null;
  planDueDay?: number | null;
  planNotes?: string | null;
  metrics: { leads: number; mentorados: number; tests: number; meetings: number; team?: number };
  recentCharges?: Array<{
    id: string; description: string; amount: number; status: string;
    method: string; dueDate: string; paidAt?: string; invoiceUrl?: string;
  }>;
}

interface Plan { id: string; name: string; priceMonthly: number; }

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin", mentor: "Mentor", mentor_team: "Equipe do mentor",
  mentorado: "Mentorado", prospect: "Prospect (lead)",
};

export default function AdminTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<TenantDetail | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);

  async function loadTenants() {
    try {
      const list = await api<Tenant[]>("/admin/tenants");
      setTenants(list);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    loadTenants();
    api<Plan[]>("/admin/plans").catch(() => api<Plan[]>("/plans")).then(setPlans).catch(() => {});
  }, []);

  async function openTenant(id: string) {
    setOpenId(id);
    setSelected(null);
    try {
      const detail = await api<TenantDetail>(`/admin/tenants/${id}`);
      setSelected(detail);
    } catch (e: any) { toast.error(e.message); setOpenId(null); }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return tenants;
    const s = search.toLowerCase();
    return tenants.filter(t =>
      (t.name || "").toLowerCase().includes(s) ||
      (t.email || "").toLowerCase().includes(s) ||
      (t.brandName || "").toLowerCase().includes(s) ||
      (t.slug || "").toLowerCase().includes(s)
    );
  }, [tenants, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-accent" />
          <div>
            <h1 className="font-display text-3xl font-bold">Tenants (Mentores)</h1>
            <p className="text-muted-foreground">Gestão completa: plano, senha, acesso, cobranças.</p>
          </div>
        </div>
        <Input
          placeholder="Buscar por nome, email, slug…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {loading ? (
        <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin inline" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((t) => (
            <div key={t.id} className="bg-card border border-border rounded-xl p-5 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {t.brandLogoUrl ? (
                    <img src={t.brandLogoUrl} alt={t.brandName} className="h-10 w-10 rounded object-contain bg-muted" />
                  ) : (
                    <div
                      className="h-10 w-10 rounded flex items-center justify-center text-white font-bold flex-shrink-0"
                      style={{ background: t.brandPrimaryColor || "hsl(var(--primary))" }}
                    >
                      {(t.brandName || t.name)[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{t.brandName || t.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.email} · /c/{t.slug}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={t.status === "active" ? "default" : "outline"}>{t.status}</Badge>
                  <Button size="sm" variant="outline" onClick={() => openTenant(t.id)}>
                    <Settings2 className="h-3.5 w-3.5 mr-1" />Gerenciar
                  </Button>
                </div>
              </div>
              {t.customDomain && (
                <div className="text-xs text-muted-foreground mt-2">Domínio: {t.customDomain}</div>
              )}
              <div className="grid grid-cols-4 gap-2 mt-4 text-center">
                <Metric label="Leads" value={t.metrics.leads} />
                <Metric label="Mentorados" value={t.metrics.mentorados} />
                <Metric label="Testes" value={t.metrics.tests} />
                <Metric label="Reuniões" value={t.metrics.meetings} />
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-muted-foreground col-span-full text-center py-12">
              Nenhum mentor encontrado.
            </div>
          )}
        </div>
      )}

      <Dialog open={!!openId} onOpenChange={(o) => { if (!o) { setOpenId(null); setSelected(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar tenant</DialogTitle>
            <DialogDescription>
              {selected ? `${selected.brandName || selected.name} · ${selected.email}` : "Carregando…"}
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <TenantManager
              tenant={selected}
              plans={plans}
              onChange={async () => {
                await openTenant(selected.id);
                loadTenants();
              }}
            />
          ) : (
            <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin inline" /></div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted/40 rounded-md py-2">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

// ============= Manager dialog content =============
function TenantManager({ tenant, plans, onChange }: { tenant: TenantDetail; plans: Plan[]; onChange: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [planId, setPlanId] = useState(tenant.planId || "");
  const [planExpiresAt, setPlanExpiresAt] = useState(
    tenant.planExpiresAt ? tenant.planExpiresAt.slice(0, 10) : ""
  );
  const [planAmount, setPlanAmount] = useState(tenant.planAmount?.toString() || "");
  const [planDueDay, setPlanDueDay] = useState(tenant.planDueDay?.toString() || "");
  const [status, setStatus] = useState(tenant.status);
  const [role, setRole] = useState(tenant.role);
  const [tempPwd, setTempPwd] = useState<string | null>(null);

  // Charge form
  const [chargeMethod, setChargeMethod] = useState<"pix" | "boleto" | "credit_card">("pix");
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeDue, setChargeDue] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [chargeDesc, setChargeDesc] = useState("");
  const [chargeAsaas, setChargeAsaas] = useState(true);

  async function savePlan() {
    setBusy("plan");
    try {
      await api(`/admin/mentors/${tenant.id}`, {
        method: "PATCH",
        body: {
          planId: planId || null,
          planExpiresAt: planExpiresAt || null,
          status,
          planAmount: planAmount ? Number(planAmount) : null,
          planDueDay: planDueDay ? Number(planDueDay) : null,
        },
      });
      toast.success("Plano atualizado");
      onChange();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  }

  async function changeRole() {
    if (!confirm(`Alterar role para "${ROLE_LABELS[role]}"?`)) return;
    setBusy("role");
    try {
      await api(`/admin/users/${tenant.id}/role`, {
        method: "PATCH",
        body: { role },
      });
      toast.success("Role atualizada. O usuário precisa relogar.");
      onChange();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  }

  async function resetPassword() {
    if (!confirm("Resetar a senha? Será gerada uma senha temporária e enviada por email/WhatsApp.")) return;
    setBusy("reset");
    try {
      const r = await api<{ tempPassword: string }>(`/admin/users/${tenant.id}/reset-password`, {
        method: "POST",
      });
      setTempPwd(r.tempPassword);
      toast.success("Senha resetada e enviada!");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  }

  async function impersonate() {
    if (!confirm(`Logar como ${tenant.name}? Sua sessão atual será substituída.`)) return;
    setBusy("imp");
    try {
      const r = await api<{ access_token: string }>(`/admin/users/${tenant.id}/impersonate`, {
        method: "POST",
      });
      setToken(r.access_token);
      toast.success("Login realizado. Redirecionando…");
      setTimeout(() => { window.location.href = "/app"; }, 600);
    } catch (e: any) { toast.error(e.message); setBusy(null); }
  }

  async function sendCharge() {
    setBusy("charge");
    try {
      await api(`/admin/mentors/${tenant.id}/charge-plan`, {
        method: "POST",
        body: {
          method: chargeMethod,
          amount: chargeAmount ? Number(chargeAmount) : undefined,
          dueDate: chargeDue,
          description: chargeDesc || undefined,
          createInAsaas: chargeAsaas,
        },
      });
      toast.success("Cobrança criada!");
      setChargeAmount(""); setChargeDesc("");
      onChange();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  }

  return (
    <Tabs defaultValue="plan" className="w-full">
      <TabsList className="grid grid-cols-4 w-full">
        <TabsTrigger value="plan"><CreditCard className="h-4 w-4 mr-1" />Plano</TabsTrigger>
        <TabsTrigger value="access"><KeyRound className="h-4 w-4 mr-1" />Acesso</TabsTrigger>
        <TabsTrigger value="role"><UserCog className="h-4 w-4 mr-1" />Tipo</TabsTrigger>
        <TabsTrigger value="charges"><CreditCard className="h-4 w-4 mr-1" />Cobranças</TabsTrigger>
      </TabsList>

      {/* ====== PLANO ====== */}
      <TabsContent value="plan" className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Plano</Label>
            <Select value={planId || "none"} onValueChange={(v) => setPlanId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem plano</SelectItem>
                {plans.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — R$ {Number(p.priceMonthly).toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="suspended">Suspenso</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Expira em</Label>
            <Input type="date" value={planExpiresAt} onChange={(e) => setPlanExpiresAt(e.target.value)} />
          </div>
          <div>
            <Label>Valor combinado (R$)</Label>
            <Input type="number" step="0.01" value={planAmount} onChange={(e) => setPlanAmount(e.target.value)} placeholder="opcional" />
          </div>
          <div>
            <Label>Dia de vencimento (1-28)</Label>
            <Input type="number" min={1} max={28} value={planDueDay} onChange={(e) => setPlanDueDay(e.target.value)} />
          </div>
        </div>
        <Button onClick={savePlan} disabled={busy === "plan"} className="w-full">
          {busy === "plan" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Salvar plano
        </Button>
      </TabsContent>

      {/* ====== ACESSO / SENHA ====== */}
      <TabsContent value="access" className="space-y-4 pt-4">
        <div className="bg-muted/40 rounded-lg p-4 text-sm space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Criado em: <strong>{new Date(tenant.createdAt).toLocaleString("pt-BR")}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            {tenant.mustChangePassword ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
            <span>{tenant.mustChangePassword ? "Aguardando troca de senha no próximo login" : "Senha personalizada"}</span>
          </div>
          {tenant.credentialsSentAt && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Últimas credenciais enviadas em: {new Date(tenant.credentialsSentAt).toLocaleString("pt-BR")}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Onboarding: {tenant.onboardingCompleted ? "✅ concluído" : "⏳ pendente"}</span>
          </div>
        </div>

        {tempPwd && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
            <div className="font-semibold mb-1 flex items-center gap-2">
              <KeyRound className="h-4 w-4" />Senha temporária gerada
            </div>
            <div className="flex items-center gap-2">
              <code className="bg-background px-2 py-1 rounded font-mono text-base flex-1">{tempPwd}</code>
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(tempPwd); toast.success("Copiado"); }}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Já foi enviada por email/WhatsApp. O usuário precisa trocá-la no primeiro login.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button variant="outline" onClick={resetPassword} disabled={busy === "reset"}>
            {busy === "reset" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
            Resetar senha
          </Button>
          <Button variant="outline" onClick={impersonate} disabled={busy === "imp"}>
            {busy === "imp" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
            Logar como este usuário
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          ⚠️ "Logar como" substitui sua sessão atual. Faça logout e relogue como super admin para voltar.
        </p>
      </TabsContent>

      {/* ====== ROLE / TIPO DE ACESSO ====== */}
      <TabsContent value="role" className="space-y-4 pt-4">
        <div className="bg-muted/40 rounded-lg p-4 text-sm">
          <div className="text-xs text-muted-foreground mb-1">Role atual</div>
          <Badge variant="secondary" className="text-base">{ROLE_LABELS[tenant.role] || tenant.role}</Badge>
        </div>

        <div>
          <Label>Alterar para</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mentor">Mentor</SelectItem>
              <SelectItem value="mentorado">Mentorado</SelectItem>
              <SelectItem value="prospect">Prospect (lead)</SelectItem>
              <SelectItem value="mentor_team">Equipe do mentor</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs flex gap-2">
          <ShieldAlert className="h-4 w-4 flex-shrink-0 text-amber-500" />
          <div>
            <strong>Atenção:</strong> alterar a role muda completamente o acesso do usuário.
            Se um mentorado virou super admin por engano, mude aqui para <code>mentorado</code>.
            O usuário precisa fazer logout/login para a nova role refletir.
          </div>
        </div>

        <Button onClick={changeRole} disabled={busy === "role" || role === tenant.role} className="w-full">
          {busy === "role" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Aplicar nova role
        </Button>
      </TabsContent>

      {/* ====== COBRANÇAS ====== */}
      <TabsContent value="charges" className="space-y-4 pt-4">
        <div className="bg-muted/40 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <CreditCard className="h-4 w-4" />Nova cobrança da mensalidade
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Método</Label>
              <Select value={chargeMethod} onValueChange={(v: any) => setChargeMethod(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="credit_card">Cartão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vencimento</Label>
              <Input type="date" value={chargeDue} onChange={(e) => setChargeDue(e.target.value)} />
            </div>
            <div>
              <Label>Valor (R$) — vazio usa o do plano</Label>
              <Input type="number" step="0.01" value={chargeAmount} onChange={(e) => setChargeAmount(e.target.value)} placeholder={`${tenant.planAmount ?? tenant.planPriceMonthly ?? 0}`} />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input value={chargeDesc} onChange={(e) => setChargeDesc(e.target.value)} placeholder={`Mensalidade ${tenant.planName || ""}`} />
            </div>
          </div>
          <div className="flex items-center justify-between bg-background rounded p-2">
            <div>
              <Label className="text-xs">Gerar no Asaas (link de pagamento real)</Label>
              <p className="text-[10px] text-muted-foreground">Se desligado, cria apenas registro interno.</p>
            </div>
            <Switch checked={chargeAsaas} onCheckedChange={setChargeAsaas} />
          </div>
          <Button onClick={sendCharge} disabled={busy === "charge"} className="w-full">
            {busy === "charge" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
            Enviar cobrança
          </Button>
        </div>

        <div>
          <h3 className="font-semibold mb-2 text-sm">Últimas cobranças</h3>
          {!tenant.recentCharges?.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Sem cobranças ainda.</p>
          ) : (
            <div className="space-y-2">
              {tenant.recentCharges.map((c) => (
                <div key={c.id} className="flex items-center justify-between bg-card border border-border rounded-md p-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{c.description}</div>
                    <div className="text-xs text-muted-foreground">
                      Venc: {new Date(c.dueDate).toLocaleDateString("pt-BR")} · {c.method.toUpperCase()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">R$ {Number(c.amount).toFixed(2)}</span>
                    <Badge variant={c.status === "paid" ? "default" : c.status === "overdue" ? "destructive" : "outline"}>
                      {c.status}
                    </Badge>
                    {c.invoiceUrl && (
                      <a href={c.invoiceUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
