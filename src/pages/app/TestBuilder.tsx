import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Trash2, GripVertical, ArrowLeft, Save, Sparkles } from "lucide-react";
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
}

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

function SortableQuestion({ q, idx, onChange, onRemove }: { q: Q; idx: number; onChange: (q: Q) => void; onRemove: () => void }) {
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
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold bg-muted px-2 py-1 rounded">#{idx + 1}</span>
            <Select value={q.type} onValueChange={(v) => onChange(newQuestion(v as QType))}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple_choice">Múltipla escolha</SelectItem>
                <SelectItem value="scale">Escala 1-10</SelectItem>
                <SelectItem value="open_text">Texto aberto</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" className="w-20" min={1} value={q.weight} onChange={(e) => onChange({ ...q, weight: +e.target.value || 1 })} title="Peso" />
            <Button size="icon" variant="ghost" onClick={onRemove}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (isNew) return;
    api<any>(`/tests/templates/${id}`)
      .then((t) => {
        setTitle(t.title);
        setDescription(t.description || "");
        setCategory(t.category || "custom");
        setAiPrompt(t.aiAnalysisPrompt || "");
        setQuestions((t.questions || []).map((q: any) => ({ id: q.id, type: q.type, text: q.text, weight: q.weight || 1, config: q.config })));
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
        questions: questions.map((q) => ({ type: q.type, text: q.text, weight: q.weight, config: q.config })),
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
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="flex items-center gap-2"><Sparkles className="h-3 w-3" />Prompt customizado de IA (opcional)</Label>
          <Textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            rows={3}
            placeholder="Ex: Analise como consultor financeiro sênior, focando em fluxo de caixa..."
          />
          <p className="text-xs text-muted-foreground mt-1">Substitui o prompt padrão. A IA gera análise + classificação Frio/Morno/Quente automaticamente.</p>
        </div>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-3">
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
                    onChange={(nq) => setQuestions(questions.map((x, j) => (j === i ? nq : x)))}
                    onRemove={() => setQuestions(questions.filter((_, j) => j !== i))}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
