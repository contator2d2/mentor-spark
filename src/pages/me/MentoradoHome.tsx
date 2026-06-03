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
  PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { useTheme } from "@/contexts/ThemeContext";

export default function MentoradoHome() {
  const { user } = useAuth();
  const { brand } = useBranding();
  const { theme } = useTheme();
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

  const executionScore = 85; 
  const strategyScore = 65; 
  const orgScore = 74; 

  return (
    <div className="space-y-6">
      {/* Banner Superior Estilo Netflix */}
      <div className="relative w-full rounded-2xl overflow-hidden aspect-[21/9] md:aspect-[3/1] bg-card border border-border group">
        <picture>
          <source media="(max-width: 768px)" srcSet={brand?.brandMobileBannerUrl || (theme === "dark" ? (brand?.brandDarkBannerUrl || brand?.brandBannerUrl) : brand?.brandBannerUrl) || "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1000"} />
          <img 
            src={(theme === "dark" ? (brand?.brandDarkBannerUrl || brand?.brandBannerUrl) : brand?.brandBannerUrl) || "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=2000"} 

            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            alt="Banner"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/20 backdrop-blur-md text-primary-foreground text-[10px] font-bold uppercase tracking-wider mb-3 border border-white/10">
            <Sparkles className="h-3 w-3" />
            Recomendado para você
          </div>
          <h1 className="font-display text-2xl md:text-5xl font-bold leading-tight text-white drop-shadow-lg">
            Olá, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-sm md:text-lg text-white/90 mt-2 line-clamp-2 drop-shadow-md">
            Continue sua jornada de evolução. Você já concluiu <b>{executionScore}%</b> da sua meta este mês.
          </p>
          <div className="mt-6 flex gap-3">
            <Button asChild className="shadow-lg">
              <Link to="/me/trails">
                <PlayCircle className="h-4 w-4 mr-2" /> Começar Trilha
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-12 gap-6">
        <div className="md:col-span-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Execução", value: executionScore, color: "bg-emerald-500" },
              { label: "Clareza Estratégica", value: strategyScore, color: "bg-blue-500" },
              { label: "Organização", value: orgScore, color: "bg-violet-500" },
            ].map((score) => (
              <div key={score.label} className="bg-card border border-border rounded-xl p-4 shadow-soft">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">{score.label}</span>
                  <span className="text-sm font-bold">{score.value}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${score.color} transition-all duration-500`} 
                    style={{ width: `${score.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {pendingTests.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-lg font-bold flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-violet-500" />
                  Prioridade: Responder Testes
                </h2>
              </div>
              <div className="space-y-2">
                {pendingTests.slice(0, 2).map((a) => (
                  <Link
                    key={a.id}
                    to={a.mentorSlug && a.template ? `/c/${a.mentorSlug}/test/${a.template.id}?lead=${a.leadId}` : "/me/tests"}
                    className="block bg-card border-l-4 border-l-violet-500 border-border rounded-xl p-4 shadow-soft hover:shadow-elegant transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{a.template?.title}</div>
                      <div className="text-xs bg-violet-500/10 text-violet-500 px-2 py-1 rounded-md font-medium">Responder agora</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="md:col-span-4 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-soft">
            <h3 className="font-display font-bold mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Próximo encontro
            </h3>
            {upcoming[0] ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="text-sm font-bold">{upcoming[0].title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(upcoming[0].scheduledAt).toLocaleString("pt-BR", { 
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                    })}
                  </div>
                </div>
                <Button variant="outline" className="w-full text-xs" asChild>
                  <Link to="/me/meetings">Ver agenda completa</Link>
                </Button>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground text-center py-4">Nenhuma reunião agendada</div>
            )}
          </div>

          <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium opacity-80 uppercase tracking-wider">Evolução Geral</span>
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-display font-bold">78%</span>
              <span className="text-xs font-medium mb-1.5 opacity-90">+12% vs último mês</span>
            </div>
            <p className="text-[10px] mt-4 leading-relaxed opacity-70">
              Seu mentor identificou uma melhora significativa na sua clareza estratégica após a última sessão.
            </p>
          </div>
        </div>
      </div>

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
    </div>
  );
}
