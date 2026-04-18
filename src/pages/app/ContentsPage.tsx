import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Pencil, Trash2, FileText, Video, Image as ImageIcon, FileDown, Music, Clock, Youtube, Calendar as CalIcon, Eye } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { MediaUpload, UploadKind } from "@/components/MediaUpload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Content {
  id: string;
  title: string;
  body?: string;
  url?: string;
  coverImage?: string;
  videoUrl?: string;
  type: string;
  audience: any;
  published: boolean;
  scheduledAt?: string;
  createdAt: string;
}

const TYPE_ICONS: Record<string, any> = { post: ImageIcon, article: FileText, video: Video, pdf: FileDown, image: ImageIcon, audio: Music };
const TYPE_LABEL: Record<string, string> = {
  post: "Post (capa + texto)",
  article: "Artigo (texto longo)",
  video: "Vídeo (upload)",
  audio: "Áudio",
  image: "Imagem",
  pdf: "Documento PDF/DOCX",
};
const TYPE_TO_UPLOAD: Record<string, UploadKind | null> = {
  post: null,
  article: null,
  video: "video",
  pdf: "document",
  image: "image",
  audio: "audio",
};

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

export default function ContentsPage() {
  const [items, setItems] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Content | null>(null);
  const [form, setForm] = useState({
    title: "",
    body: "",
    url: "",
    coverImage: "",
    videoUrl: "",
    type: "post",
    audience: "all",
    published: true,
    scheduledAt: "",
  });

  const load = () => api<Content[]>("/contents").then(setItems).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm({ title: "", body: "", url: "", coverImage: "", videoUrl: "", type: "post", audience: "all", published: true, scheduledAt: "" });
    setOpen(true);
  }

  function openEdit(c: Content) {
    setEditing(c);
    setForm({
      title: c.title,
      body: c.body || "",
      url: c.url || "",
      coverImage: c.coverImage || "",
      videoUrl: c.videoUrl || "",
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
    try {
      if (editing) await api(`/contents/${editing.id}`, { method: "PATCH", body });
      else await api("/contents", { method: "POST", body });
      setOpen(false);
      toast.success(editing ? "Atualizado" : "Criado");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function remove(id: string) {
    if (!confirm("Excluir?")) return;
    await api(`/contents/${id}`, { method: "DELETE" });
    toast.success("Excluído");
    load();
  }

  const ytId = useMemo(() => extractYouTubeId(form.videoUrl), [form.videoUrl]);

  if (loading) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Conteúdos</h1>
          <p className="text-muted-foreground mt-1">Posts, artigos, vídeos e materiais para nutrir leads e mentorados.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Conteúdo</Button>
      </div>

      {items.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>Nenhum conteúdo criado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((c) => {
            const Icon = TYPE_ICONS[c.type] || FileText;
            const scheduled = c.scheduledAt && new Date(c.scheduledAt) > new Date();
            const ytPreview = extractYouTubeId(c.videoUrl || "");
            const cover = c.coverImage || (ytPreview ? `https://img.youtube.com/vi/${ytPreview}/hqdefault.jpg` : null);
            return (
              <div key={c.id} className="bg-card border border-border rounded-xl overflow-hidden group hover:shadow-lg hover:border-primary/40 transition-all">
                {cover ? (
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    <img src={cover} alt={c.title} className="w-full h-full object-cover" loading="lazy" />
                    {(c.type === "video" || ytPreview) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/30">
                        <Video className="h-10 w-10 text-white drop-shadow-lg" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-video bg-muted/40 flex items-center justify-center">
                    <Icon className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                )}
                <div className="p-3 space-y-2">
                  <div className="font-medium text-sm line-clamp-2">{c.title}</div>
                  {c.body && <div className="text-xs text-muted-foreground line-clamp-2">{c.body}</div>}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant={c.published ? "default" : "secondary"} className="text-[10px]">
                      {c.published ? "Publicado" : "Rascunho"}
                    </Badge>
                    {scheduled && (
                      <span className="flex items-center gap-1 text-[10px] text-amber-500">
                        <Clock className="h-3 w-3" />
                        {new Date(c.scheduledAt!).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground uppercase ml-auto">{c.type}</span>
                  </div>
                  <div className="flex gap-1 pt-1 border-t border-border">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs flex-1" onClick={() => openEdit(c)}>
                      <Pencil className="h-3 w-3 mr-1" />Editar
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(c.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle>{editing ? "Editar Conteúdo" : "Novo Conteúdo"}</DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto px-6 py-2 flex-1 space-y-4">
            <div className="space-y-2">
              <Label>Tipo de conteúdo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, url: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: 5 hábitos para começar a semana com foco" />
            </div>

            {form.type === "post" && (
              <Tabs defaultValue="cover" className="w-full">
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="cover"><ImageIcon className="h-3.5 w-3.5 mr-1.5" />Imagem de capa</TabsTrigger>
                  <TabsTrigger value="youtube"><Youtube className="h-3.5 w-3.5 mr-1.5" />Vídeo do YouTube</TabsTrigger>
                </TabsList>
                <TabsContent value="cover" className="space-y-2 pt-3">
                  <Label className="text-xs text-muted-foreground">Envie uma imagem do seu computador</Label>
                  <MediaUpload
                    accept={["image"]}
                    value={form.coverImage}
                    onChange={(m) => setForm({ ...form, coverImage: m?.url || "" })}
                    hint="JPG, PNG ou WEBP — recomendado 1200x630"
                  />
                </TabsContent>
                <TabsContent value="youtube" className="space-y-2 pt-3">
                  <Label className="text-xs text-muted-foreground">Cole o link do YouTube</Label>
                  <Input
                    value={form.videoUrl}
                    onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                  {ytId && (
                    <div className="aspect-video w-full rounded-lg overflow-hidden border border-border mt-2">
                      <iframe
                        src={`https://www.youtube.com/embed/${ytId}`}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; encrypted-media; gyroscope"
                        allowFullScreen
                      />
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}

            {TYPE_TO_UPLOAD[form.type] && (
              <div className="space-y-2">
                <Label>Arquivo</Label>
                <MediaUpload
                  accept={[TYPE_TO_UPLOAD[form.type] as UploadKind]}
                  value={form.url}
                  onChange={(m) => setForm({ ...form, url: m?.url || "" })}
                  hint={`Envie um arquivo do tipo ${form.type}`}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                rows={6}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Escreva a descrição do post. Use quebras de linha para parágrafos. Emojis são bem-vindos ✨"
                className="resize-y"
              />
              <p className="text-[11px] text-muted-foreground">{form.body.length} caracteres</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><CalIcon className="h-3.5 w-3.5" />Agendar publicação</Label>
                <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
              <div>
                <Label className="font-medium">Publicado</Label>
                <p className="text-xs text-muted-foreground">{form.scheduledAt ? "Será publicado automaticamente na data agendada" : "Disponível imediatamente após salvar"}</p>
              </div>
              <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
            </div>
          </div>

          <DialogFooter className="px-6 pb-6 pt-3 shrink-0 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>{editing ? "Salvar alterações" : "Criar conteúdo"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
