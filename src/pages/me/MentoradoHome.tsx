import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import {
  Loader2,
  ClipboardList,
  BookOpen,
  Calendar,
  ChevronRight,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";

export default function MentoradoHome() {
  const { user } = useAuth();
  const { brand } = useBranding();
  const [tests, setTests] = useState<any[]>([]);
  const [pendingTests, setPendingTests] = useState<any[]>([]);
  const [contents, setContents] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<any[]>("/tests/responses").catch(() => []),
      api<any[]>("/test-assignments/me").catch(() => []),
      api<any[]>("/contents").catch(() => []),
      api<any[]>("/meetings").catch(() => []),
    ])
      .then(([t, a, c, m]) => {
        setTests(Array.isArray(t) ? t : []);
        setPendingTests(
          Array.isArray(a) ? a.filter((x: any) => x.status !== "completed") : [],
        );
        setContents(Array.isArray(c) ? c : []);
        setMeetings(Array.isArray(m) ? m : []);
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

  const upcoming = meetings
    .filter((m) => m.scheduledAt && new Date(m.scheduledAt) > new Date())
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 3);

  const lastTest = tests[0];

  return (
    <div className="space-y-6">
      {/* Hero compacto */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/10 p-5">
        <div className="absolute -top-10 -right-10 h-32 w-32 bg-primary/20 rounded-full blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
            <Sparkles className="h-3 w-3" />
            Sua jornada
          </div>
          <h1 className="font-display text-2xl font-bold leading-tight">
            Olá, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bem-vindo de volta à mentoria{brand?.brandName ? ` ${brand.brandName}` : ""}.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: ClipboardList, label: "Testes", value: tests.length + pendingTests.length, color: "text-violet-500", bg: "bg-violet-500/10" },
          { icon: BookOpen, label: "Conteúdos", value: contents.length, color: "text-cyan-500", bg: "bg-cyan-500/10" },
          { icon: Calendar, label: "Reuniões", value: upcoming.length, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="bg-card border border-border rounded-xl p-3 shadow-soft"
            >
              <div className={`h-8 w-8 rounded-lg ${c.bg} ${c.color} flex items-center justify-center mb-2`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="text-2xl font-display font-bold leading-none">{c.value}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{c.label}</div>
            </div>
          );
        })}
      </div>

      {/* Testes pendentes (prioridade alta) */}
      {pendingTests.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-violet-500" />
              Testes para responder
              <span className="text-xs bg-violet-500/10 text-violet-500 px-2 py-0.5 rounded-full">
                {pendingTests.length}
              </span>
            </h2>
            <Link to="/me/tests" className="text-xs text-primary flex items-center gap-0.5">
              Ver todos <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {pendingTests.slice(0, 3).map((a) => {
              const link = a.mentorSlug && a.template
                ? `/c/${a.mentorSlug}/test/${a.template.id}?lead=${a.leadId}`
                : "/me/tests";
              return (
                <Link
                  key={a.id}
                  to={link}
                  className="block bg-card border border-border rounded-xl p-4 shadow-soft hover:border-primary/40 hover:shadow-elegant transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">
                        {a.template?.title || "Teste"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Enviado em {new Date(a.createdAt).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Próximas reuniões */}
      {upcoming.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold">Próximas reuniões</h2>
            <Link to="/me/meetings" className="text-xs text-primary flex items-center gap-0.5">
              Ver tudo <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {upcoming.map((m) => (
              <div
                key={m.id}
                className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-soft"
              >
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{m.title || "Reunião"}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(m.scheduledAt).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Último teste */}
      {lastTest && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold">Seu último teste</h2>
            <Link to="/me/tests" className="text-xs text-primary flex items-center gap-0.5">
              Ver todos <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium">{lastTest.template?.title || "Teste"}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {new Date(lastTest.createdAt).toLocaleDateString("pt-BR")}
                </div>
                {lastTest.classification && (
                  <span
                    className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      lastTest.classification === "hot"
                        ? "bg-hot/10 text-hot"
                        : lastTest.classification === "warm"
                        ? "bg-warm/10 text-warm"
                        : "bg-cold/10 text-cold"
                    }`}
                  >
                    {lastTest.classification === "hot"
                      ? "Quente 🔥"
                      : lastTest.classification === "warm"
                      ? "Morno"
                      : "Frio"}
                  </span>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-3xl font-display font-bold text-primary leading-none">
                  {lastTest.scorePct}
                  <span className="text-base text-muted-foreground">%</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-0.5 justify-end">
                  <TrendingUp className="h-3 w-3" />
                  pontuação
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Conteúdos sugeridos */}
      {contents.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold">Conteúdos para você</h2>
            <Link to="/me/contents" className="text-xs text-primary flex items-center gap-0.5">
              Ver tudo <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {contents.slice(0, 3).map((c) => (
              <div
                key={c.id}
                className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-soft"
              >
                <div className="h-10 w-10 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center shrink-0">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{c.title || "Conteúdo"}</div>
                  {c.description && (
                    <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {c.description}
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            ))}
          </div>
        </section>
      )}

      {tests.length === 0 && contents.length === 0 && upcoming.length === 0 && (
        <div className="text-center py-10 px-4 bg-card border border-dashed border-border rounded-xl">
          <Sparkles className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Sua jornada está começando! Em breve seu mentor liberará conteúdos e reuniões aqui.
          </p>
        </div>
      )}
    </div>
  );
}
