import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Trash2, GripVertical, ArrowLeft, Save, Sparkles, Library, Layers, FileText, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type QType = "multiple_choice" | "scale" | "open_text";

interface Q {
  id?: string;
  type: QType;
  text: string;
  weight: number;
  config: any;
  categoryKey?: string;
}

interface Cat { key: string; label: string; weight: number }
interface InterpRange { min: number; max: number; label: string; description: string }

const CATEGORIES = [
  { v: "financial", l: "Financeiro" },
  { v: "sales", l: "Vendas" },
  { v: "leadership", l: "Liderança" },
  { v: "operations", l: "Operacional" },
  { v: "custom", l: "Personalizado" },
];

function newQuestion(type: QType): Q {
  if (type === "multiple_choice")
    return { type, text: "", weight: 1, config: { options: [{ label: "Opção A", score: 0 }, { label: "Opção B", score: 5 }, { label: "Opção C", score: 10 }] } };
  if (type === "scale") return { type, text: "", weight: 1, config: { min: 1, max: 10 } };
  return { type, text: "", weight: 1, config: null };
}

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 32);
}

function SortableQuestion({ q, idx, cats, onChange, onRemove }: { q: Q; idx: number; cats: Cat[]; onChange: (q: Q) => void; onRemove: () => void }) {
  const id = `q-${idx}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <Card ref={setNodeRef} style={style} className="p-4 space-y-3">
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="mt-2 cursor-grab text-muted-foreground hover:text-foreground">
          <GripVertical className="h-5 w-5" />
        </button>
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold bg-muted px-2 py-1 rounded">#{idx + 1}</span>
            <Select value={q.type} onValueChange={(v) => onChange({ ...newQuestion(v as QType), text: q.text, weight: q.weight, categoryKey: q.categoryKey })}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple_choice">Múltipla escolha</SelectItem>
                <SelectItem value="scale">Escala 1-10</SelectItem>
                <SelectItem value="open_text">Texto aberto</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" className="w-20" min={1} value={q.weight} onChange={(e) => onChange({ ...q, weight: +e.target.value || 1 })} title="Peso" />
            {cats.length > 0 && (
              <Select value={q.categoryKey || "_none"} onValueChange={(v) => onChange({ ...q, categoryKey: v === "_none" ? undefined : v })}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sem categoria</SelectItem>
                  {cats.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button size="icon" variant="ghost" onClick={onRemove} className="ml-auto"><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
          <Textarea
            placeholder="Pergunta..."
            value={q.text}
            onChange={(e) => onChange({ ...q, text: e.target.value })}
            rows={2}
          />
          {q.type === "multiple_choice" && (
            <div className="space-y-2">
              <Label className="text-xs">Opções (label + score)</Label>
              {(q.config?.options || []).map((opt: any, i: number) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={opt.label}
                    onChange={(e) => {
                      const opts = [...q.config.options];
                      opts[i] = { ...opts[i], label: e.target.value };
                      onChange({ ...q, config: { ...q.config, options: opts } });
                    }}
                  />
                  <Input
                    type="number"
                    className="w-24"
                    value={opt.score}
                    onChange={(e) => {
                      const opts = [...q.config.options];
                      opts[i] = { ...opts[i], score: +e.target.value };
                      onChange({ ...q, config: { ...q.config, options: opts } });
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      const opts = q.config.options.filter((_: any, j: number) => j !== i);
                      onChange({ ...q, config: { ...q.config, options: opts } });
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const opts = [...(q.config?.options || []), { label: "Nova opção", score: 0 }];
                  onChange({ ...q, config: { ...q.config, options: opts } });
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                Adicionar opção
              </Button>
            </div>
          )}
          {q.type === "scale" && (
            <div className="flex gap-2 items-end">
              <div>
                <Label className="text-xs">Min</Label>
                <Input type="number" className="w-20" value={q.config?.min ?? 1} onChange={(e) => onChange({ ...q, config: { ...q.config, min: +e.target.value } })} />
              </div>
              <div>
                <Label className="text-xs">Max</Label>
                <Input type="number" className="w-20" value={q.config?.max ?? 10} onChange={(e) => onChange({ ...q, config: { ...q.config, max: +e.target.value } })} />
              </div>
              <span className="text-xs text-muted-foreground pb-2">Quanto maior, mais pontos.</span>
            </div>
          )}
          {q.type === "open_text" && <p className="text-xs text-muted-foreground italic">Texto aberto não pontua, mas será analisado pela IA.</p>}
        </div>
      </div>
    </Card>
  );
}

export default function TestBuilder() {
  const { id } = useParams();
  const nav = useNavigate();
  const isNew = !id || id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("custom");
  const [aiPrompt, setAiPrompt] = useState("");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [interpretation, setInterpretation] = useState<InterpRange[]>([]);
  const [baseReport, setBaseReport] = useState("");
  const [baseRecommendation, setBaseRecommendation] = useState("");
  const [sourceLibraryId, setSourceLibraryId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (isNew) return;
    api<any>(`/tests/templates/${id}`)
      .then((t) => {
        setTitle(t.title);
        setDescription(t.description || "");
        setCategory(t.category || "custom");
        setAiPrompt(t.aiAnalysisPrompt || "");
        setCats(t.categories || []);
        setInterpretation(t.interpretation || []);
        setBaseReport(t.baseReport || "");
        setBaseRecommendation(t.baseRecommendation || "");
        setSourceLibraryId(t.sourceLibraryId || null);
        setQuestions((t.questions || []).map((q: any) => ({ id: q.id, type: q.type, text: q.text, weight: q.weight || 1, config: q.config, categoryKey: q.categoryKey })));
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = parseInt(String(active.id).slice(2));
    const newIdx = parseInt(String(over.id).slice(2));
    setQuestions((qs) => arrayMove(qs, oldIdx, newIdx));
  }

  function addCategory() {
    const label = prompt("Nome da categoria:");
    if (!label) return;
    setCats([...cats, { key: slugify(label) || `cat_${cats.length + 1}`, label, weight: 1 }]);
  }
  function removeCategory(key: string) {
    setCats(cats.filter((c) => c.key !== key));
    setQuestions(questions.map((q) => (q.categoryKey === key ? { ...q, categoryKey: undefined } : q)));
  }

  function addInterpRange() {
    setInterpretation([...interpretation, { min: 0, max: 100, label: "Faixa", description: "" }]);
  }

  async function save() {
    if (!title || questions.length === 0) {
      toast.error("Título e ao menos 1 pergunta são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title,
        description,
        category,
        aiAnalysisPrompt: aiPrompt || undefined,
        categories: cats.length ? cats : undefined,
        interpretation: interpretation.length ? interpretation : undefined,
        baseReport: baseReport || undefined,
        baseRecommendation: baseRecommendation || undefined,
        questions: questions.map((q) => ({ type: q.type, text: q.text, weight: q.weight, config: q.config, categoryKey: q.categoryKey })),
      };
      if (isNew) {
        const t = await api<any>("/tests/templates", { method: "POST", body: payload });
        toast.success("Teste criado");
        nav(`/app/tests/${t.id}`);
      } else {
        await api(`/tests/templates/${id}`, { method: "PATCH", body: payload });
        toast.success("Teste atualizado");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => nav("/app/tests")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          <Save className="h-4 w-4 mr-2" />
          Salvar teste
        </Button>
      </div>

      {sourceLibraryId && (
        <Card className="p-3 bg-accent/5 border-accent/30 flex items-center gap-2">
          <Library className="h-4 w-4 text-accent" />
          <span className="text-sm">
            Este teste foi <strong>duplicado da biblioteca</strong>. Personalize livremente — sua cópia é independente.
          </span>
        </Card>
      )}

      <Card className="p-6 space-y-4">
        <div>
          <Label>Título *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Diagnóstico Empresarial 360°" />
        </div>
        <div>
          <Label>Descrição</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Categoria interna</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="questions">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="questions"><ListChecks className="h-3 w-3 mr-1" />Perguntas</TabsTrigger>
          <TabsTrigger value="categories"><Layers className="h-3 w-3 mr-1" />Categorias</TabsTrigger>
          <TabsTrigger value="report"><FileText className="h-3 w-3 mr-1" />Relatório</TabsTrigger>
          <TabsTrigger value="ai"><Sparkles className="h-3 w-3 mr-1" />IA</TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="pt-4">
          <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="font-display text-xl font-bold">Perguntas ({questions.length})</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setQuestions([...questions, newQuestion("multiple_choice")])}>
                  <Plus className="h-3 w-3 mr-1" />Múltipla
                </Button>
                <Button size="sm" variant="outline" onClick={() => setQuestions([...questions, newQuestion("scale")])}>
                  <Plus className="h-3 w-3 mr-1" />Escala
                </Button>
                <Button size="sm" variant="outline" onClick={() => setQuestions([...questions, newQuestion("open_text")])}>
                  <Plus className="h-3 w-3 mr-1" />Aberta
                </Button>
              </div>
            </div>

            {questions.length === 0 ? (
              <Card className="p-10 text-center text-muted-foreground">Adicione a primeira pergunta acima.</Card>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={questions.map((_, i) => `q-${i}`)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {questions.map((q, i) => (
                      <SortableQuestion
                        key={i}
                        q={q}
                        idx={i}
                        cats={cats}
                        onChange={(nq) => setQuestions(questions.map((x, j) => (j === i ? nq : x)))}
                        onRemove={() => setQuestions(questions.filter((_, j) => j !== i))}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold">Categorias avaliadas</h3>
              <p className="text-sm text-muted-foreground">Defina dimensões para gerar score por categoria no relatório.</p>
            </div>
            <Button size="sm" variant="outline" onClick={addCategory}><Plus className="h-3 w-3 mr-1" />Categoria</Button>
          </div>
          {cats.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">Nenhuma categoria. O teste calculará apenas score total.</Card>
          ) : (
            <div className="space-y-2">
              {cats.map((c, i) => (
                <Card key={c.key} className="p-3 flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">{c.key}</Badge>
                  <Input
                    value={c.label}
                    onChange={(e) => setCats(cats.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={c.weight}
                    onChange={(e) => setCats(cats.map((x, j) => (j === i ? { ...x, weight: +e.target.value || 1 } : x)))}
                    className="w-20"
                    title="Peso"
                  />
                  <Button size="icon" variant="ghost" onClick={() => removeCategory(c.key)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="report" className="pt-4 space-y-4">
          <div>
            <Label>Relatório base</Label>
            <Textarea value={baseReport} onChange={(e) => setBaseReport(e.target.value)} rows={6} placeholder="Texto que será exibido ao final do teste..." />
          </div>
          <div>
            <Label>Recomendação inicial</Label>
            <Textarea value={baseRecommendation} onChange={(e) => setBaseRecommendation(e.target.value)} rows={4} placeholder="Próximos passos sugeridos..." />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Faixas de interpretação (por % de score)</Label>
              <Button size="sm" variant="outline" onClick={addInterpRange}><Plus className="h-3 w-3 mr-1" />Faixa</Button>
            </div>
            {interpretation.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">Sem faixas. Adicione para gerar interpretação automática.</Card>
            ) : (
              <div className="space-y-2">
                {interpretation.map((r, i) => (
                  <Card key={i} className="p-3 space-y-2">
                    <div className="flex gap-2 items-center">
                      <Input type="number" min={0} max={100} value={r.min} onChange={(e) => setInterpretation(interpretation.map((x, j) => j === i ? { ...x, min: +e.target.value } : x))} className="w-20" placeholder="min" />
                      <span className="text-xs text-muted-foreground">a</span>
                      <Input type="number" min={0} max={100} value={r.max} onChange={(e) => setInterpretation(interpretation.map((x, j) => j === i ? { ...x, max: +e.target.value } : x))} className="w-20" placeholder="max" />
                      <span className="text-xs text-muted-foreground">%</span>
                      <Input value={r.label} onChange={(e) => setInterpretation(interpretation.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} placeholder="Rótulo (ex: Atenção)" className="flex-1" />
                      <Button size="icon" variant="ghost" onClick={() => setInterpretation(interpretation.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                    <Textarea value={r.description} onChange={(e) => setInterpretation(interpretation.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} rows={2} placeholder="Descrição da faixa" />
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="ai" className="pt-4">
          <Label className="flex items-center gap-2"><Sparkles className="h-3 w-3" />Prompt customizado de IA (opcional)</Label>
          <Textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            rows={6}
            placeholder="Ex: Analise como consultor financeiro sênior, focando em fluxo de caixa..."
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">Substitui o prompt padrão. A IA gera análise + classificação Frio/Morno/Quente automaticamente.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
