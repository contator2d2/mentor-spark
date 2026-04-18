// Aba: Notas Privadas — invisíveis ao mentorado
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Lock, Plus, Pin, PinOff, Trash2, Loader2, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { relativeDate } from "../types";

interface Note {
  id: string;
  content: string;
  category: string;
  tags?: string[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES: Array<{ value: string; label: string; cls: string }> = [
  { value: "perception", label: "Percepção",   cls: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  { value: "hypothesis", label: "Hipótese",    cls: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  { value: "behavior",   label: "Comportamento", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  { value: "risk",       label: "Risco",       cls: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  { value: "strategy",   label: "Estratégia",  cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  { value: "other",      label: "Outro",       cls: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
];

interface Props { recordId: string }

export function NotasPrivadasTab({ recordId }: Props) {
  const [items, setItems] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("perception");
  const [tags, setTags] = useState("");

  async function load() {
    setLoading(true);
    try {
      const list = await api<Note[]>(`/prontuario/${recordId}/private-notes`);
      setItems(list);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [recordId]);

  async function save() {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const tagsArr = tags.split(",").map(t => t.trim()).filter(Boolean);
      await api(`/prontuario/${recordId}/private-notes`, {
        method: "POST",
        body: { content, category, tags: tagsArr.length ? tagsArr : undefined },
      });
      toast.success("Nota privada criada");
      setContent(""); setTags(""); setCategory("perception"); setOpen(false);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function togglePin(n: Note) {
    try {
      await api(`/prontuario/${recordId}/private-notes/${n.id}`, {
        method: "PATCH", body: { pinned: !n.pinned },
      });
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta nota privada?")) return;
    try {
      await api(`/prontuario/${recordId}/private-notes/${id}`, { method: "DELETE" });
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-rose-500/5 border-rose-500/30 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">Estas notas são <b>privadas</b> e nunca serão exibidas ao mentorado.</p>
          <p className="text-muted-foreground text-xs mt-1">
            Use para hipóteses, percepções comportamentais, riscos e estratégias internas.
          </p>
        </div>
      </Card>

      <div className="flex justify-between items-center">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <Lock className="h-4 w-4" /> Notas privadas ({items.length})
        </h3>
        <Button onClick={() => setOpen(true)} className="bg-gradient-primary hover:opacity-90">
          <Plus className="h-4 w-4 mr-2" /> Nova nota
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">
          Nenhuma nota privada ainda. Comece registrando suas percepções estratégicas.
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map(n => {
            const cat = CATEGORIES.find(c => c.value === n.category) || CATEGORIES[5];
            return (
              <Card key={n.id} className={`p-4 ${n.pinned ? "border-primary/40 bg-primary/5" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge variant="outline" className={cat.cls}>{cat.label}</Badge>
                      {n.tags?.map(t => (
                        <Badge key={t} variant="outline" className="text-xs">#{t}</Badge>
                      ))}
                      <span className="text-xs text-muted-foreground ml-auto">{relativeDate(n.createdAt)}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{n.content}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="icon" variant="ghost" onClick={() => togglePin(n)} title={n.pinned ? "Desafixar" : "Fixar"}>
                      {n.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(n.id)} title="Excluir">
                      <Trash2 className="h-4 w-4 text-rose-400" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova nota privada</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Sua observação..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
            />
            <Input
              placeholder="Tags separadas por vírgula (opcional)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={save} disabled={saving || !content.trim()} className="bg-gradient-primary hover:opacity-90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
