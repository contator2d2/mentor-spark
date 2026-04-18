// Aba: Reuniões
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ProntuarioPayload, relativeDate } from "../types";

export function ReunioesTab({ data }: { data: ProntuarioPayload }) {
  const nav = useNavigate();
  const { meetings } = data;

  if (meetings.length === 0) {
    return <Card className="p-6 text-center text-muted-foreground text-sm">Nenhuma reunião agendada.</Card>;
  }

  return (
    <div className="space-y-3">
      {meetings.map((m) => (
        <Card
          key={m.id}
          className="p-4 cursor-pointer hover:border-primary/40 transition"
          onClick={() => nav(`/app/meetings/${m.id}`)}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="font-semibold">{m.title}</div>
              <div className="text-xs text-muted-foreground">
                {relativeDate(m.scheduledAt)} · {m.platform}
              </div>
            </div>
            <Badge variant="outline" className="capitalize">{m.status}</Badge>
          </div>
          {m.aiSummary && <p className="text-sm mt-2 text-muted-foreground">{m.aiSummary}</p>}
        </Card>
      ))}
    </div>
  );
}
