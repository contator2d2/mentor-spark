import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuizSocket } from "@/hooks/useQuizSocket";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Users, CheckCircle2, XCircle, Zap } from "lucide-react";
import { toast } from "sonner";

const OPTION_COLORS = ["bg-rose-500", "bg-blue-500", "bg-amber-500", "bg-emerald-500"];
const OPTION_SHAPES = ["▲", "◆", "●", "■"];

export default function QuizPlayerPage() {
  const { pin: pinParam } = useParams<{ pin: string }>();
  const navigate = useNavigate();
  const { state, connected, joined, emit, error, setError, answerResult, setAnswerResult } = useQuizSocket();
  const [pin, setPin] = useState(pinParam || "");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastAnsweredQ, setLastAnsweredQ] = useState<number | null>(null);

  useEffect(() => {
    if (error) {
      toast.error(error);
      setError(null);
    }
  }, [error, setError]);

  useEffect(() => {
    if (answerResult) {
      const t = setTimeout(() => setAnswerResult(null), 4000);
      return () => clearTimeout(t);
    }
  }, [answerResult, setAnswerResult]);

  function joinRoom() {
    if (!pin || pin.length < 4) return toast.error("PIN inválido");
    if (!name.trim()) return toast.error("Digite seu nome");
    emit("player_join", { pin: pin.trim(), name: name.trim() });
    if (pinParam !== pin) navigate(`/quiz/${pin}`, { replace: true });
  }

  function answer(optionIndex: number) {
    if (!joined || !state?.currentQuestion) return;
    if (lastAnsweredQ === state.currentQuestionIndex) return;
    setSubmitting(true);
    setLastAnsweredQ(state.currentQuestionIndex);
    emit("submit_answer", { sessionId: joined.sessionId, playerId: joined.playerId, optionIndex });
    setTimeout(() => setSubmitting(false), 500);
  }

  // ===== TELA DE ENTRADA =====
  if (!joined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/20 p-6">
        <Card className="w-full max-w-sm p-6 space-y-4">
          <div className="text-center">
            <Zap className="h-12 w-12 text-primary mx-auto mb-3" />
            <h1 className="text-2xl font-display">Entrar no quiz</h1>
            {!connected && <p className="text-xs text-muted-foreground mt-1">Conectando...</p>}
          </div>
          <div>
            <Label className="text-xs">PIN da sala</Label>
            <Input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6 dígitos" inputMode="numeric" className="text-center text-2xl font-mono" />
          </div>
          <div>
            <Label className="text-xs">Seu nome (apelido)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Como aparecer no telão" maxLength={24} />
          </div>
          <Button onClick={joinRoom} disabled={!connected} className="w-full bg-gradient-primary">
            Entrar
          </Button>
        </Card>
      </div>
    );
  }

  // ===== AGUARDANDO / LOBBY =====
  if (!state || state.status === "lobby" || state.status === "leaderboard") {
    const me = state?.players?.find((p: any) => p.id === joined.playerId);
    const myRank = state?.players?.findIndex((p: any) => p.id === joined.playerId);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/20 p-6 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h2 className="text-2xl font-display mb-2">{state?.title || joined.sessionTitle}</h2>
        <p className="text-muted-foreground mb-6">
          {state?.status === "leaderboard" ? "Próxima pergunta vindo aí..." : "Aguardando o mentor iniciar..."}
        </p>
        <Badge variant="outline" className="text-base">Você: {me?.name || joined.playerId.slice(0, 6)}</Badge>
        {me && state.status === "leaderboard" && (
          <div className="mt-4">
            <div className="text-4xl font-bold text-primary">{me.score} pts</div>
            <div className="text-sm text-muted-foreground">#{(myRank ?? 0) + 1} de {state.players.length}</div>
          </div>
        )}
      </div>
    );
  }

  // ===== PERGUNTA ATIVA =====
  if (state.status === "question" && state.currentQuestion) {
    const alreadyAnswered = lastAnsweredQ === state.currentQuestionIndex;
    return (
      <div className="min-h-screen p-4 bg-gradient-to-br from-background to-primary/10 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline">Pergunta {state.currentQuestionIndex + 1}/{state.totalQuestions}</Badge>
          <Badge variant="secondary"><Users className="h-3 w-3 mr-1" />{state.players.length}</Badge>
        </div>
        <h2 className="text-xl md:text-2xl font-display mb-6 flex-shrink-0">{state.currentQuestion.text}</h2>

        {alreadyAnswered ? (
          <Card className="p-8 text-center flex-1 flex flex-col items-center justify-center">
            {answerResult ? (
              answerResult.correct ? (
                <>
                  <CheckCircle2 className="h-16 w-16 text-primary mb-3" />
                  <p className="text-2xl font-bold">Acertou!</p>
                  <p className="text-3xl font-mono text-primary mt-2">+{answerResult.points} pts</p>
                  <p className="text-xs text-muted-foreground mt-2">em {(answerResult.timeMs / 1000).toFixed(2)}s</p>
                </>
              ) : (
                <>
                  <XCircle className="h-16 w-16 text-destructive mb-3" />
                  <p className="text-2xl font-bold">Errou</p>
                  <p className="text-sm text-muted-foreground mt-2">Aguarde a próxima!</p>
                </>
              )
            ) : (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                <p className="text-muted-foreground">Resposta enviada! Aguarde os outros...</p>
              </>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 flex-1">
            {state.currentQuestion.options.map((o: any) => (
              <button
                key={o.index}
                disabled={submitting}
                onClick={() => answer(o.index)}
                className={`${OPTION_COLORS[o.index % 4]} text-white rounded-xl p-4 flex flex-col items-center justify-center text-3xl font-bold shadow-lg active:scale-95 transition-transform disabled:opacity-50`}
              >
                <span className="text-5xl mb-2">{OPTION_SHAPES[o.index % 4]}</span>
                <span className="text-sm font-normal">{o.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ===== REVEAL =====
  if (state.status === "reveal" && state.currentQuestion) {
    const correct = state.currentQuestion.options.find((o: any) => o.correct);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-primary/10 p-6 text-center">
        <h3 className="text-lg text-muted-foreground mb-2">Resposta correta:</h3>
        <Card className="p-6 mb-6 max-w-md">
          <p className="text-2xl font-bold text-primary">{correct?.label || "—"}</p>
        </Card>
        <p className="text-sm text-muted-foreground">Veja o ranking no telão!</p>
      </div>
    );
  }

  // ===== FIM =====
  if (state.status === "finished") {
    const me = state.players.find((p: any) => p.id === joined.playerId);
    const myRank = state.players.findIndex((p: any) => p.id === joined.playerId);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-primary/10 p-6 text-center">
        <Trophy className="h-20 w-20 text-primary mb-4" />
        <h1 className="text-3xl font-display mb-2">Quiz encerrado!</h1>
        {me && (
          <>
            <p className="text-xl">Você ficou em #{myRank + 1}</p>
            <p className="text-4xl font-bold text-primary mt-2">{me.score} pts</p>
            <p className="text-sm text-muted-foreground mt-1">{me.correctCount} acertos</p>
          </>
        )}
      </div>
    );
  }

  if (state.status === "canceled") {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground p-6">
        Sala cancelada pelo mentor.
      </div>
    );
  }

  return null;
}
