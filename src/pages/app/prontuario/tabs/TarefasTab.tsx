// Aba: Tarefas
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProntuarioPayload, relativeDate } from "../types";

export function TarefasTab({ data }: { data: ProntuarioPayload }) {
  const { tasks } = data;

  if (tasks.length === 0) {
    return <Card className="p-6 text-center text-muted-foreground text-sm">Nenhuma tarefa criada.</Card>;
  }

  return (
    <div className="space-y-3">
      {tasks.map((t) => (
        <Card key={t.id} className="p-4 flex items-center justify-between gap-2">
          <div>
            <div className="font-medium">{t.title}</div>
            {t.dueDate && (
              <div className="text-xs text-muted-foreground">Prazo: {relativeDate(t.dueDate)}</div>
            )}
          </div>
          <Badge variant="outline" className="capitalize">{t.status}</Badge>
        </Card>
      ))}
    </div>
  );
}
