// Aba: Materiais — links, documentos, vídeos compartilhados com o mentorado
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Folder, Plus, ExternalLink, Trash2, Loader2, FileText, Video, Link2, BookOpen, FileCode, EyeOff, Eye,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { relativeDate } from "../types";

interface Material {
  id: string;
  title: string;
  description?: string;
  type: "link" | "document" | "video" | "template" | "reference" | "other";
  url?: string;
  category?: string;
  sharedWithMentee: boolean;
  createdAt: string;
}

const TYPE_META: Record<string, { Icon: any; label: string; cls: string }> = {
  link:      { Icon: Link2,    label: "Link",       cls: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  document:  { Icon: FileText, label: "Documento",  cls: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  video:     { Icon: Video,    label: "Vídeo",      cls: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  template:  { Icon: FileCode, label: "Template",   cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  reference: { Icon: BookOpen, label: "Referência", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  other:     { Icon: Folder,   label: "Outro",      cls: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
};

interface Props { recordId: string }

export function MateriaisTab({ recordId }: Props) {
  const [items, setItems] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<Material["type"]>("link");
  const [category, setCategory] = useState("");
  const [shared, setShared] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setItems(await api<Material[]>(`/prontuario/${recordId}/materials`));
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [recordId]);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await api(`/prontuario/${recordId}/materials`, {
        method: "POST",
        body: { title, description, url: url || undefined, type, category: category || undefined, sharedWithMentee: shared },
      });
      toast.success("Material adicionado");
      setTitle(""); setDescription(""); setUrl(""); setType("link"); setCategory(""); setShared(true);
      setOpen(false);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function toggleShare(m: Material) {
    try {
      await api(`/prontuario/${recordId}/materials/${m.id}`, {
        method: "PATCH", body: { sharedWithMentee: !m.sharedWithMentee },
      });
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function remove(id: string) {
    if (!confirm("Excluir este material?")) return;
    try {
      await api(`/prontuario/${recordId}/materials/${id}`, { method: "DELETE" });
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <Folder className="h-4 w-4" /> Materiais ({items.length})
        </h3>
        <Button onClick={() => setOpen(true)} className="bg-gradient-primary hover:opacity-90">
          <Plus className="h-4 w-4 mr-2" /> Novo material
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">
          Nenhum material registrado. Adicione links, documentos ou referências para o mentorado.
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {items.map(m => {
            const meta = TYPE_META[m.type] || TYPE_META.other;
            const TIcon = meta.Icon;
            return (
              <Card key={m.id} className="p-4 flex flex-col">
                <div className="flex items-start gap-3 mb-2">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center border ${meta.cls}`}>
                    <TIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{m.title}</h4>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Badge variant="outline" className={meta.cls}>{meta.label}</Badge>
                      {m.category && <Badge variant="outline" className="text-xs">{m.category}</Badge>}
                      {m.sharedWithMentee ? (
                        <Badge variant="outline" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-xs">
                          <Eye className="h-3 w-3 mr-1" /> Compartilhado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <EyeOff className="h-3 w-3 mr-1" /> Interno
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {m.description && <p className="text-sm text-muted-foreground line-clamp-3">{m.description}</p>}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
                  {m.url && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={m.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-1" /> Abrir
                      </a>
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => toggleShare(m)}>
                    {m.sharedWithMentee ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                    {m.sharedWithMentee ? "Tornar interno" : "Compartilhar"}
                  </Button>
                  <Button size="sm" variant="ghost" className="ml-auto" onClick={() => remove(m.id)}>
                    <Trash2 className="h-3 w-3 text-rose-400" />
                  </Button>
                  <span className="text-xs text-muted-foreground">{relativeDate(m.createdAt)}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo material</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea placeholder="Descrição" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_META).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="URL (opcional)" value={url} onChange={(e) => setUrl(e.target.value)} />
            <Input placeholder="Categoria (opcional)" value={category} onChange={(e) => setCategory(e.target.value)} />
            <div className="flex items-center gap-2">
              <Switch id="shared" checked={shared} onCheckedChange={setShared} />
              <Label htmlFor="shared" className="text-sm">Compartilhar com o mentorado</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={save} disabled={saving || !title.trim()} className="bg-gradient-primary hover:opacity-90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
