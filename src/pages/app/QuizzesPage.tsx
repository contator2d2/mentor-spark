import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Zap, Sparkles, Plus, Library as LibraryIcon, Play, Pencil, Copy, Trash2,
  Search, Loader2, Brain, ListChecks, PartyPopper,
} from "lucide-react";
import StartQuizDialog from "@/components/quiz/StartQuizDialog";
import QuizEditorDialog from "@/components/quiz/QuizEditorDialog";

const SEGMENTS = [
  { value: "all", label: "Todos os segmentos" },
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
  { value: "geral", label: "Geral" },
];

const SEGMENT_LABEL: Record<string, string> = SEGMENTS.reduce(
  (acc, s) => ({ ...acc, [s.value]: s.label }), {} as Record<string, string>,
);

interface QuizTpl {
  id: string;
  title: string;
  description?: string;
  segment: string;
  defaultTimeLimit: number;
  questions: Array<{ text: string; options: Array<{ label: string; correct: boolean }> }>;
  aiGenerated?: boolean;
  sourceLibraryId?: string;
  updatedAt: string;
}
interface LibraryTpl {
  id: string;
  title: string;
  description: string;
  segment: string;
  defaultTimeLimit: number;
  questions: any[];
}
interface SessionItem {
  id: string;
  pin: string;
  title: string;
  status: string;
  createdAt: string;
}

export default function QuizzesPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("mine");
  const [mine, setMine] = useState<QuizTpl[]>([]);
  const [library, setLibrary] = useState<LibraryTpl[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<QuizTpl | null>(null);
  const [previewing, setPreviewing] = useState<QuizTpl | LibraryTpl | null>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [m, l, s] = await Promise.all([
        api<QuizTpl[]>("/quiz/templates").catch(() => []),
        api<LibraryTpl[]>("/quiz/library").catch(() => []),
        api<SessionItem[]>("/quiz/sessions").catch(() => []),
      ]);
      setMine(m); setLibrary(l); setSessions(s);
    } finally { setLoading(false); }
  }

  useEffect(() => { loadAll(); }, []);

  const filteredMine = useMemo(() => {
    return mine.filter((q) => {
      if (segmentFilter !== "all" && q.segment !== segmentFilter) return false;
      if (search && !q.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [mine, search, segmentFilter]);

  const filteredLibrary = useMemo(() => {
    return library.filter((q) => {
      if (segmentFilter !== "all" && q.segment !== segmentFilter) return false;
      if (search && !q.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [library, search, segmentFilter]);

  const librarySegments = useMemo(() => {
    const map: Record<string, LibraryTpl[]> = {};
    filteredLibrary.forEach((q) => {
      if (!map[q.segment]) map[q.segment] = [];
      map[q.segment].push(q);
    });
    return Object.entries(map);
  }, [filteredLibrary]);

  async function startSession(templateId: string) {
    try {
      const s = await api<any>("/quiz/sessions", { method: "POST", body: { templateId } });
      toast.success(`Sala criada! PIN ${s.pin}`);
      navigate(`/app/quiz/host/${s.id}`);
    } catch (e: any) { toast.error(e.message); }
  }

  async function duplicate(q: QuizTpl) {
    try {
      const copy = await api<QuizTpl>(`/quiz/templates/${q.id}/duplicate`, { method: "POST" });
      toast.success("Quiz duplicado");
      setMine((arr) => [copy, ...arr]);
    } catch (e: any) { toast.error(e.message); }
  }

  async function remove(q: QuizTpl) {
    try {
      await api(`/quiz/templates/${q.id}`, { method: "DELETE" });
      toast.success("Quiz excluído");
      setMine((arr) => arr.filter((x) => x.id !== q.id));
    } catch (e: any) { toast.error(e.message); }
  }

  async function cloneFromLibrary(item: LibraryTpl) {
    try {
      const copy = await api<QuizTpl>(`/quiz/library/${item.id}/clone`, { method: "POST" });
      toast.success("Adicionado aos seus quizzes");
      setMine((arr) => [copy, ...arr]);
      setTab("mine");
    } catch (e: any) { toast.error(e.message); }
  }

  function openEditor(q: QuizTpl | null) {
    setEditing(q);
    setEditorOpen(true);
  }

  function onEditorSaved(saved: QuizTpl) {
    setMine((arr) => {
      const exists = arr.find((x) => x.id === saved.id);
      if (exists) return arr.map((x) => x.id === saved.id ? saved : x);
      return [saved, ...arr];
    });
    setEditorOpen(false);
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Zap className="h-7 w-7 text-primary" />Quizzes PVP
          </h1>
          <p className="text-muted-foreground mt-1">Crie, salve e use modelos de quiz competitivos estilo Kahoot.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openEditor(null)} className="gap-1.5">
            <Plus className="h-4 w-4" />Novo manual
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="bg-gradient-primary gap-1.5">
            <Sparkles className="h-4 w-4" />Iniciar / Gerar com IA
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por título..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={segmentFilter} onValueChange={setSegmentFilter}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SEGMENTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 max-w-xl">
          <TabsTrigger value="mine" className="gap-1.5">
            <ListChecks className="h-3.5 w-3.5" />Meus Quizzes
            <Badge variant="secondary" className="ml-1 text-[10px] h-5">{mine.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-1.5">
            <LibraryIcon className="h-3.5 w-3.5" />Biblioteca
            <Badge variant="secondary" className="ml-1 text-[10px] h-5">{library.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-1.5">
            <PartyPopper className="h-3.5 w-3.5" />Sessões
            <Badge variant="secondary" className="ml-1 text-[10px] h-5">{sessions.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* MEUS QUIZZES */}
        <TabsContent value="mine" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filteredMine.length === 0 ? (
            <Card className="p-12 text-center">
              <Zap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="font-medium mb-1">Nenhum quiz salvo ainda</h3>
              <p className="text-sm text-muted-foreground mb-4">Comece criando manualmente, gerando com IA ou clonando da biblioteca.</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => openEditor(null)}><Plus className="h-4 w-4 mr-1" />Criar manual</Button>
                <Button onClick={() => setCreateOpen(true)} className="bg-gradient-primary"><Sparkles className="h-4 w-4 mr-1" />Gerar com IA</Button>
                <Button variant="outline" onClick={() => setTab("library")}><LibraryIcon className="h-4 w-4 mr-1" />Ver biblioteca</Button>
              </div>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMine.map((q) => (
                <Card key={q.id} className="p-4 flex flex-col group hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[10px]">{SEGMENT_LABEL[q.segment] || q.segment}</Badge>
                      {q.aiGenerated && (
                        <Badge variant="secondary" className="text-[10px] gap-0.5"><Brain className="h-2.5 w-2.5" />IA</Badge>
                      )}
                      {q.sourceLibraryId && (
                        <Badge variant="secondary" className="text-[10px] gap-0.5"><LibraryIcon className="h-2.5 w-2.5" />Biblioteca</Badge>
                      )}
                    </div>
                  </div>
                  <h3 className="font-medium leading-tight mb-1 line-clamp-2">{q.title}</h3>
                  {q.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{q.description}</p>}
                  <div className="text-xs text-muted-foreground mb-3">
                    {q.questions?.length || 0} perguntas · {q.defaultTimeLimit}s/pergunta
                  </div>
                  <div className="mt-auto flex items-center gap-1.5">
                    <Button size="sm" className="flex-1 bg-gradient-primary" onClick={() => startSession(q.id)}>
                      <Play className="h-3.5 w-3.5 mr-1" />Iniciar
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditor(q)} title="Editar">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => duplicate(q)} title="Duplicar">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" title="Excluir">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir "{q.title}"?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(q)} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* BIBLIOTECA */}
        <TabsContent value="library" className="mt-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : librarySegments.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">Nenhum modelo encontrado para os filtros.</Card>
          ) : (
            librarySegments.map(([seg, items]) => (
              <div key={seg}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="font-display text-xl">{SEGMENT_LABEL[seg] || seg}</h2>
                  <Badge variant="secondary" className="text-[10px]">{items.length} modelos</Badge>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((q) => (
                    <Card key={q.id} className="p-4 flex flex-col hover:shadow-lg transition-shadow border-primary/10">
                      <h3 className="font-medium leading-tight mb-1">{q.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{q.description}</p>
                      <div className="text-xs text-muted-foreground mb-3">
                        {q.questions?.length || 0} perguntas · {q.defaultTimeLimit}s/pergunta
                      </div>
                      <div className="mt-auto flex items-center gap-1.5">
                        <Button size="sm" className="flex-1 bg-gradient-primary" onClick={() => cloneFromLibrary(q)}>
                          <Plus className="h-3.5 w-3.5 mr-1" />Adicionar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setPreviewing(q)}>Ver</Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* SESSÕES */}
        <TabsContent value="sessions" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : sessions.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">Nenhuma sessão criada ainda.</Card>
          ) : (
            <Card className="divide-y divide-border">
              {sessions.map((s) => (
                <div key={s.id} className="p-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{s.title}</span>
                      <Badge variant="outline" className="text-[10px]">PIN {s.pin}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(s.createdAt).toLocaleString("pt-BR")} · {s.status}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/app/quiz/host/${s.id}`)}>
                    Abrir
                  </Button>
                </div>
              ))}
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <StartQuizDialog open={createOpen} onClose={() => { setCreateOpen(false); loadAll(); }} />

      <QuizEditorDialog
        open={editorOpen}
        quiz={editing as any}
        onClose={() => { setEditorOpen(false); setEditing(null); }}
        onSaved={onEditorSaved}
      />

      {/* Preview da biblioteca */}
      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {previewing && (
            <>
              <DialogHeader>
                <DialogTitle>{previewing.title}</DialogTitle>
                <p className="text-sm text-muted-foreground">{(previewing as any).description}</p>
              </DialogHeader>
              <div className="space-y-3">
                {previewing.questions.map((q: any, qi: number) => (
                  <div key={qi} className="border border-border rounded-lg p-3 bg-muted/20">
                    <div className="font-medium mb-2"><span className="text-primary mr-2">{qi + 1}.</span>{q.text}</div>
                    <div className="space-y-1 pl-6">
                      {q.options.map((o: any, oi: number) => (
                        <div key={oi} className={`text-sm flex items-center gap-2 ${o.correct ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                          <span className="text-xs">{o.correct ? "✓" : "○"}</span>
                          {o.label}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setPreviewing(null)}>Fechar</Button>
                {"segment" in previewing && !("aiGenerated" in (previewing as any)) && (
                  <Button onClick={() => { cloneFromLibrary(previewing as any); setPreviewing(null); }} className="bg-gradient-primary">
                    <Plus className="h-4 w-4 mr-1" />Adicionar aos meus quizzes
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}