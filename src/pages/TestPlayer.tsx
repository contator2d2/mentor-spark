// Player conversacional público — /c/:slug/test/:testId?lead=:leadId
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useBranding } from "@/contexts/BrandingContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: string;
  type: "multiple_choice" | "scale" | "open_text";
  text: string;
  config: any;
}

interface Test {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
}

export default function TestPlayer() {
  const { slug, testId } = useParams();
  const [search] = useSearchParams();
  const leadId = search.get("lead");
  const { setBrand } = useBranding();

  const [mentor, setMentor] = useState<any>(null);
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ scorePct: number; classification: string } | null>(null);

  // Captura inline (se não veio leadId na URL)
  const [needsCapture, setNeedsCapture] = useState(!leadId);
  const [capturedLeadId, setCapturedLeadId] = useState<string | null>(leadId);
  const [captureForm, setCaptureForm] = useState({ name: "", email: "", phone: "" });

  useEffect(() => {
    Promise.all([
      api<any>(`/public/mentor/${slug}`, { auth: false }),
      api<Test>(`/public/mentor/${slug}/tests/${testId}`, { auth: false }),
    ])
      .then(([m, t]) => {
        setMentor(m);
        setBrand({
          brandName: m.brandName,
          brandLogoUrl: m.brandLogoUrl,
          brandPrimaryColor: m.brandPrimaryColor,
          brandAccentColor: m.brandAccentColor,
          slug: m.slug,
        });
        setTest(t);
      })
      .catch((e) => toast.error(e.message || "Erro"))
      .finally(() => setLoading(false));
  }, [slug, testId, setBrand]);

  const total = test?.questions.length || 0;
  const progress = useMemo(() => (total ? Math.round(((step + 1) / total) * 100) : 0), [step, total]);
  const current = test?.questions[step];

  async function captureAndStart() {
    if (!captureForm.name || !captureForm.email) {
      toast.error("Preencha nome e email");
      return;
    }
    setSubmitting(true);
    try {
      const r = await api<{ leadId: string }>(`/public/mentor/${slug}/lead`, {
        method: "POST",
        auth: false,
        body: { ...captureForm, source: "test-player" },
      });
      setCapturedLeadId(r.leadId);
      setNeedsCapture(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function answerAndNext(value: any) {
    if (!current) return;
    setAnswers({ ...answers, [current.id]: value });
    if (step + 1 < total) {
      setStep(step + 1);
    } else {
      submit({ ...answers, [current.id]: value });
    }
  }

  async function submit(finalAnswers: Record<string, any>) {
    if (!capturedLeadId || !test) return;
    setSubmitting(true);
    try {
      const payload = {
        leadId: capturedLeadId,
        answers: test.questions.map((q) => ({ questionId: q.id, answer: finalAnswers[q.id] ?? null })),
      };
      const r = await api<{ scorePct: number; classification: string }>(`/public/mentor/${slug}/tests/${testId}/responses`, {
        method: "POST",
        auth: false,
        body: payload,
      });
      setResult({ scorePct: r.scorePct, classification: r.classification });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!mentor || !test) return <div className="min-h-screen grid place-items-center text-muted-foreground">Não disponível.</div>;

  // Resultado
  if (result) {
    const label = result.classification === "hot" ? "🔥 Quente" : result.classification === "warm" ? "🌤️ Morno" : "❄️ Frio";
    return (
      <div className="min-h-screen bg-gradient-subtle grid place-items-center p-6">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <CheckCircle2 className="h-14 w-14 text-success mx-auto" />
          <h2 className="font-display text-2xl font-bold">Diagnóstico concluído!</h2>
          <div className="text-5xl font-bold">{Math.round(result.scorePct)}%</div>
          <p className="text-lg text-muted-foreground">{label}</p>
          <p className="text-sm text-muted-foreground">
            {mentor.brandName} recebeu seu resultado e entrará em contato em breve com sua análise personalizada.
          </p>
        </Card>
      </div>
    );
  }

  // Captura inline
  if (needsCapture) {
    return (
      <div className="min-h-screen bg-gradient-subtle grid place-items-center p-6">
        <Card className="max-w-md w-full p-8 space-y-4">
          {mentor.brandLogoUrl && <img src={mentor.brandLogoUrl} alt={mentor.brandName} className="h-10 mx-auto" />}
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold">{test.title}</h1>
            {test.description && <p className="text-sm text-muted-foreground mt-2">{test.description}</p>}
          </div>
          <p className="text-sm text-center text-muted-foreground">Antes de começar, conte quem é você:</p>
          <Input placeholder="Nome completo" value={captureForm.name} onChange={(e) => setCaptureForm({ ...captureForm, name: e.target.value })} />
          <Input placeholder="Email" type="email" value={captureForm.email} onChange={(e) => setCaptureForm({ ...captureForm, email: e.target.value })} />
          <Input placeholder="WhatsApp (opcional)" value={captureForm.phone} onChange={(e) => setCaptureForm({ ...captureForm, phone: e.target.value })} />
          <Button onClick={captureAndStart} disabled={submitting} className="w-full">
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            <Sparkles className="h-4 w-4 mr-2" />
            Começar diagnóstico
          </Button>
        </Card>
      </div>
    );
  }

  // Player
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {mentor.brandLogoUrl && <img src={mentor.brandLogoUrl} alt="" className="h-7" />}
            <span className="font-display font-bold">{mentor.brandName}</span>
          </div>
          <span className="text-sm text-muted-foreground">{step + 1} / {total}</span>
        </div>
        <Progress value={progress} className="mb-6" />

        {current && (
          <Card className="p-8 space-y-6 animate-fade-in" key={current.id}>
            <h2 className="text-xl font-medium">{current.text}</h2>

            {current.type === "multiple_choice" && (
              <div className="space-y-2">
                {(current.config?.options || []).map((opt: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => answerAndNext(opt.label)}
                    className="w-full text-left p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-between group"
                    disabled={submitting}
                  >
                    <span>{opt.label}</span>
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 text-primary" />
                  </button>
                ))}
              </div>
            )}

            {current.type === "scale" && (
              <div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {Array.from({ length: (current.config?.max || 10) - (current.config?.min || 1) + 1 }, (_, i) => {
                    const v = (current.config?.min || 1) + i;
                    return (
                      <button
                        key={v}
                        onClick={() => answerAndNext(v)}
                        disabled={submitting}
                        className="w-12 h-12 rounded-lg border-2 border-border hover:border-primary hover:bg-primary hover:text-primary-foreground font-bold transition-colors"
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-3">
                  <span>Pior</span>
                  <span>Melhor</span>
                </div>
              </div>
            )}

            {current.type === "open_text" && (
              <ScaleOpenText onSubmit={(v) => answerAndNext(v)} disabled={submitting} />
            )}
          </Card>
        )}

        {submitting && step + 1 === total && (
          <p className="text-center text-sm text-muted-foreground mt-4 animate-pulse">
            <Sparkles className="inline h-4 w-4 mr-1" />Analisando suas respostas com IA...
          </p>
        )}
      </div>
    </div>
  );
}

function ScaleOpenText({ onSubmit, disabled }: { onSubmit: (v: string) => void; disabled: boolean }) {
  const [v, setV] = useState("");
  return (
    <div className="space-y-3">
      <Textarea value={v} onChange={(e) => setV(e.target.value)} rows={4} placeholder="Sua resposta..." />
      <Button onClick={() => onSubmit(v)} disabled={disabled || !v.trim()} className="w-full">
        Continuar <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}
