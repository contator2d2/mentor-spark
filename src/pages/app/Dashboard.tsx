import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Users, TrendingUp, Calendar, ClipboardList, Loader2 } from "lucide-react";

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    api("/dashboard").then(setData).catch(() => {});
  }, []);

  if (!data) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;

  const cards = [
    { label: "Total de leads", value: data.totalLeads, icon: Users },
    { label: "Mentorados ativos", value: data.clients, icon: TrendingUp },
    { label: "Reuniões realizadas", value: data.meetings, icon: Calendar },
    { label: "Testes aplicados", value: data.tests, icon: ClipboardList },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Visão geral</h1>
        <p className="text-muted-foreground mt-1">Acompanhe a saúde da sua mentoria.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-card border border-border rounded-xl p-5 shadow-soft">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</span>
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="text-3xl font-display font-bold">{c.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-6 shadow-soft">
          <h3 className="font-semibold mb-4">Conversão</h3>
          <div className="text-5xl font-display font-bold text-primary">{data.conversion}%</div>
          <p className="text-sm text-muted-foreground mt-2">Leads convertidos em mentorados.</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 shadow-soft">
          <h3 className="font-semibold mb-4">Temperatura dos leads</h3>
          <div className="space-y-3">
            {[
              { k: "hot", label: "Quente", color: "bg-hot" },
              { k: "warm", label: "Morno", color: "bg-warm" },
              { k: "cold", label: "Frio", color: "bg-cold" },
            ].map((t) => (
              <div key={t.k} className="flex items-center gap-3">
                <span className={`h-3 w-3 rounded-full ${t.color}`} />
                <span className="text-sm flex-1">{t.label}</span>
                <span className="font-semibold">{data.temperature[t.k] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
