import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, DollarSign, TrendingUp, Users, Crown, CalendarClock, AlertTriangle, Sparkles, Wallet,
} from "lucide-react";
import { toast } from "sonner";

interface FinanceData {
  summary: {
    mrr: number;
    arr: number;
    activePaying: number;
    trialing: number;
    pending: number;
    suspended: number;
    totalMentors: number;
    newThisMonth: number;
    expectedThisMonth: number;
    avgRevenuePerMentor: number;
  };
  byPlan: Array<{ planId: string; name: string; price: number; count: number; mrr: number }>;
  upcoming: Array<{
    mentorId: string;
    mentorName: string;
    mentorEmail: string;
    planName: string;
    amount: number;
    dueAt: string;
    daysUntil: number;
  }>;
  generatedAt: string;
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR");
}

export default function AdminFinance() {
  const [data, setData] = useState<FinanceData | null>(null);

  useEffect(() => {
    api<FinanceData>("/admin/finance")
      .then(setData)
      .catch((e) => toast.error(e.message || "Erro ao carregar finanças"));
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const { summary, byPlan, upcoming } = data;
  const maxMrr = Math.max(...byPlan.map((p) => p.mrr), 1);

  return (
    <div className="space-y-8">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-hero border border-border/60 p-8 md:p-10">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />

        <div className="relative">
          <Badge variant="outline" className="mb-3 border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
            <Wallet className="h-3 w-3 mr-1" /> Financeiro
          </Badge>
          <h1 className="text-4xl md:text-5xl font-display tracking-tight text-balance">
            Receita da <span className="text-gradient">plataforma</span>
          </h1>
          <p className="text-muted-foreground mt-2 max-w-lg">
            MRR, ARR, projeções e próximas cobranças dos seus mentores.
          </p>
        </div>

        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
          <KpiCard
            label="MRR" value={fmtBRL(summary.mrr)} sub="Receita recorrente mensal"
            icon={DollarSign} glow="text-emerald-400" delay={100}
          />
          <KpiCard
            label="ARR" value={fmtBRL(summary.arr)} sub="Projeção anual"
            icon={TrendingUp} glow="text-violet-400" delay={200}
          />
          <KpiCard
            label="Pagantes ativos" value={String(summary.activePaying)}
            sub={`${summary.trialing} em trial`}
            icon={Crown} glow="text-amber-400" delay={300}
          />
          <KpiCard
            label="Receita média / mentor" value={fmtBRL(summary.avgRevenuePerMentor)}
            sub="ARPU mensal"
            icon={Sparkles} glow="text-foreground" delay={400}
          />
        </div>
      </div>

      {/* SECONDARY KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="Total mentores" value={summary.totalMentors} icon={Users} />
        <MiniStat label="Novos no mês" value={summary.newThisMonth} icon={TrendingUp} accent="text-emerald-400" />
        <MiniStat label="Esperado este mês" value={fmtBRL(summary.expectedThisMonth)} icon={CalendarClock} accent="text-violet-400" />
        <MiniStat label="Bloqueados" value={summary.suspended} icon={AlertTriangle} accent="text-rose-400" />
      </div>

      {/* RECEITA POR PLANO */}
      <Card className="glass-card border-border/60">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl">Receita por plano</h2>
              <p className="text-xs text-muted-foreground">Distribuição do MRR entre seus planos.</p>
            </div>
          </div>

          {byPlan.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhum mentor com plano pago ativo ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {byPlan.map((p) => {
                const pct = (p.mrr / maxMrr) * 100;
                return (
                  <div key={p.planId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{p.name}</span>
                        <Badge variant="outline" className="text-[10px]">{p.count} mentor{p.count !== 1 && "es"}</Badge>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{fmtBRL(p.mrr)}</div>
                        <div className="text-[10px] text-muted-foreground">{fmtBRL(p.price)}/mês cada</div>
                      </div>
                    </div>
                    <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* COBRANÇAS FUTURAS */}
      <Card className="glass-card border-border/60">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl">Próximas cobranças</h2>
              <p className="text-xs text-muted-foreground">Renovações de plano nos próximos 60 dias.</p>
            </div>
            <Badge variant="outline">{upcoming.length}</Badge>
          </div>

          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Sem cobranças programadas. Defina datas de expiração nos planos dos mentores para ver aqui.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border/40">
                    <th className="text-left py-2 font-medium">Mentor</th>
                    <th className="text-left py-2 font-medium">Plano</th>
                    <th className="text-right py-2 font-medium">Valor</th>
                    <th className="text-right py-2 font-medium">Vencimento</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((u) => {
                    const overdue = u.daysUntil < 0;
                    const soon = u.daysUntil >= 0 && u.daysUntil <= 7;
                    const cls = overdue
                      ? "text-rose-400"
                      : soon
                      ? "text-amber-400"
                      : "text-muted-foreground";
                    return (
                      <tr key={`${u.mentorId}-${u.dueAt}`} className="border-b border-border/20 hover:bg-muted/20">
                        <td className="py-3">
                          <div className="font-medium">{u.mentorName}</div>
                          <div className="text-xs text-muted-foreground">{u.mentorEmail}</div>
                        </td>
                        <td className="py-3">{u.planName}</td>
                        <td className="py-3 text-right font-semibold">{fmtBRL(u.amount)}</td>
                        <td className={`py-3 text-right ${cls}`}>
                          <div className="font-medium">{fmtDate(u.dueAt)}</div>
                          <div className="text-[10px]">
                            {overdue
                              ? `${Math.abs(u.daysUntil)}d em atraso`
                              : u.daysUntil === 0
                              ? "Hoje"
                              : `em ${u.daysUntil}d`}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  label, value, sub, icon: Icon, glow, delay,
}: { label: string; value: string; sub: string; icon: any; glow: string; delay: number }) {
  return (
    <div className={`glass-card rounded-2xl p-4 animate-fade-in`} style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon className={`h-4 w-4 ${glow}`} />
      </div>
      <div className={`text-2xl md:text-3xl font-display font-bold mt-1 ${glow}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}

function MiniStat({
  label, value, icon: Icon, accent = "text-foreground",
}: { label: string; value: string | number; icon: any; accent?: string }) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon className={`h-4 w-4 ${accent}`} />
      </div>
      <div className={`text-xl font-display font-bold mt-1 ${accent}`}>{value}</div>
    </div>
  );
}
