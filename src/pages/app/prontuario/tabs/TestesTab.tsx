// Aba: Diagnóstico e Testes
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Flame, Snowflake, Cloud } from "lucide-react";
import { ProntuarioPayload, relativeDate } from "../types";

function tempBadge(t?: string) {
  if (t === "hot")  return <Badge className="bg-orange-600 hover:bg-orange-600"><Flame className="h-3 w-3 mr-1" />Quente</Badge>;
  if (t === "warm") return <Badge className="bg-amber-500 hover:bg-amber-500"><Cloud className="h-3 w-3 mr-1" />Morno</Badge>;
  if (t === "cold") return <Badge className="bg-sky-600 hover:bg-sky-600"><Snowflake className="h-3 w-3 mr-1" />Frio</Badge>;
  return null;
}

export function TestesTab({ data }: { data: ProntuarioPayload }) {
  const { tests } = data;
  if (tests.length === 0) {
    return <Card className="p-6 text-center text-muted-foreground text-sm">Nenhum teste respondido.</Card>;
  }
  return (
    <div className="space-y-3">
      {tests.map((t) => (
        <Card key={t.id} className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">{t.template?.title || "Teste"}</div>
              <div className="text-xs text-muted-foreground">{relativeDate(t.createdAt)}</div>
            </div>
            <div className="flex gap-2 items-center">
              <Badge variant="outline">{Math.round(Number(t.scorePct))}%</Badge>
              {tempBadge(t.classification)}
            </div>
          </div>
          {t.aiAnalysis && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap border-l-2 border-primary">
              <div className="flex items-center gap-1 text-xs font-semibold text-primary mb-1">
                <Sparkles className="h-3 w-3" />Análise IA
              </div>
              {t.aiAnalysis}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
