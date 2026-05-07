import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Globe, RefreshCw, CheckCircle2, AlertTriangle, Rocket, Copy } from "lucide-react";
import { toast } from "sonner";

interface DomainRow {
  mentorId: string;
  mentorName: string;
  mentorEmail: string;
  brandName?: string;
  brandLogoUrl?: string;
  mentorStatus: string;
  domain: string;
  createdAt: string;
  dnsIps: string[];
  dnsCnames: string[];
  dnsError?: string;
  dnsOk: boolean;
  expectedIp: string | null;
}
interface DomainsResponse {
  expectedIp: string | null;
  easypanelConfigured: boolean;
  domains: DomainRow[];
}

export default function AdminDomainsPage() {
  const [data, setData] = useState<DomainsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    try { setData(await api<DomainsResponse>("/admin/domains")); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function recheck(mentorId: string) {
    setBusy((b) => ({ ...b, [mentorId]: true }));
    try {
      const r = await api<any>(`/admin/domains/${mentorId}/check`);
      setData((d) => d ? {
        ...d,
        domains: d.domains.map((x) => x.mentorId === mentorId
          ? { ...x, dnsIps: r.dnsIps, dnsCnames: r.dnsCnames, dnsError: r.dnsError, dnsOk: r.dnsOk }
          : x),
      } : d);
      toast.success(r.dnsOk ? "DNS apontando corretamente" : "DNS ainda não propagou");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy((b) => ({ ...b, [mentorId]: false })); }
  }

  async function publish(mentorId: string, force = false) {
    setBusy((b) => ({ ...b, [mentorId]: true }));
    try {
      await api(`/admin/domains/${mentorId}/publish`, { method: "POST", body: { force } });
      toast.success("Domínio publicado no Easypanel — SSL será emitido em alguns minutos.");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy((b) => ({ ...b, [mentorId]: false })); }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copiado");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Globe className="h-7 w-7 text-primary" /> Domínios dos mentores
          </h1>
          <p className="text-muted-foreground mt-1">
            Aprove e publique domínios próprios apontados pelos mentores.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Atualizar
        </Button>
      </div>

      <Card className="glass-card">
        <CardContent className="p-5 grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground text-xs uppercase tracking-wider">IP do servidor (esperado)</div>
            <div className="font-mono font-semibold mt-1 flex items-center gap-2">
              {data?.expectedIp || <span className="text-amber-400">Não configurado (defina APP_SERVER_IP no backend)</span>}
              {data?.expectedIp && (
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copy(data.expectedIp!)}>
                  <Copy className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs uppercase tracking-wider">Easypanel API</div>
            <div className="mt-1">
              {data?.easypanelConfigured ? (
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Configurado — publicação 1 clique disponível</Badge>
              ) : (
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30">Não configurado — botão de publicar ficará indisponível</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {!data ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : data.domains.length === 0 ? (
        <Card className="glass-card border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground">
            Nenhum mentor cadastrou domínio próprio ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {data.domains.map((d) => (
            <Card key={d.mentorId} className="glass-card">
              <CardContent className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {d.brandLogoUrl ? (
                    <img src={d.brandLogoUrl} alt="" className="h-12 w-12 rounded-xl object-contain bg-muted shrink-0" />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0">
                      {(d.brandName || d.mentorName).slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{d.brandName || d.mentorName}</div>
                    <div className="text-xs text-muted-foreground truncate">{d.mentorEmail}</div>
                    <a href={`https://${d.domain}`} target="_blank" rel="noreferrer" className="text-sm font-mono text-primary hover:underline truncate block">
                      {d.domain}
                    </a>
                  </div>
                </div>

                <div className="flex flex-col gap-1 text-xs md:w-72">
                  {d.dnsOk ? (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 w-fit">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> DNS OK ({d.dnsIps.join(", ")})
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 w-fit">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {d.dnsError || `DNS aponta para ${d.dnsIps.join(", ") || d.dnsCnames.join(", ") || "—"}`}
                    </Badge>
                  )}
                  {d.expectedIp && !d.dnsOk && (
                    <span className="text-muted-foreground">Esperado: <span className="font-mono">{d.expectedIp}</span></span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => recheck(d.mentorId)} disabled={busy[d.mentorId]}>
                    {busy[d.mentorId] ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    <span className="ml-1">Verificar</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => publish(d.mentorId, false)}
                    disabled={busy[d.mentorId] || !data.easypanelConfigured}
                    className="bg-gradient-primary hover:opacity-90"
                  >
                    <Rocket className="h-3 w-3 mr-1" /> Publicar
                  </Button>
                  {!d.dnsOk && data.easypanelConfigured && (
                    <Button size="sm" variant="ghost" onClick={() => publish(d.mentorId, true)} disabled={busy[d.mentorId]} className="text-xs">
                      Forçar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="glass-card border-dashed">
        <CardContent className="p-5 text-sm space-y-2">
          <div className="font-semibold flex items-center gap-2"><Globe className="h-4 w-4" /> Como funciona</div>
          <ol className="list-decimal list-inside text-muted-foreground space-y-1 text-xs">
            <li>O mentor cadastra o domínio em <span className="font-mono">Configurações → Branding</span>.</li>
            <li>O mentor aponta o DNS (registro <b>A</b>) do domínio dele para o IP do servidor mostrado acima.</li>
            <li>Aqui você verifica se o DNS já propagou e clica em <b>Publicar</b> para criar o host no Easypanel e emitir SSL.</li>
            <li>Para a publicação 1-clique funcionar, defina no <span className="font-mono">.env</span> do backend: <span className="font-mono">EASYPANEL_API_URL</span>, <span className="font-mono">EASYPANEL_API_TOKEN</span>, <span className="font-mono">EASYPANEL_PROJECT</span>, <span className="font-mono">EASYPANEL_SERVICE</span> e <span className="font-mono">APP_SERVER_IP</span>.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}