import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, Copy, BookMarked, Sparkles, Files } from "lucide-react";
import { toast } from "sonner";

interface Prompt {
  id: string;
  title: string;
  body: string;
  category?: string;
  isSystem?: boolean;
  seedKey?: string;
  createdAt: string;
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<Prompt | null>(null);
  const [editing, setEditing] = useState<Prompt | null>(null);
  const [form, setForm] = useState({ title: "", body: "", category: "" });

  const load = () => api<Prompt[]>("/prompts").then(setPrompts).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm({ title: "", body: "", category: "" });
    setOpen(true);
  }

  function openEdit(p: Prompt) {
    setEditing(p);
    setForm({ title: p.title, body: p.body, category: p.category || "" });
    setOpen(true);
  }

  async function save() {
    if (!form.title || !form.body) return toast.error("Preencha título e corpo");
    if (editing) {
      await api(`/prompts/${editing.id}`, { method: "PUT", body: form });
    } else {
      await api("/prompts", { method: "POST", body: form });
    }
    setOpen(false);
    toast.success(editing ? "Prompt atualizado" : "Prompt criado");
    load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir este prompt?")) return;
    await api(`/prompts/${id}`, { method: "DELETE" });
    toast.success("Excluído");
    load();
  }

  async function duplicate(id: string) {
    await api(`/prompts/${id}/duplicate`, { method: "POST" });
    toast.success("Prompt duplicado — agora você pode editar a cópia");
    load();
  }

  if (loading) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;

  const categories = [...new Set(prompts.map((p) => p.category).filter(Boolean))] as string[];
  const systemCount = prompts.filter((p) => p.isSystem).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Biblioteca de Prompts</h1>
          <p className="text-muted-foreground mt-1">
            Prompts reutilizáveis para seu Assistente IA, prontuário, reuniões e mensagens.
          </p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Prompt</Button>
      </div>

      {systemCount > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3 items-start">
          <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-foreground">
              {systemCount} prompts profissionais já disponíveis
            </p>
            <p className="text-muted-foreground mt-1">
              Cobrem todos os segmentos de mentoria (Empresarial, RH, Financeiro, Jurídico, Comercial, Liderança, Processos, Marketing, Produtividade) + casos universais (resumo de reunião, classificação de leads). Use <strong>Duplicar</strong> para personalizar.
            </p>
          </div>
        </div>
      )}

      {prompts.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
          <BookMarked className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>Nenhum prompt criado ainda.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.length > 0 && categories.map((cat) => (
            <div key={cat}>
              <h2 className="font-display text-lg font-semibold mb-2 text-muted-foreground uppercase tracking-wide text-xs">{cat}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {prompts.filter((p) => p.category === cat).map((p) => (
                  <PromptCard
                    key={p.id}
                    prompt={p}
                    onView={() => setViewing(p)}
                    onEdit={() => openEdit(p)}
                    onDelete={() => remove(p.id)}
                    onDuplicate={() => duplicate(p.id)}
                  />
                ))}
              </div>
            </div>
          ))}
          {prompts.filter((p) => !p.category).length > 0 && (
            <div>
              {categories.length > 0 && <h2 className="font-display text-lg font-semibold mb-2 text-muted-foreground uppercase tracking-wide text-xs">Sem categoria</h2>}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {prompts.filter((p) => !p.category).map((p) => (
                  <PromptCard
                    key={p.id}
                    prompt={p}
                    onView={() => setViewing(p)}
                    onEdit={() => openEdit(p)}
                    onDelete={() => remove(p.id)}
                    onDuplicate={() => duplicate(p.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Editor */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar Prompt" : "Novo Prompt"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-2"><Label>Categoria (opcional)</Label><Input placeholder="Ex: Vendas, Análise, Coaching" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Corpo do prompt</Label>
              <Textarea rows={8} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Use {{contexto}} para inserir dados dinâmicos..." />
              <p className="text-xs text-muted-foreground">Dica: use <code className="px-1 bg-muted rounded">{"{{contexto}}"}</code> como placeholder para os dados que você vai colar (mentorado, reunião, lead).</p>
            </div>
          </div>
          <DialogFooter><Button onClick={save}>{editing ? "Salvar" : "Criar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visualização full */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewing?.title}
              {viewing?.isSystem && <Badge variant="secondary" className="text-[10px]"><Sparkles className="h-3 w-3 mr-1" />Sistema</Badge>}
            </DialogTitle>
          </DialogHeader>
          <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
            {viewing?.body}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(viewing?.body || ""); toast.success("Copiado!"); }}>
              <Copy className="h-4 w-4 mr-2" />Copiar
            </Button>
            {viewing && (
              <Button onClick={() => { duplicate(viewing.id); setViewing(null); }}>
                <Files className="h-4 w-4 mr-2" />Duplicar para editar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PromptCard({
  prompt,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  prompt: Prompt;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  return (
    <div
      className="bg-card border border-border rounded-lg p-4 space-y-2 shadow-soft group hover:border-primary/40 transition-colors cursor-pointer"
      onClick={onView}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-sm line-clamp-1">{prompt.title}</h3>
          {prompt.isSystem && (
            <Badge variant="secondary" className="text-[10px] mt-1 h-4 px-1.5">
              <Sparkles className="h-2.5 w-2.5 mr-1" />Sistema
            </Badge>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Copiar" onClick={() => { navigator.clipboard.writeText(prompt.body); toast.success("Copiado!"); }}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Duplicar" onClick={onDuplicate}>
            <Files className="h-3.5 w-3.5" />
          </Button>
          {!prompt.isSystem && (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Excluir" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
            </>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-3">{prompt.body}</p>
    </div>
  );
}
