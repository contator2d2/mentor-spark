import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Download, TrendingUp, Loader2, DollarSign, Users, Activity } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell,
} from "recharts";
import { toast } from "sonner";

const STAGE_LABEL: Record<string, string> = {
  new: "Novos", tested: "Testados", engaged: "Engajados",
  negotiating: "Negociando", client: "Mentorados", lost: "Perdidos",
};
const STAGE_COLOR: Record<string, string> = {
  new: "#94a3b8", tested: "#a78bfa", engaged: "#22d3ee",
  negotiating: "#fbbf24", client: "#10b981", lost: "#ef4444",
};
const BOOKING_LABEL: Record<string, string> = {
  pending: "Pendentes", confirmed: "Confirmados", cancelled: "Cancelados",
  completed: "Concluídos", no_show: "No-show",
};

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setData(await api(`/dashboard/analytics?days=${days}`));
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }
  useEffect(() => { load(); }, [days]);

  function exportCSV() {
    if (!data) return;
    const rows: string[] = [];
    rows.push("Métrica,Valor");
    rows.push(`Receita total,R$ ${data.revenue.total.toFixed(2)}`);
    rows.push(`MRR,R$ ${data.revenue.mrr.toFixed(2)}`);
    rows.push(`LTV médio,R$ ${data.revenue.ltv.toFixed(2)}`);
    rows.push(`Inadimplência,R$ ${data.revenue.overdue.toFixed(2)}`);
    rows.push(`Pendente,R$ ${data.revenue.pending.toFixed(2)}`);
    rows.push(`Mentorados ativos,${data.activeClients}`);
    rows.push("");
    rows.push("Funil,Quantidade");
    Object.entries(data.funnel).forEach(([k, v]) => rows.push(`${STAGE_LABEL[k] || k},${v}`));
    rows.push("");
    rows.push("Mês,Receita");
    data.revenue.byMonth.forEach((m: any) => rows.push(`${m.month},R$ ${m.value.toFixed(2)}`));
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading || !data) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const funnelData = Object.entries(data.funnel).map(([k, v]) => ({
    stage: STAGE_LABEL[k] || k, count: v as number, color: STAGE_COLOR[k],
  }));
  const tsData = data.timeseries.leads.map((l: any) => ({
    day: l.day.slice(5),
    leads: l.count,
    clients: data.timeseries.clients.find((c: any) => c.day === l.day)?.count || 0,
  }));
  const bookingsData = data.bookings.map((b: any) => ({
    name: BOOKING_LABEL[b.status] || b.status, value: b.count,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" /> Analytics avançado
          </h1>
          <p className="text-muted-foreground">Funil, receita, LTV e tendências.</p>
        </div>
        <div className="flex gap-2">
          <Select value={String(days)} onValueChange={(v) => setDays(+v)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
              <SelectItem value="180">6 meses</SelectItem>
              <SelectItem value="365">1 ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1" />Exportar CSV</Button>
        </div>
      </div>

      {/* KPIs financeiros */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" />Receita total</div>
          <div className="text-2xl font-display font-bold mt-1">R$ {data.revenue.total.toFixed(2)}</div>
        </Card>
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="text-xs text-muted-foreground">MRR ativo</div>
          <div className="text-2xl font-display font-bold mt-1 text-primary">R$ {data.revenue.mrr.toFixed(2)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" />LTV médio</div>
          <div className="text-2xl font-display font-bold mt-1">R$ {data.revenue.ltv.toFixed(2)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Pendente</div>
          <div className="text-2xl font-display font-bold mt-1 text-amber-500">R$ {data.revenue.pending.toFixed(2)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Inadimplência</div>
          <div className="text-2xl font-display font-bold mt-1 text-destructive">R$ {data.revenue.overdue.toFixed(2)}</div>
        </Card>
      </div>

      {/* Receita por mês */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Receita mensal (12 meses)</h2>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data.revenue.byMonth}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
              formatter={(v: any) => `R$ ${Number(v).toFixed(2)}`}
            />
            <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#revGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Funil */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Funil de conversão</h2>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={funnelData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis type="category" dataKey="stage" stroke="hsl(var(--muted-foreground))" fontSize={11} width={90} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                {funnelData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Bookings por status */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Agendamentos por status</h2>
          </div>
          {bookingsData.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 text-sm">Sem agendamentos ainda.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={bookingsData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {bookingsData.map((_: any, i: number) => (
                    <Cell key={i} fill={["#10b981", "#fbbf24", "#ef4444", "#6366f1", "#94a3b8"][i % 5]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Evolução leads x conversões */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Leads x Conversões em mentorados</h2>
        </div>
        {tsData.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 text-sm">Sem dados no período.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={tsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend />
              <Line type="monotone" dataKey="leads" stroke="#a78bfa" strokeWidth={2} name="Novos leads" dot={false} />
              <Line type="monotone" dataKey="clients" stroke="#10b981" strokeWidth={2} name="Viraram mentorado" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}
