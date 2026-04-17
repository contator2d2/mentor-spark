import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Pencil, Trash2, Copy, BookMarked } from "lucide-react";
import { toast } from "sonner";

interface Prompt {
  id: string;
  title: string;
  body: string;
  category?: string;
  createdAt: string;
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
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

  if (loading) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;

  const categories = [...new Set(prompts.map((p) => p.category).filter(Boolean))] as string[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Biblioteca de Prompts</h1>
          <p className="text-muted-foreground mt-1">Prompts reutilizáveis para seu assistente IA.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Prompt</Button>
      </div>

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
                  <PromptCard key={p.id} prompt={p} onEdit={() => openEdit(p)} onDelete={() => remove(p.id)} />
                ))}
              </div>
            </div>
          ))}
          {/* Sem categoria */}
          {prompts.filter((p) => !p.category).length > 0 && (
            <div>
              {categories.length > 0 && <h2 className="font-display text-lg font-semibold mb-2 text-muted-foreground uppercase tracking-wide text-xs">Sem categoria</h2>}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {prompts.filter((p) => !p.category).map((p) => (
                  <PromptCard key={p.id} prompt={p} onEdit={() => openEdit(p)} onDelete={() => remove(p.id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar Prompt" : "Novo Prompt"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-2"><Label>Categoria (opcional)</Label><Input placeholder="Ex: Vendas, Análise, Coaching" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div className="space-y-2"><Label>Corpo do prompt</Label><Textarea rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Analise o perfil deste lead e sugira..." /></div>
          </div>
          <DialogFooter><Button onClick={save}>{editing ? "Salvar" : "Criar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PromptCard({ prompt, onEdit, onDelete }: { prompt: Prompt; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-2 shadow-soft group">
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-sm">{prompt.title}</h3>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { navigator.clipboard.writeText(prompt.body); toast.success("Copiado!"); }}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-3">{prompt.body}</p>
    </div>
  );
}
