import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Heart, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export default function EventNpsPage() {
  const { slug, ticketCode } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/public/events/ticket/${ticketCode}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        if (d?.registration?.npsAnsweredAt) setDone(true);
      })
      .finally(() => setLoading(false));
  }, [ticketCode]);

  async function submit() {
    if (score === null) { toast.error("Escolha uma nota"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/public/events/nps/${ticketCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, comment }),
      });
      if (!res.ok) throw new Error("Erro");
      setDone(true);
    } catch { toast.error("Erro ao enviar"); }
    finally { setSubmitting(false); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!data?.event) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Link inválido.</div>;

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-hero">
        <Card className="glass-card max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <Heart className="h-14 w-14 text-rose-500 mx-auto" />
            <h1 className="text-2xl font-display">Obrigado!</h1>
            <p className="text-muted-foreground">Sua opinião é muito importante para melhorarmos.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { event, registration } = data;

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6">
      <Card className="glass-card max-w-xl w-full">
        <CardContent className="p-8 space-y-6">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Sua opinião</div>
            <h1 className="text-2xl font-display mt-1">{event.name}</h1>
            <p className="text-muted-foreground mt-2">Olá <b>{registration.name}</b>, de 0 a 10, o quanto você recomendaria este evento para um amigo?</p>
          </div>
          <div className="grid grid-cols-11 gap-1.5">
            {Array.from({ length: 11 }).map((_, i) => (
              <button
                key={i}
                onClick={() => setScore(i)}
                className={`aspect-square rounded-lg font-bold text-sm transition-all ${
                  score === i ? "bg-gradient-primary text-white shadow-glow scale-110" : "bg-muted/40 hover:bg-muted/60"
                }`}
              >{i}</button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground"><span>Nada provável</span><span>Muito provável</span></div>
          <div>
            <Textarea placeholder="Conte-nos mais (opcional)..." value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
          </div>
          <Button onClick={submit} disabled={submitting || score === null} className="w-full bg-gradient-primary hover:opacity-90 h-12">
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Enviar avaliação
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
