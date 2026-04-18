// Aba: Timeline — agregada (runtime) + persistida (eventos do prontuário)
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity, Calendar, CheckSquare, ClipboardList, Flame, Snowflake, Cloud, UserPlus,
  Bell, Lock, Folder, Target, BarChart3, FileText, Loader2, ShieldCheck,
} from "lucide-react";
import { ProntuarioPayload, relativeDate } from "../types";
import { api } from "@/lib/api";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  // runtime
  lead_created: UserPlus,
  test_response: ClipboardList,
  meeting: Calendar,
  task: CheckSquare,
  // persistidos
  record_created: Activity,
  stage_changed: Activity,
  status_changed: Activity,
  summary_updated: FileText,
  objective_added: Target,
  objective_completed: Target,
  pain_added: Target,
  metric_updated: BarChart3,
  alert_raised: Bell,
  alert_resolved: ShieldCheck,
  private_note: Lock,
  material_shared: Folder,
  mentor_action: Activity,
  custom: Activity,
};

function tempBadge(t?: string) {
  if (t === "hot")  return <Badge className="bg-orange-600 hover:bg-orange-600"><Flame className="h-3 w-3 mr-1" />Quente</Badge>;
  if (t === "warm") return <Badge className="bg-amber-500 hover:bg-amber-500"><Cloud className="h-3 w-3 mr-1" />Morno</Badge>;
  if (t === "cold") return <Badge className="bg-sky-600 hover:bg-sky-600"><Snowflake className="h-3 w-3 mr-1" />Frio</Badge>;
  return null;
}

interface PersistedEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  meta?: any;
  source: string;
  createdAt: string;
}

interface Props { data: ProntuarioPayload; recordId: string }

export function TimelineTab({ data, recordId }: Props) {
  const [persisted, setPersisted] = useState<PersistedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!recordId) return;
    setLoading(true);
    api<PersistedEvent[]>(`/prontuario/${recordId}/events`)
      .then(setPersisted)
      .catch(() => setPersisted([]))
      .finally(() => setLoading(false));
  }, [recordId]);

  // Mescla runtime + persistido em ordem cronológica
  const merged = [
    ...data.timeline.map(e => ({
      kind: "runtime" as const,
      type: e.type,
      title: e.title,
      at: e.at,
      meta: e.meta,
      source: "system",
    })),
    ...persisted.map(e => ({
      kind: "persisted" as const,
      type: e.type,
      title: e.title,
      at: e.createdAt,
      meta: e.meta,
      source: e.source,
      description: e.description,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  if (loading && merged.length === 0) {
    return (
      <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
    );
  }

  if (merged.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground text-sm">
        <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
        Sem atividades registradas ainda.
      </Card>
    );
  }

  return (
    <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border">
      {merged.map((e, i) => {
        const Icon = ICONS[e.type] || Activity;
        const desc = (e as any).description as string | undefined;
        return (
          <div key={i} className="relative">
            <div className="absolute -left-[18px] top-2 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
            <Card className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{e.title}</div>
                    {desc && <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>}
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <span>{relativeDate(e.at)}</span>
                      {e.source && e.source !== "system" && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 capitalize">{e.source}</Badge>
                      )}
                    </div>
                  </div>
                </div>
                {e.meta?.classification && tempBadge(e.meta.classification)}
                {e.meta?.severity && (
                  <Badge variant="outline" className="capitalize text-xs">{e.meta.severity}</Badge>
                )}
                {e.meta?.status && e.type !== "test_response" && !e.meta?.severity && (
                  <Badge variant="outline" className="capitalize text-xs">{e.meta.status}</Badge>
                )}
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
