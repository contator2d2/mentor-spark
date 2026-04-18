import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Users,
  TrendingUp,
  Calendar,
  ClipboardList,
  Loader2,
  ArrowUpRight,
  Flame,
  Sparkles,
  Activity,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api("/dashboard").then(setData).catch(() => {});
  }, []);

  if (!data)
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  const cards = [
    {
      label: "Total de leads",
      value: data.totalLeads,
      icon: Users,
      gradient: "from-violet-500/20 to-purple-500/5",
      iconColor: "text-violet-400",
      to: "/app/leads",
      delta: "+12%",
    },
    {
      label: "Mentorados ativos",
      value: data.clients,
      icon: TrendingUp,
      gradient: "from-cyan-500/20 to-blue-500/5",
      iconColor: "text-cyan-400",
      to: "/app/mentorados",
      delta: "+5%",
    },
    {
      label: "Reuniões realizadas",
      value: data.meetings,
      icon: Calendar,
      gradient: "from-emerald-500/20 to-green-500/5",
      iconColor: "text-emerald-400",
      to: "/app/meetings",
      delta: "+8%",
    },
    {
      label: "Testes aplicados",
      value: data.tests,
      icon: ClipboardList,
      gradient: "from-amber-500/20 to-orange-500/5",
      iconColor: "text-amber-400",
      to: "/app/tests",
      delta: "+18%",
    },
  ];

  const tempItems = [
    { k: "hot", label: "Quente", color: "bg-hot", glow: "shadow-[0_0_20px_hsl(var(--hot)/0.5)]" },
    { k: "warm", label: "Morno", color: "bg-warm", glow: "shadow-[0_0_20px_hsl(var(--warm)/0.4)]" },
    { k: "cold", label: "Frio", color: "bg-cold", glow: "shadow-[0_0_20px_hsl(var(--cold)/0.4)]" },
  ];

  const total =
    (data.temperature?.hot || 0) + (data.temperature?.warm || 0) + (data.temperature?.cold || 0);

  return (
    <div className="space-y-8 relative">
      {/* Animated background blobs */}
      <div className="blob bg-primary/30 w-96 h-96 -top-20 -right-20" />
      <div className="blob bg-secondary/20 w-80 h-80 top-40 -left-20 anim-delay-200" />

      {/* Hero header */}
      <div className="relative animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-card text-xs text-muted-foreground mb-4">
          <Sparkles className="h-3 w-3 text-primary" />
          <span>
            Olá, <span className="text-foreground font-medium">{user?.name?.split(" ")[0] || "Mentor"}</span>
          </span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
          Visão <span className="text-gradient">geral</span>
        </h1>
        <p className="text-muted-foreground mt-2 text-base max-w-2xl">
          A saúde da sua mentoria em tempo real — leads, conversões e engajamento dos mentorados.
        </p>
      </div>

      {/* KPI cards com stagger */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.label}
              to={c.to}
              className={`group relative glass-card glass-card-hover rounded-2xl p-5 overflow-hidden animate-slide-up anim-delay-${(i + 1) * 100}`}
            >
              {/* Gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient} opacity-50 group-hover:opacity-100 transition-opacity`} />

              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className={`h-10 w-10 rounded-xl bg-card/60 backdrop-blur flex items-center justify-center ${c.iconColor} group-hover:scale-110 transition-transform`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
                </div>

                <div className="text-3xl md:text-4xl font-display font-bold tracking-tight">
                  {c.value}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">{c.label}</span>
                  <span className="text-[10px] text-emerald-400 font-medium tabular-nums">{c.delta}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Conversion + Temperature row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Conversion big card */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-8 relative overflow-hidden animate-slide-up anim-delay-500">
          <div className="absolute inset-0 bg-gradient-glow opacity-60" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Taxa de Conversão
              </span>
            </div>
            <div className="flex items-baseline gap-3 mt-4">
              <span className="text-7xl md:text-8xl font-display font-bold text-gradient">
                {data.conversion}
              </span>
              <span className="text-3xl font-display text-muted-foreground">%</span>
            </div>
            <p className="text-sm text-muted-foreground mt-3 max-w-md">
              Leads convertidos em mentorados nos últimos 30 dias.
            </p>

            {/* Progress bar */}
            <div className="mt-6">
              <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-primary rounded-full transition-all duration-1000 shadow-glow"
                  style={{ width: `${Math.min(data.conversion, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-muted-foreground tabular-nums">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Temperature breakdown */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden animate-slide-up anim-delay-600">
          <div className="flex items-center gap-2 mb-5">
            <Flame className="h-4 w-4 text-hot" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Temperatura
            </span>
          </div>
          <div className="space-y-4">
            {tempItems.map((t) => {
              const v = data.temperature?.[t.k] || 0;
              const pct = total ? (v / total) * 100 : 0;
              return (
                <div key={t.k} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${t.color} ${t.glow}`} />
                      <span className="text-sm">{t.label}</span>
                    </div>
                    <span className="text-sm font-display font-semibold tabular-nums">{v}</span>
                  </div>
                  <div className="h-1 bg-muted/40 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${t.color} rounded-full transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
