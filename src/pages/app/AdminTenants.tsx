import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

export default function AdminTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Tenant[]>("/admin/tenants")
      .then(setTenants)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6 text-accent" />
        <div>
          <h1 className="font-display text-3xl font-bold">Tenants (Mentores)</h1>
          <p className="text-muted-foreground">Visão multi-tenant: todos os mentores e suas métricas.</p>
        </div>
      </div>

      {loading ? (
        <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin inline" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {tenants.map((t) => (
            <div key={t.id} className="bg-card border border-border rounded-xl p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {t.brandLogoUrl ? (
                    <img src={t.brandLogoUrl} alt={t.brandName} className="h-10 w-10 rounded object-contain bg-muted" />
                  ) : (
                    <div
                      className="h-10 w-10 rounded flex items-center justify-center text-white font-bold"
                      style={{ background: t.brandPrimaryColor || "#1e3a8a" }}
                    >
                      {(t.brandName || t.name)[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{t.brandName || t.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.email} · /c/{t.slug}</div>
                  </div>
                </div>
                <Badge variant={t.status === "active" ? "default" : "outline"}>{t.status}</Badge>
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
          {tenants.length === 0 && <div className="text-muted-foreground">Nenhum mentor cadastrado ainda.</div>}
        </div>
      )}
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
