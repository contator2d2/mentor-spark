// Aba: Timeline — linha do tempo agregada
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Calendar, CheckSquare, ClipboardList, Flame, Snowflake, Cloud, UserPlus } from "lucide-react";
import { ProntuarioPayload, relativeDate } from "../types";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  lead_created: UserPlus,
  test_response: ClipboardList,
  meeting: Calendar,
  task: CheckSquare,
};

function tempBadge(t?: string) {
  if (t === "hot")  return <Badge className="bg-orange-600 hover:bg-orange-600"><Flame className="h-3 w-3 mr-1" />Quente</Badge>;
  if (t === "warm") return <Badge className="bg-amber-500 hover:bg-amber-500"><Cloud className="h-3 w-3 mr-1" />Morno</Badge>;
  if (t === "cold") return <Badge className="bg-sky-600 hover:bg-sky-600"><Snowflake className="h-3 w-3 mr-1" />Frio</Badge>;
  return null;
}

interface Props { data: ProntuarioPayload; }

export function TimelineTab({ data }: Props) {
  const { timeline } = data;

  if (timeline.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground text-sm">
        <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
        Sem atividades registradas ainda.
      </Card>
    );
  }

  return (
    <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border">
      {timeline.map((e, i) => {
        const Icon = ICONS[e.type] || Activity;
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
                    <div className="text-xs text-muted-foreground">{relativeDate(e.at)}</div>
                  </div>
                </div>
                {e.meta?.classification && tempBadge(e.meta.classification)}
                {e.meta?.status && e.type !== "test_response" && (
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
