import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, CheckCircle2, ListChecks } from "lucide-react";
import { toast } from "sonner";

const SEGMENTS = [
  { value: "geral", label: "Geral" },
  { value: "comercial", label: "Comercial / Vendas" },
  { value: "lideranca", label: "Liderança" },
  { value: "financeiro", label: "Financeiro" },
  { value: "rh", label: "RH" },
  { value: "marketing", label: "Marketing" },
  { value: "produtividade", label: "Produtividade" },
  { value: "empresarial", label: "Empresarial" },
  { value: "juridico", label: "Jurídico" },
  { value: "processos", label: "Processos" },
  { value: "educacao", label: "Educação" },
];

type Option = { label: string; correct: boolean };
type Question = { text: string; options: Option[] };

const emptyQuestion = (): Question => ({
  text: "",
  options: [
    { label: "", correct: true },
    { label: "", correct: false },
    { label: "", correct: false },
    { label: "", correct: false },
  ],
});

interface Props {
  open: boolean;
  quiz: any | null;
  onClose: () => void;
  onSaved: (saved: any) => void;
}

export default function QuizEditorDialog({ open, quiz, onClose, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [segment, setSegment] = useState("geral");
  const [timeLimit, setTimeLimit] = useState(20);
  const [questions, setQuestions] = useState<Question[]>([emptyQuestion()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (quiz) {
        setTitle(quiz.title || "");
        setDescription(quiz.description || "");
        setSegment(quiz.segment || "geral");
        setTimeLimit(quiz.defaultTimeLimit || 20);
        setQuestions(
          (quiz.questions?.length ? quiz.questions : [emptyQuestion()]).map((q: any) => ({
            text: q.text || "",
            options: (q.options || []).map((o: any) => ({ label: o.label || "", correct: !!o.correct })),
          })),
        );
      } else {
        setTitle(""); setDescription(""); setSegment("geral");
        setTimeLimit(20); setQuestions([emptyQuestion()]);
      }
    }
  }, [open, quiz]);

  function setOption(qi: number, oi: number, patch: Partial<Option>) {
    setQuestions((qs) => qs.map((q, i) => i !== qi ? q : {
      ...q,
      options: q.options.map((o, j) => {
        if (j !== oi) return patch.correct ? { ...o, correct: false } : o;
        return { ...o, ...patch };
      }),
    }));
  }

  async function save() {
    if (!title.trim()) return toast.error("Dê um título ao quiz");
    setSaving(true);
    try {
      const body = { title, description, segment, defaultTimeLimit: timeLimit, questions };
      const saved = quiz
        ? await api<any>(`/quiz/templates/${quiz.id}`, { method: "PATCH", body })
        : await api<any>("/quiz/templates/manual", { method: "POST", body });
      toast.success(quiz ? "Quiz atualizado" : "Quiz criado");
      onSaved(saved);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            {quiz ? "Editar quiz" : "Novo quiz"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid sm:grid-cols-[1fr_180px] gap-2">
            <div>
              <Label className="text-xs">Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Quiz de SPIN Selling" />
            </div>
            <div>
              <Label className="text-xs">Segmento</Label>
              <Select value={segment} onValueChange={setSegment}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEGMENTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Descrição (opcional)</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Sobre o que é esse quiz..." />
          </div>

          <div>
            <Label className="text-xs">Tempo por pergunta (segundos)</Label>
            <Input type="number" min={5} max={120} value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} className="max-w-[120px]" />
          </div>

          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-medium">Perguntas</h3>
            {questions.map((q, qi) => (
              <div key={qi} className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded mt-1">{qi + 1}</span>
                  <Textarea
                    rows={2}
                    placeholder="Digite a pergunta..."
                    value={q.text}
                    onChange={(e) => setQuestions((qs) => qs.map((qq, i) => i === qi ? { ...qq, text: e.target.value } : qq))}
                    className="flex-1"
                  />
                  {questions.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => setQuestions((qs) => qs.filter((_, i) => i !== qi))}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="space-y-1.5 pl-8">
                  {q.options.map((o, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setOption(qi, oi, { correct: true })}
                        title="Marcar como correta"
                        className={`flex-shrink-0 h-7 w-7 rounded-full border-2 flex items-center justify-center transition ${o.correct ? "bg-emerald-500 border-emerald-500 text-white" : "border-border hover:border-emerald-500/50"}`}
                      >
                        {o.correct && <CheckCircle2 className="h-4 w-4" />}
                      </button>
                      <Input
                        placeholder={`Opção ${oi + 1}`}
                        value={o.label}
                        onChange={(e) => setOption(qi, oi, { label: e.target.value })}
                        className="h-9"
                      />
                      {q.options.length > 2 && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQuestions((qs) => qs.map((qq, i) => i !== qi ? qq : { ...qq, options: qq.options.filter((_, j) => j !== oi) }))}>
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {q.options.length < 4 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setQuestions((qs) => qs.map((qq, i) => i !== qi ? qq : { ...qq, options: [...qq.options, { label: "", correct: false }] }))}
                    >
                      <Plus className="h-3 w-3 mr-1" />Adicionar opção
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])} className="w-full">
              <Plus className="h-3.5 w-3.5 mr-1" />Nova pergunta
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="bg-gradient-primary">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {quiz ? "Salvar alterações" : "Criar quiz"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}