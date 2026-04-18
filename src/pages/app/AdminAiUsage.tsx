import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Cpu, TrendingUp, Power, AlertCircle, Activity, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface UsageItem {
  mentorId: string;
  mentorName: string;
  email: string;
  aiEnabled: boolean;
  monthlyTokenLimit: number | null;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  calls: number;
  errors: number;
  lastUsedAt: string | null;
}

interface UsageData {
  window: number;
  since: string;
  total: { totalTokens: number; promptTokens: number; completionTokens: number; calls: number; errors: number };
  items: UsageItem[];
}

interface DetailLog {
  id: string;
  providerName?: string;
  model?: string;
  useCase: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs?: number;
  success: boolean;
  errorMessage?: string;
  createdAt: string;
}

function fmtNum(n: number) { return n.toLocaleString("pt-BR"); }

export default function AdminAiUsage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [days, setDays] = useState("30");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<{ mentor: any; logs: DetailLog[]; aiEnabled: boolean; monthlyTokenLimit: number | null } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  async function load() {
    try {
      const r = await api<UsageData>(`/admin/ai-usage?days=${days}`);
      setData(r);
    } catch (e: any) { toast.error(e.message); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [days]);

  async function toggleAi(item: UsageItem, value: boolean) {
    try {
      await api(`/admin/ai-usage/${item.mentorId}`, { method: "PATCH", body: { aiEnabled: value } });
      setData((d) => d ? { ...d, items: d.items.map((x) => x.mentorId === item.mentorId ? { ...x, aiEnabled: value } : x) } : d);
      toast.success(value ? "IA ativada para o tenant" : "IA desativada");
    } catch (e: any) { toast.error(e.message); }
  }

  async function setLimit(item: UsageItem, raw: string) {
    const value = raw ? parseInt(raw, 10) : null;
    try {
      await api(`/admin/ai-usage/${item.mentorId}`, { method: "PATCH", body: { monthlyTokenLimit: value } });
      setData((d) => d ? { ...d, items: d.items.map((x) => x.mentorId === item.mentorId ? { ...x, monthlyTokenLimit: value } : x) } : d);
      toast.success("Limite atualizado");
    } catch (e: any) { toast.error(e.message); }
  }

  async function openDetail(mentorId: string) {
    setLoadingDetail(true);
    try {
      const r = await api<any>(`/admin/ai-usage/${mentorId}?limit=100`);
      setDetail(r);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoadingDetail(false); }
  }

  if (!data) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const filtered = data.items.filter((i) =>
    !search ||
    i.mentorName.toLowerCase().includes(search.toLowerCase()) ||
    i.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Cpu className="h-7 w-7 text-primary" /> Consumo de Tokens IA
          </h1>
          <p className="text-muted-foreground mt-1">Monitore o consumo de IA por tenant para monetização futura.</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Últimas 24h</SelectItem>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={TrendingUp} label="Tokens consumidos" value={fmtNum(data.total.totalTokens)} accent="text-primary" />
        <StatCard icon={Activity} label="Chamadas" value={fmtNum(data.total.calls)} accent="text-emerald-400" />
        <StatCard icon={Cpu} label="Tenants ativos" value={fmtNum(data.items.filter((i) => i.calls > 0).length)} accent="text-violet-400" />
        <StatCard icon={AlertCircle} label="Erros" value={fmtNum(data.total.errors)} accent="text-rose-400" />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar tenant..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr className="text-xs uppercase text-muted-foreground">
                <th className="text-left px-4 py-3">Tenant</th>
                <th className="text-right px-2 py-3">Tokens</th>
                <th className="text-right px-2 py-3">Chamadas</th>
                <th className="text-right px-2 py-3">Erros</th>
                <th className="text-left px-2 py-3">Limite/mês</th>
                <th className="text-left px-2 py-3">Último uso</th>
                <th className="text-center px-2 py-3">IA</th>
                <th className="px-2 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => {
                const overLimit = i.monthlyTokenLimit && i.totalTokens > i.monthlyTokenLimit;
                return (
                  <tr key={i.mentorId} className="border-b border-border/40 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="font-medium">{i.mentorName}</div>
                      <div className="text-xs text-muted-foreground">{i.email}</div>
                    </td>
                    <td className="text-right px-2 py-3 font-mono">
                      <div className={overLimit ? "text-rose-400 font-semibold" : ""}>{fmtNum(i.totalTokens)}</div>
                      <div className="text-[10px] text-muted-foreground">in {fmtNum(i.promptTokens)} · out {fmtNum(i.completionTokens)}</div>
                    </td>
                    <td className="text-right px-2 py-3 font-mono">{fmtNum(i.calls)}</td>
                    <td className="text-right px-2 py-3 font-mono">
                      {i.errors > 0 ? <span className="text-rose-400">{i.errors}</span> : <span className="text-muted-foreground">0</span>}
                    </td>
                    <td className="px-2 py-3">
                      <Input
                        type="number"
                        defaultValue={i.monthlyTokenLimit ?? ""}
                        placeholder="Sem limite"
                        className="h-7 w-28 text-xs"
                        onBlur={(e) => { if (e.target.value !== String(i.monthlyTokenLimit ?? "")) setLimit(i, e.target.value); }}
                      />
                    </td>
                    <td className="px-2 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {i.lastUsedAt ? new Date(i.lastUsedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="text-center px-2 py-3">
                      <Switch checked={i.aiEnabled} onCheckedChange={(v) => toggleAi(i, v)} />
                    </td>
                    <td className="px-2 py-3">
                      <Button size="sm" variant="ghost" onClick={() => openDetail(i.mentorId)}>Detalhes</Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">Nenhum tenant encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle>Histórico — {detail?.mentor?.name}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto px-6 pb-4 flex-1">
            {loadingDetail ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-muted-foreground uppercase text-[10px]">
                  <tr>
                    <th className="text-left py-2">Quando</th>
                    <th className="text-left py-2">Caso de uso</th>
                    <th className="text-left py-2">Modelo</th>
                    <th className="text-right py-2">Tokens</th>
                    <th className="text-right py-2">Latência</th>
                    <th className="text-center py-2">OK</th>
                  </tr>
                </thead>
                <tbody>
                  {detail?.logs.map((l) => (
                    <tr key={l.id} className="border-t border-border/40">
                      <td className="py-2 whitespace-nowrap">{new Date(l.createdAt).toLocaleString("pt-BR")}</td>
                      <td className="py-2"><Badge variant="outline" className="text-[10px]">{l.useCase}</Badge></td>
                      <td className="py-2 text-muted-foreground truncate max-w-[160px]">{l.model || "—"}</td>
                      <td className="py-2 text-right font-mono">{fmtNum(l.totalTokens)}</td>
                      <td className="py-2 text-right text-muted-foreground">{l.latencyMs ? `${l.latencyMs}ms` : "—"}</td>
                      <td className="py-2 text-center">{l.success ? "✅" : <span title={l.errorMessage}>❌</span>}</td>
                    </tr>
                  ))}
                  {detail?.logs.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">Sem registros.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
          <Icon className={`h-4 w-4 ${accent}`} />
        </div>
        <div className={`text-2xl font-display font-bold mt-1 ${accent}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
