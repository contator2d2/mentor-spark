import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Pencil, Trash2, FileText, Video, Image as ImageIcon, FileDown, Music, Clock } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { MediaUpload, UploadKind } from "@/components/MediaUpload";

interface Content {
  id: string;
  title: string;
  body?: string;
  url?: string;
  type: string;
  audience: any;
  published: boolean;
  scheduledAt?: string;
  createdAt: string;
}

const TYPE_ICONS: Record<string, any> = { article: FileText, video: Video, pdf: FileDown, image: ImageIcon, audio: Music };
const TYPE_TO_UPLOAD: Record<string, UploadKind | null> = {
  article: null,
  video: "video",
  pdf: "document",
  image: "image",
  audio: "audio",
};

export default function ContentsPage() {
  const [items, setItems] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Content | null>(null);
  const [form, setForm] = useState({ title: "", body: "", url: "", type: "article", audience: "all", published: true, scheduledAt: "" });

  const load = () => api<Content[]>("/contents").then(setItems).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm({ title: "", body: "", url: "", type: "article", audience: "all", published: true, scheduledAt: "" });
    setOpen(true);
  }

  function openEdit(c: Content) {
    setEditing(c);
    setForm({
      title: c.title,
      body: c.body || "",
      url: c.url || "",
      type: c.type,
      audience: typeof c.audience === "string" ? c.audience : "all",
      published: c.published,
      scheduledAt: c.scheduledAt ? c.scheduledAt.slice(0, 16) : "",
    });
    setOpen(true);
  }

  async function save() {
    if (!form.title) return toast.error("Preencha o título");
    const body = { ...form, scheduledAt: form.scheduledAt || null };
    if (editing) {
      await api(`/contents/${editing.id}`, { method: "PATCH", body });
    } else {
      await api("/contents", { method: "POST", body });
    }
    setOpen(false);
    toast.success(editing ? "Atualizado" : "Criado");
    load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir?")) return;
    await api(`/contents/${id}`, { method: "DELETE" });
    toast.success("Excluído");
    load();
  }

  if (loading) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Conteúdos</h1>
          <p className="text-muted-foreground mt-1">Biblioteca de conteúdos para nutrição de leads e mentorados.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Conteúdo</Button>
      </div>

      {items.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>Nenhum conteúdo criado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((c) => {
            const Icon = TYPE_ICONS[c.type] || FileText;
            const scheduled = c.scheduledAt && new Date(c.scheduledAt) > new Date();
            return (
              <div key={c.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between group hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{c.title}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant={c.published ? "default" : "secondary"} className="text-[10px]">
                        {c.published ? "Publicado" : "Rascunho"}
                      </Badge>
                      {scheduled && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Agendado {new Date(c.scheduledAt!).toLocaleString("pt-BR")}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground uppercase">{c.type}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar Conteúdo" : "Novo Conteúdo"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, url: "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="article">Artigo (texto)</SelectItem>
                    <SelectItem value="video">Vídeo</SelectItem>
                    <SelectItem value="audio">Áudio</SelectItem>
                    <SelectItem value="image">Imagem</SelectItem>
                    <SelectItem value="pdf">Documento (PDF / DOCX)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Audiência</Label>
                <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="prospects">Prospects</SelectItem>
                    <SelectItem value="clients">Mentorados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {TYPE_TO_UPLOAD[form.type] && (
              <div className="space-y-2">
                <Label>Arquivo</Label>
                <MediaUpload
                  accept={[TYPE_TO_UPLOAD[form.type] as UploadKind]}
                  value={form.url}
                  onChange={(m) => setForm({ ...form, url: m?.url || "" })}
                  hint={`Envie um arquivo do tipo ${form.type} do seu computador`}
                />
              </div>
            )}
            <div className="space-y-2"><Label>Corpo / Descrição</Label><Textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Agendar envio (opcional)</Label>
              <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
              <Label>Publicado</Label>
            </div>
          </div>
          <DialogFooter><Button onClick={save}>{editing ? "Salvar" : "Criar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
