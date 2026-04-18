// Aba: Visão Geral — capa do prontuário
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mail, Phone, Building2, Calendar, Activity, Target, AlertTriangle,
  Sparkles, RefreshCw, Loader2, Clock,
} from "lucide-react";
import { ProntuarioPayload, STAGE_META, relativeDate, scoreColor } from "../types";

interface Props {
  data: ProntuarioPayload;
  recalculating: boolean;
  onRecalculate: () => void;
}

export function VisaoGeralTab({ data, recalculating, onRecalculate }: Props) {
  const { record, lead, stats } = data;
  const stage = STAGE_META[record.currentStage];

  const scoreCards = [
    { label: "Score geral",    value: record.overallScore,    icon: Sparkles, inverted: false },
    { label: "Engajamento",    value: record.engagementScore, icon: Activity, inverted: false },
    { label: "Execução",       value: record.executionScore,  icon: Target,   inverted: false },
    { label: "Risco",          value: record.riskScore,       icon: AlertTriangle, inverted: true },
  ];

  return (
    <div className="space-y-4">
      {/* Identificação */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div>
              <h2 className="font-display text-2xl font-bold">{lead.name}</h2>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>
                {lead.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>}
                {(record.companyName || lead.company) && (
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-3 w-3" />{record.companyName || lead.company}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={stage.cls}>{stage.label}</Badge>
              <Badge variant="outline" className="capitalize">{lead.stage}</Badge>
              {record.segment && <Badge variant="secondary">{record.segment}</Badge>}
              {record.origin && <Badge variant="outline">Origem: {record.origin}</Badge>}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onRecalculate} disabled={recalculating}>
            {recalculating ? (
              <Loader2 className="h-3 w-3 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-2" />
            )}
            Recalcular scores
          </Button>
        </div>
      </Card>

      {/* Scores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {scoreCards.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span className="uppercase tracking-wider">{s.label}</span>
              <s.icon className="h-3 w-3" />
            </div>
            <div className={`text-3xl font-display font-bold mt-2 ${scoreColor(s.value, s.inverted)}`}>
              {s.value}<span className="text-base text-muted-foreground">%</span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
              <div
                className={`h-full rounded-full ${s.inverted ? "bg-rose-400" : "bg-gradient-primary"}`}
                style={{ width: `${Math.min(100, Math.max(0, s.value))}%` }}
              />
            </div>
          </Card>
        ))}
      </div>

      {/* Próximos eventos / atividade */}
      <div className="grid md:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
            <Calendar className="h-3 w-3" />Próxima reunião
          </div>
          <div className="mt-2 text-sm font-medium">
            {stats.upcomingMeetingAt ? relativeDate(stats.upcomingMeetingAt) : "—"}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
            <Clock className="h-3 w-3" />Última interação
          </div>
          <div className="mt-2 text-sm font-medium">{relativeDate(stats.lastInteractionAt)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
            <Sparkles className="h-3 w-3" />Score médio nos testes
          </div>
          <div className="mt-2 text-sm font-medium">
            {stats.avgScore != null ? `${stats.avgScore}%` : "—"}
          </div>
        </Card>
      </div>

      {/* Contadores */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Testes</div>
          <div className="text-2xl font-bold mt-1">{stats.testsCount}</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Reuniões</div>
          <div className="text-2xl font-bold mt-1">{stats.meetingsCount}</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Tarefas</div>
          <div className="text-2xl font-bold mt-1">{stats.tasksCount}</div>
        </Card>
      </div>
    </div>
  );
}
