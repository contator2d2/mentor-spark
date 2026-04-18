// Tipos compartilhados do Prontuário Inteligente
export type MentoredStage =
  | "initial"
  | "diagnosis"
  | "structuring"
  | "execution"
  | "evolution"
  | "at_risk"
  | "paused"
  | "completed";

export type MentoredStatus = "active" | "paused" | "churned" | "completed";

export interface MentoredRecord {
  id: string;
  mentorId: string;
  leadId: string;
  companyName?: string;
  roleName?: string;
  segment?: string;
  origin?: string;
  currentStage: MentoredStage;
  status: MentoredStatus;
  overallScore: number;
  engagementScore: number;
  executionScore: number;
  riskScore: number;
  lastRecalculatedAt?: string;
  currentSummary?: string;
  mentorSummary?: string;
  mainObjective?: string;
  mainPain?: string;
  mainBottleneck?: string;
  currentFocus?: string;
  hypotheses?: string;
  priorities?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProntuarioPayload {
  record: MentoredRecord;
  lead: any;
  account: { id: string; email: string; status: string; role: string } | null;
  stats: {
    testsCount: number;
    meetingsCount: number;
    tasksCount: number;
    avgScore: number | null;
    upcomingMeetingAt: string | null;
    lastInteractionAt: string;
  };
  tests: any[];
  meetings: any[];
  tasks: any[];
  timeline: Array<{ type: string; at: string; title: string; ref: string; meta?: any }>;
}

export const STAGE_META: Record<MentoredStage, { label: string; cls: string }> = {
  initial:     { label: "Inicial",        cls: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
  diagnosis:   { label: "Em diagnóstico", cls: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  structuring: { label: "Em estruturação",cls: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  execution:   { label: "Em execução",    cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  evolution:   { label: "Em evolução",    cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  at_risk:     { label: "Em risco",       cls: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  paused:      { label: "Pausado",        cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  completed:   { label: "Concluído",      cls: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30" },
};

export function relativeDate(iso: string | Date) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function scoreColor(value: number, inverted = false) {
  const v = inverted ? 100 - value : value;
  if (v >= 70) return "text-emerald-400";
  if (v >= 40) return "text-amber-400";
  return "text-rose-400";
}
