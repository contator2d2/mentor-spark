import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuizSocket } from "@/hooks/useQuizSocket";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, ChevronRight, Eye, Trophy, Users, X, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const OPTION_COLORS = [
  "bg-rose-500", "bg-blue-500", "bg-amber-500", "bg-emerald-500",
];

export default function QuizHostPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const { state, connected, emit } = useQuizSocket();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!sessionId || !connected) return;
    emit("host_join", { sessionId });
  }, [sessionId, connected, emit]);

  // tick para atualizar contador da pergunta
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(t);
  }, []);

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  function action(a: "start" | "next" | "reveal" | "leaderboard" | "cancel") {
    if (!user?.id) return toast.error("Sessão não autenticada");
    emit("host_action", { sessionId, action: a, mentorId: user.id });
  }

  function copyJoinLink() {
    const url = `${window.location.origin}/quiz/${state.pin}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  }

  // Tempo restante na pergunta
  let secondsLeft = 0;
  if (state.currentQuestion?.startedAt && state.status === "question") {
    const elapsed = (Date.now() - new Date(state.currentQuestion.startedAt).getTime()) / 1000;
    secondsLeft = Math.max(0, Math.ceil((state.currentQuestion.timeLimit || 20) - elapsed));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-display">{state.title}</h1>
          <div className="flex items-center gap-2 mt-2 text-sm">
            <Badge variant="outline" className="text-base font-mono">PIN: {state.pin}</Badge>
            <Badge variant="secondary">{state.status}</Badge>
            <Badge variant="outline"><Users className="h-3 w-3 mr-1" />{state.players.length}</Badge>
            {state.totalQuestions > 0 && state.currentQuestionIndex >= 0 && (
              <Badge variant="outline">{state.currentQuestionIndex + 1}/{state.totalQuestions}</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyJoinLink}><Copy className="h-4 w-4 mr-2" />Link de entrada</Button>
          {state.status !== "finished" && state.status !== "canceled" && (
            <Button variant="destructive" size="icon" onClick={() => action("cancel")}><X className="h-4 w-4" /></Button>
          )}
        </div>
      </div>

      <div className="flex-1 grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Área principal */}
        <div className="space-y-4">
          {state.status === "lobby" && (
            <Card className="p-12 text-center">
              <h2 className="text-5xl font-bold mb-4">Acesse <span className="text-primary">{window.location.host}/quiz/{state.pin}</span></h2>
              <p className="text-muted-foreground mb-8 text-lg">Ou abra a câmera no QR Code</p>
              <div className="text-8xl font-display font-bold text-primary mb-8">{state.pin}</div>
              <Button size="lg" onClick={() => action("start")} disabled={state.players.length === 0} className="bg-gradient-primary">
                <Play className="h-5 w-5 mr-2" />Iniciar quiz
              </Button>
            </Card>
          )}

          {state.status === "leaderboard" && (
            <Card className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-display flex items-center gap-2"><Trophy className="h-7 w-7 text-primary" />Ranking</h2>
                <Button onClick={() => action("next")} className="bg-gradient-primary">
                  {state.currentQuestionIndex + 1 < state.totalQuestions ? <>Próxima pergunta <ChevronRight className="h-4 w-4 ml-2" /></> : "Finalizar"}
                </Button>
              </div>
              <Leaderboard players={state.players} big />
            </Card>
          )}

          {state.status === "question" && state.currentQuestion && (
            <Card className="p-8">
              <div className="flex items-center justify-between mb-4">
                <Badge variant="outline" className="text-base">Pergunta {state.currentQuestionIndex + 1} de {state.totalQuestions}</Badge>
                <div className="text-3xl font-bold text-primary tabular-nums">{secondsLeft}s</div>
              </div>
              <h2 className="text-3xl md:text-4xl font-display mb-8">{state.currentQuestion.text}</h2>
              <div className="grid md:grid-cols-2 gap-3">
                {state.currentQuestion.options.map((o: any) => (
                  <div key={o.index} className={`${OPTION_COLORS[o.index % 4]} text-white p-6 rounded-lg text-xl font-medium shadow-lg`}>
                    {o.label}
                  </div>
                ))}
              </div>
              <Button className="mt-6" onClick={() => action("reveal")} variant="outline">
                <Eye className="h-4 w-4 mr-2" />Revelar resposta
              </Button>
            </Card>
          )}

          {state.status === "reveal" && state.currentQuestion && (
            <Card className="p-8">
              <h2 className="text-2xl md:text-3xl font-display mb-6">{state.currentQuestion.text}</h2>
              <div className="grid md:grid-cols-2 gap-3 mb-6">
                {state.currentQuestion.options.map((o: any) => {
                  const count = state.stats?.byOption?.[o.index] || 0;
                  const total = state.stats?.total || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={o.index} className={`${OPTION_COLORS[o.index % 4]} ${o.correct ? "ring-4 ring-primary" : "opacity-60"} text-white p-4 rounded-lg relative overflow-hidden`}>
                      <div className="absolute inset-0 bg-black/20" style={{ width: `${pct}%`, right: 0, left: "auto" }} />
                      <div className="relative flex items-center justify-between">
                        <span className="font-medium">{o.label}</span>
                        <div className="flex items-center gap-2">
                          {o.correct && <CheckCircle2 className="h-5 w-5" />}
                          <span className="font-mono">{count} ({pct}%)</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button onClick={() => action("leaderboard")} className="bg-gradient-primary">
                <Trophy className="h-4 w-4 mr-2" />Ver ranking
              </Button>
            </Card>
          )}

          {state.status === "finished" && (
            <Card className="p-12 text-center">
              <Trophy className="h-20 w-20 mx-auto text-primary mb-4" />
              <h2 className="text-4xl font-display mb-2">Quiz encerrado!</h2>
              {state.players[0] && (
                <p className="text-xl text-muted-foreground mb-8">
                  🏆 Vencedor: <span className="text-primary font-bold">{state.players[0].name}</span> com {state.players[0].score} pontos
                </p>
              )}
              <Leaderboard players={state.players} big />
            </Card>
          )}

          {state.status === "canceled" && (
            <Card className="p-12 text-center text-muted-foreground">
              <p>Sala cancelada.</p>
            </Card>
          )}
        </div>

        {/* Lateral: jogadores */}
        <Card className="p-4 max-h-[80vh] overflow-y-auto">
          <h3 className="font-medium mb-3 flex items-center gap-2"><Users className="h-4 w-4" />Jogadores ({state.players.length})</h3>
          <div className="space-y-1">
            {state.players.map((p: any, i: number) => (
              <div key={p.id} className={`flex items-center justify-between text-sm px-2 py-1 rounded ${i === 0 && state.status !== "lobby" ? "bg-primary/20" : "hover:bg-muted/30"}`}>
                <span className="flex items-center gap-2 truncate">
                  {state.status !== "lobby" && <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>}
                  <span className={p.connected ? "" : "opacity-40"}>{p.name}</span>
                </span>
                {state.status !== "lobby" && <span className="text-xs font-mono text-primary">{p.score}</span>}
              </div>
            ))}
            {state.players.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Aguardando jogadores...</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Leaderboard({ players, big }: { players: any[]; big?: boolean }) {
  return (
    <div className="space-y-2">
      {players.slice(0, 10).map((p, i) => (
        <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg ${i === 0 ? "bg-primary/20 border border-primary/30" : i < 3 ? "bg-muted/40" : "bg-muted/20"}`}>
          <div className="flex items-center gap-3">
            <span className={`${big ? "text-2xl" : "text-base"} font-bold w-8 text-center ${i === 0 ? "text-primary" : "text-muted-foreground"}`}>
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
            </span>
            <span className={`${big ? "text-xl" : ""} font-medium`}>{p.name}</span>
          </div>
          <div className="text-right">
            <div className={`${big ? "text-2xl" : "text-base"} font-mono font-bold text-primary`}>{p.score}</div>
            <div className="text-xs text-muted-foreground">{p.correctCount} acertos</div>
          </div>
        </div>
      ))}
    </div>
  );
}
