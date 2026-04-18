import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import {
  Loader2,
  ClipboardList,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Sparkles,
} from "lucide-react";

interface Assignment {
  id: string;
  templateId: string;
  leadId: string;
  status: string;
  dueDate?: string;
  createdAt: string;
  mentorSlug: string | null;
  mentorBrandName: string | null;
  template?: { id: string; title: string; description?: string; category?: string };
}

interface Response {
  id: string;
  scorePct: number;
  classification?: string;
  createdAt: string;
  template?: { id: string; title: string };
}

export default function MentoradoTests() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<Assignment[]>("/test-assignments/me").catch(() => []),
      api<Response[]>("/tests/responses").catch(() => []),
    ])
      .then(([a, r]) => {
        setAssignments(Array.isArray(a) ? a : []);
        setResponses(Array.isArray(r) ? r : []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const pending = assignments.filter((a) => a.status !== "completed");
  const completed = assignments.filter((a) => a.status === "completed");

  function buildPlayerLink(a: Assignment) {
    if (!a.mentorSlug || !a.template) return null;
    return `/c/${a.mentorSlug}/test/${a.template.id}?lead=${a.leadId}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500/15 via-violet-500/5 to-transparent border border-violet-500/10 p-5">
        <div className="absolute -top-10 -right-10 h-32 w-32 bg-violet-500/20 rounded-full blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-500 text-xs font-medium mb-3">
            <ClipboardList className="h-3 w-3" />
            Meus testes
          </div>
          <h1 className="font-display text-2xl font-bold leading-tight">
            Diagnósticos & Avaliações
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Testes enviados pelo seu mentor.
          </p>
        </div>
      </div>

      {/* Pendentes */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <Clock className="h-4 w-4 text-warm" />
            Pendentes
            {pending.length > 0 && (
              <span className="text-xs bg-warm/10 text-warm px-2 py-0.5 rounded-full">
                {pending.length}
              </span>
            )}
          </h2>
        </div>

        {pending.length === 0 ? (
          <div className="text-center py-8 px-4 bg-card border border-dashed border-border rounded-xl">
            <CheckCircle2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhum teste pendente. Tudo em dia! 🎉
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map((a) => {
              const link = buildPlayerLink(a);
              const Card = link ? Link : "div";
              const cardProps = link ? { to: link } : {};
              return (
                <Card
                  key={a.id}
                  {...(cardProps as any)}
                  className="block bg-card border border-border rounded-xl p-4 shadow-soft hover:border-primary/40 hover:shadow-elegant transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm">
                        {a.template?.title || "Teste"}
                      </div>
                      {a.template?.description && (
                        <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {a.template.description}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                        {a.dueDate && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Até {new Date(a.dueDate).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                        {a.template?.category && (
                          <span className="px-1.5 py-0.5 rounded bg-muted">
                            {a.template.category}
                          </span>
                        )}
                      </div>
                    </div>
                    {link && (
                      <div className="shrink-0 self-center">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:gap-2 transition-all">
                          Responder
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Concluídos */}
      {(completed.length > 0 || responses.length > 0) && (
        <section>
          <h2 className="font-display text-lg font-bold flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Concluídos
          </h2>
          <div className="space-y-2">
            {responses.map((r) => (
              <div
                key={r.id}
                className="bg-card border border-border rounded-xl p-4 shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm">
                      {r.template?.title || "Teste"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                    </div>
                    {r.classification && (
                      <span
                        className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          r.classification === "hot"
                            ? "bg-hot/10 text-hot"
                            : r.classification === "warm"
                            ? "bg-warm/10 text-warm"
                            : "bg-cold/10 text-cold"
                        }`}
                      >
                        {r.classification === "hot"
                          ? "Quente 🔥"
                          : r.classification === "warm"
                          ? "Morno"
                          : "Frio"}
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-display font-bold text-primary leading-none">
                      {Math.round(r.scorePct)}
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-0.5 justify-end">
                      <TrendingUp className="h-3 w-3" />
                      pontuação
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {pending.length === 0 && responses.length === 0 && (
        <div className="text-center py-10 px-4 bg-card border border-dashed border-border rounded-xl">
          <Sparkles className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Seu mentor ainda não enviou nenhum teste.
          </p>
        </div>
      )}
    </div>
  );
}
