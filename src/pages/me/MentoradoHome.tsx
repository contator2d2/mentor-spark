import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loader2, ClipboardList, BookOpen, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function MentoradoHome() {
  const { user } = useAuth();
  const [tests, setTests] = useState<any[]>([]);
  const [contents, setContents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([api("/tests/responses").catch(() => []), api("/contents").catch(() => [])])
      .then(([t, c]) => { setTests(t); setContents(c); })
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Olá, {user?.name?.split(" ")[0]} 👋</h1>
        <p className="text-muted-foreground mt-1">Sua jornada de evolução começa aqui.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { icon: ClipboardList, label: "Testes realizados", value: tests.length },
          { icon: BookOpen, label: "Conteúdos disponíveis", value: contents.length },
          { icon: Calendar, label: "Próximas reuniões", value: 0 },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-card border border-border rounded-xl p-5 shadow-soft">
              <Icon className="h-5 w-5 text-primary mb-3" />
              <div className="text-3xl font-display font-bold">{c.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{c.label}</div>
            </div>
          );
        })}
      </div>
      {tests.length > 0 && (
        <div>
          <h2 className="font-display text-xl font-bold mb-3">Seus testes</h2>
          <div className="space-y-2">
            {tests.map((t) => (
              <div key={t.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{t.template?.title || "Teste"}</div>
                  <div className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-display font-bold">{t.scorePct}%</div>
                  {t.classification && <span className={`text-xs px-2 py-0.5 rounded ${t.classification === "hot" ? "bg-hot/10 text-hot" : t.classification === "warm" ? "bg-warm/10 text-warm" : "bg-cold/10 text-cold"}`}>{t.classification}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
