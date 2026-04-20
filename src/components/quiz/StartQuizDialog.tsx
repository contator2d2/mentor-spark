import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Zap, Sparkles, Plus, Trash2, CheckCircle2, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Props { open: boolean; onClose: () => void; eventId?: string; }

type ManualOption = { label: string; correct: boolean };
type ManualQuestion = { text: string; options: ManualOption[] };

const emptyQuestion = (): ManualQuestion => ({
  text: "",
  options: [
    { label: "", correct: true },
    { label: "", correct: false },
    { label: "", correct: false },
    { label: "", correct: false },
  ],
});

export default function StartQuizDialog({ open, onClose, eventId }: Props) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"existing" | "ai" | "manual">("ai");
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [timeLimit, setTimeLimit] = useState(20);
  const [creating, setCreating] = useState(false);

  // IA
  const [aiTopic, setAiTopic] = useState("");
  const [aiContent, setAiContent] = useState("");
  const [aiNumQ, setAiNumQ] = useState(8);
  const [aiNumOpts, setAiNumOpts] = useState(4);
  const [aiDifficulty, setAiDifficulty] = useState<"easy" | "medium" | "hard">("medium");

  // Manual
  const [manualTitle, setManualTitle] = useState("");
  const [manualQuestions, setManualQuestions] = useState<ManualQuestion[]>([emptyQuestion()]);

  useEffect(() => {
    if (open) {
      // Lista quizzes salvos do mentor (novo modelo)
      api<any[]>("/quiz/templates").then(setTemplates).catch(() => {});
    }
  }, [open]);

  async function startSessionFromTemplate(tplId: string) {
    const s = await api<any>("/quiz/sessions", {
      method: "POST",
      body: { templateId: tplId, eventId, questionTimeLimit: timeLimit },
    });
    toast.success(`Sala criada! PIN ${s.pin}`);
    navigate(`/app/quiz/host/${s.id}`);
  }

  async function createFromExisting() {
    if (!templateId) return toast.error("Escolha um teste");
    setCreating(true);
    try {
      await startSessionFromTemplate(templateId);
    } catch (e: any) { toast.error(e.message); } finally { setCreating(false); }
  }

  async function createFromAI() {
    if (!aiTopic.trim()) return toast.error("Informe o tema/ideia do quiz");
    setCreating(true);
    try {
      const tpl = await api<any>("/quiz/templates/generate-ai", {
        method: "POST",
        body: {
          topic: aiTopic,
          content: aiContent || undefined,
          numQuestions: aiNumQ,
          numOptions: aiNumOpts,
          difficulty: aiDifficulty,
        },
      });
      toast.success("Quiz gerado pela IA!");
      await startSessionFromTemplate(tpl.id);
    } catch (e: any) { toast.error(e.message); } finally { setCreating(false); }
  }

  async function createFromManual() {
    if (!manualTitle.trim()) return toast.error("Dê um título ao quiz");
    if (!manualQuestions.length) return toast.error("Adicione ao menos 1 pergunta");
    setCreating(true);
    try {
      const tpl = await api<any>("/quiz/templates/manual", {
        method: "POST",
        body: { title: manualTitle, questions: manualQuestions },
      });
      toast.success("Quiz criado!");
      await startSessionFromTemplate(tpl.id);
    } catch (e: any) { toast.error(e.message); } finally { setCreating(false); }
  }

  function updateOption(qi: number, oi: number, patch: Partial<ManualOption>) {
    setManualQuestions((qs) => qs.map((q, i) => i !== qi ? q : {
      ...q,
      options: q.options.map((o, j) => j !== oi ? (patch.correct ? { ...o, correct: false } : o) : { ...o, ...patch }),
    }));
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />Criar Quiz PVP
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="ai" className="gap-1.5"><Sparkles className="h-3.5 w-3.5" />Gerar com IA</TabsTrigger>
            <TabsTrigger value="manual" className="gap-1.5"><ListChecks className="h-3.5 w-3.5" />Criar manual</TabsTrigger>
            <TabsTrigger value="existing" className="gap-1.5"><Zap className="h-3.5 w-3.5" />Teste existente</TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-3">
            <div>
              <Label className="text-xs">Tempo por pergunta (segundos)</Label>
              <Input type="number" min={5} max={120} value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} />
            </div>
          </div>

          {/* IA */}
          <TabsContent value="ai" className="space-y-3 mt-4">
            <div>
              <Label className="text-xs">Tema / ideia do quiz *</Label>
              <Input
                placeholder="Ex: Liderança ágil, Vendas consultivas, Marketing digital..."
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Conteúdo de referência (opcional)</Label>
              <Textarea
                rows={5}
                placeholder="Cole aqui um texto, resumo de aula, conteúdo de livro... A IA vai usar como base."
                value={aiContent}
                onChange={(e) => setAiContent(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground mt-1">Quanto mais contexto, melhores as perguntas.</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Nº de perguntas</Label>
                <Input type="number" min={3} max={20} value={aiNumQ} onChange={(e) => setAiNumQ(Number(e.target.value))} />
              </div>
              <div>
                <Label className="text-xs">Opções/pergunta</Label>
                <Input type="number" min={2} max={4} value={aiNumOpts} onChange={(e) => setAiNumOpts(Number(e.target.value))} />
              </div>
              <div>
                <Label className="text-xs">Dificuldade</Label>
                <Select value={aiDifficulty} onValueChange={(v) => setAiDifficulty(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Fácil</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="hard">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-md bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 inline mr-1 text-primary" />
              A IA vai gerar perguntas, opções e marcar a correta. Você pode editar depois em <strong>Testes</strong>.
            </div>
          </TabsContent>

          {/* MANUAL */}
          <TabsContent value="manual" className="space-y-3 mt-4">
            <div>
              <Label className="text-xs">Título do quiz *</Label>
              <Input value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} placeholder="Ex: Quiz de Vendas - Edição 1" />
            </div>

            <div className="space-y-3">
              {manualQuestions.map((q, qi) => (
                <div key={qi} className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded mt-1">{qi + 1}</span>
                    <Textarea
                      rows={2}
                      placeholder="Digite a pergunta..."
                      value={q.text}
                      onChange={(e) => setManualQuestions((qs) => qs.map((qq, i) => i === qi ? { ...qq, text: e.target.value } : qq))}
                      className="flex-1"
                    />
                    {manualQuestions.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => setManualQuestions((qs) => qs.filter((_, i) => i !== qi))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1.5 pl-8">
                    {q.options.map((o, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateOption(qi, oi, { correct: true })}
                          title="Marcar como correta"
                          className={`flex-shrink-0 h-7 w-7 rounded-full border-2 flex items-center justify-center transition ${o.correct ? "bg-emerald-500 border-emerald-500 text-white" : "border-border hover:border-emerald-500/50"}`}
                        >
                          {o.correct && <CheckCircle2 className="h-4 w-4" />}
                        </button>
                        <Input
                          placeholder={`Opção ${oi + 1}${oi === 0 ? " (correta)" : ""}`}
                          value={o.label}
                          onChange={(e) => updateOption(qi, oi, { label: e.target.value })}
                          className="h-9"
                        />
                        {q.options.length > 2 && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setManualQuestions((qs) => qs.map((qq, i) => i !== qi ? qq : { ...qq, options: qq.options.filter((_, j) => j !== oi) }))}>
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
                        onClick={() => setManualQuestions((qs) => qs.map((qq, i) => i !== qi ? qq : { ...qq, options: [...qq.options, { label: "", correct: false }] }))}
                      >
                        <Plus className="h-3 w-3 mr-1" />Adicionar opção
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={() => setManualQuestions((qs) => [...qs, emptyQuestion()])} className="w-full">
              <Plus className="h-3.5 w-3.5 mr-1" />Nova pergunta
            </Button>
          </TabsContent>

          {/* EXISTENTE */}
          <TabsContent value="existing" className="space-y-3 mt-4">
            <div>
              <Label className="text-xs">Teste base (apenas múltipla escolha)</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {templates.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum teste criado ainda.</div>}
                  {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">A opção com maior pontuação em cada pergunta será considerada correta. Pontuação Kahoot-style: 500-1000 pts por velocidade.</p>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          {tab === "ai" && (
            <Button onClick={createFromAI} disabled={creating} className="bg-gradient-primary">
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Gerar e iniciar
            </Button>
          )}
          {tab === "manual" && (
            <Button onClick={createFromManual} disabled={creating} className="bg-gradient-primary">
              {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Criar e iniciar
            </Button>
          )}
          {tab === "existing" && (
            <Button onClick={createFromExisting} disabled={creating} className="bg-gradient-primary">
              {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Criar sala
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
