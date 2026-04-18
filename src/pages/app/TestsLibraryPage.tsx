import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Building2, Users, DollarSign, Scale, TrendingUp, Crown, Cog, Megaphone, Zap,
  Library, Search, Eye, Copy, ArrowLeft, ClipboardList, Loader2, Target, ListChecks, FileText,
} from "lucide-react";

const ICONS: Record<string, any> = { Building2, Users, DollarSign, Scale, TrendingUp, Crown, Cog, Megaphone, Zap };

const KIND_LABEL: Record<string, string> = {
  quick: "Rápido",
  diagnostic: "Diagnóstico",
  comparative: "Comparativo",
};
const KIND_COLOR: Record<string, string> = {
  quick: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
  diagnostic: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30",
  comparative: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
};

interface Segment { key: string; label: string; icon: string; color: string }
interface LibTest {
  id: string; segment: string; kind: string;
  title: string; description: string; objective: string;
  categories: Array<{ key: string; label: string; weight: number }>;
  questions: Array<any>;
  baseInterpretation: Array<{ min: number; max: number; label: string; description: string }>;
  baseReport: string; baseRecommendation: string;
}

export default function TestsLibraryPage() {
  const nav = useNavigate();
  const [segments, setSegments] = useState<Segment[] | null>(null);
  const [items, setItems] = useState<LibTest[] | null>(null);
  const [segment, setSegment] = useState<string>("all");
  const [kind, setKind] = useState<string>("all");
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<LibTest | null>(null);
  const [cloning, setCloning] = useState<string | null>(null);

  useEffect(() => {
    api<Segment[]>("/library/segments").then(setSegments).catch(() => setSegments([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (segment !== "all") params.set("segment", segment);
    if (kind !== "all") params.set("kind", kind);
    if (q.trim()) params.set("q", q.trim());
    const qs = params.toString();
    setItems(null);
    api<LibTest[]>(`/library/tests${qs ? "?" + qs : ""}`).then(setItems).catch((e) => {
      toast.error(e.message);
      setItems([]);
    });
  }, [segment, kind, q]);

  const grouped = useMemo(() => {
    if (!items) return null;
    const map = new Map<string, LibTest[]>();
    for (const t of items) {
      if (!map.has(t.segment)) map.set(t.segment, []);
      map.get(t.segment)!.push(t);
    }
    return map;
  }, [items]);

  async function clone(t: LibTest) {
    setCloning(t.id);
    try {
      const created = await api<any>(`/library/tests/${t.id}/clone`, { method: "POST" });
      toast.success("Teste duplicado para os seus testes!");
      nav(`/app/tests/${created.id}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCloning(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => nav("/app/tests")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Library className="h-6 w-6 text-accent" />
          <div>
            <h1 className="font-display text-3xl font-bold">Biblioteca de Testes</h1>
            <p className="text-muted-foreground">Modelos prontos por segmento. Duplique e personalize sob sua metodologia.</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <Card className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, descrição ou objetivo..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">SEGMENTO</p>
          <div className="flex flex-wrap gap-2">
            <Chip active={segment === "all"} onClick={() => setSegment("all")}>Todos</Chip>
            {segments?.map((s) => {
              const Icon = ICONS[s.icon] || ClipboardList;
              return (
                <Chip key={s.key} active={segment === s.key} onClick={() => setSegment(s.key)}>
                  <Icon className="h-3 w-3 mr-1" /> {s.label}
                </Chip>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">TIPO</p>
          <div className="flex flex-wrap gap-2">
            <Chip active={kind === "all"} onClick={() => setKind("all")}>Todos</Chip>
            <Chip active={kind === "quick"} onClick={() => setKind("quick")}>Rápido (eventos)</Chip>
            <Chip active={kind === "diagnostic"} onClick={() => setKind("diagnostic")}>Diagnóstico</Chip>
            <Chip active={kind === "comparative"} onClick={() => setKind("comparative")}>Comparativo</Chip>
          </div>
        </div>
      </Card>

      {/* Grid */}
      {!items ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          Nenhum teste encontrado com esses filtros.
        </Card>
      ) : (
        <div className="space-y-8">
          {[...(grouped?.entries() || [])].map(([segKey, list]) => {
            const seg = segments?.find((s) => s.key === segKey);
            const Icon = ICONS[seg?.icon || ""] || ClipboardList;
            return (
              <div key={segKey}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="h-5 w-5 text-accent" />
                  <h2 className="font-display text-xl font-bold">{seg?.label || segKey}</h2>
                  <Badge variant="outline">{list.length}</Badge>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {list.map((t) => (
                    <Card key={t.id} className="p-5 space-y-3 flex flex-col hover:border-accent/40 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-display text-lg font-bold leading-tight">{t.title}</h3>
                        <Badge variant="outline" className={KIND_COLOR[t.kind]}>{KIND_LABEL[t.kind]}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{t.description}</p>
                      <div className="flex gap-3 text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1"><ListChecks className="h-3 w-3" /> {t.questions?.length || 0} perguntas</span>
                        <span className="flex items-center gap-1"><Target className="h-3 w-3" /> {t.categories?.length || 0} categorias</span>
                      </div>
                      <div className="flex gap-2 pt-3 mt-auto">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => setPreview(t)}>
                          <Eye className="h-3 w-3 mr-1" /> Ver
                        </Button>
                        <Button size="sm" className="flex-1" onClick={() => clone(t)} disabled={cloning === t.id}>
                          {cloning === t.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Copy className="h-3 w-3 mr-1" />}
                          Duplicar
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de preview */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {preview && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={KIND_COLOR[preview.kind]}>{KIND_LABEL[preview.kind]}</Badge>
                  <Badge variant="outline" className="capitalize">{preview.segment}</Badge>
                </div>
                <DialogTitle className="font-display text-2xl">{preview.title}</DialogTitle>
                <DialogDescription>{preview.description}</DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="overview" className="mt-4">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="overview"><Target className="h-3 w-3 mr-1" />Visão Geral</TabsTrigger>
                  <TabsTrigger value="questions"><ListChecks className="h-3 w-3 mr-1" />Perguntas</TabsTrigger>
                  <TabsTrigger value="report"><FileText className="h-3 w-3 mr-1" />Relatório Base</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 pt-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Objetivo</h4>
                    <p className="text-sm text-muted-foreground">{preview.objective}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Categorias avaliadas</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {preview.categories.map((c) => (
                        <Card key={c.key} className="p-3">
                          <p className="font-semibold text-sm">{c.label}</p>
                          <p className="text-xs text-muted-foreground">Peso {c.weight}</p>
                        </Card>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Faixas de interpretação</h4>
                    <div className="space-y-1">
                      {preview.baseInterpretation.map((r, i) => (
                        <div key={i} className="flex gap-3 text-sm border-l-2 border-accent/40 pl-3">
                          <span className="font-mono text-muted-foreground w-16 shrink-0">{r.min}–{r.max}%</span>
                          <span className="font-semibold w-24 shrink-0">{r.label}</span>
                          <span className="text-muted-foreground">{r.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="questions" className="space-y-3 pt-4">
                  {preview.questions.map((q, i) => (
                    <Card key={i} className="p-3 space-y-1">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded shrink-0">#{i + 1}</span>
                        <div className="flex-1">
                          <p className="text-sm">{q.text}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{q.type === "multiple_choice" ? "Múltipla" : q.type === "scale" ? "Escala" : "Aberta"}</Badge>
                            {q.categoryKey && (
                              <Badge variant="outline" className="text-xs">
                                {preview.categories.find((c) => c.key === q.categoryKey)?.label || q.categoryKey}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">peso {q.weight}</Badge>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="report" className="space-y-4 pt-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Relatório base</h4>
                    <Card className="p-4 text-sm whitespace-pre-wrap bg-muted/30">{preview.baseReport}</Card>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Recomendação inicial</h4>
                    <Card className="p-4 text-sm whitespace-pre-wrap bg-muted/30">{preview.baseRecommendation}</Card>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => clone(preview)} disabled={cloning === preview.id}>
                  {cloning === preview.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Copy className="h-4 w-4 mr-2" />}
                  Duplicar e personalizar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background hover:bg-muted border-border text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
