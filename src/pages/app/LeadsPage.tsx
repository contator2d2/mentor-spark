import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const STAGES = [
  { id: "new", label: "Novo" },
  { id: "tested", label: "Fez teste" },
  { id: "engaged", label: "Engajado" },
  { id: "negotiating", label: "Negociando" },
  { id: "client", label: "Mentorado" },
  { id: "lost", label: "Perdido" },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[] | null>(null);

  useEffect(() => {
    api("/leads").then(setLeads).catch(() => setLeads([]));
  }, []);

  async function moveStage(leadId: string, stage: string) {
    setLeads((curr) => curr?.map((l) => (l.id === leadId ? { ...l, stage } : l)) || null);
    await api(`/leads/${leadId}`, { method: "PATCH", body: { stage } });
  }

  if (!leads) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Funil de leads</h1>
        <p className="text-muted-foreground mt-1">Mova prospects pelas etapas até virarem mentorados.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {STAGES.map((s) => {
          const list = leads.filter((l) => l.stage === s.id);
          return (
            <div key={s.id} className="bg-muted/50 rounded-xl p-3 min-h-[300px]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wide">{s.label}</span>
                <Badge variant="secondary">{list.length}</Badge>
              </div>
              <div className="space-y-2">
                {list.map((l) => (
                  <Link
                    key={l.id}
                    to={`/app/leads/${l.id}`}
                    className="block bg-card border border-border rounded-lg p-3 shadow-soft hover:shadow-elegant transition-shadow"
                  >
                    <div className="font-medium text-sm truncate">{l.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{l.company || l.email}</div>
                    {l.temperature && (
                      <span
                        className={`inline-block mt-2 h-2 w-2 rounded-full ${
                          l.temperature === "hot" ? "bg-hot" : l.temperature === "warm" ? "bg-warm" : "bg-cold"
                        }`}
                      />
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {STAGES.filter((x) => x.id !== l.stage).slice(0, 3).map((x) => (
                        <button
                          key={x.id}
                          onClick={(e) => {
                            e.preventDefault();
                            moveStage(l.id, x.id);
                          }}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-primary hover:text-primary-foreground"
                        >
                          → {x.label}
                        </button>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
