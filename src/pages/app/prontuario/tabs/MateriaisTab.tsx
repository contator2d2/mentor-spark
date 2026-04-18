// Aba: Materiais — links e arquivos enviados ao mentorado, com tracking de visualização/download
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
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  Folder, Plus, ExternalLink, Trash2, Loader2, FileText, Video, Link2, BookOpen,
  FileCode, EyeOff, Eye, Download, Image as ImageIcon, Music, CheckCircle2, Clock, Upload,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { relativeDate } from "../types";
import { MediaUpload, type UploadedMedia } from "@/components/MediaUpload";

interface Material {
  id: string;
  title: string;
  description?: string;
  type: "link" | "document" | "video" | "image" | "audio" | "template" | "reference" | "other";
  url?: string;
  category?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  sharedWithMentee: boolean;
  firstViewedAt?: string;
  lastViewedAt?: string;
  viewCount: number;
  firstDownloadedAt?: string;
  lastDownloadedAt?: string;
  downloadCount: number;
  createdAt: string;
}

const TYPE_META: Record<string, { Icon: any; label: string; cls: string }> = {
  link:      { Icon: Link2,      label: "Link",       cls: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  document:  { Icon: FileText,   label: "Documento",  cls: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  video:     { Icon: Video,      label: "Vídeo",      cls: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  image:     { Icon: ImageIcon,  label: "Imagem",     cls: "bg-pink-500/15 text-pink-300 border-pink-500/30" },
  audio:     { Icon: Music,      label: "Áudio",      cls: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" },
  template:  { Icon: FileCode,   label: "Template",   cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  reference: { Icon: BookOpen,   label: "Referência", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  other:     { Icon: Folder,     label: "Outro",      cls: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
};

function mimeToType(mime: string): Material["type"] {
  if (!mime) return "document";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}

function formatBytes(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props { recordId: string }

export function MateriaisTab({ recordId }: Props) {
  const [items, setItems] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"upload" | "link">("upload");

  // form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<Material["type"]>("link");
  const [category, setCategory] = useState("");
  const [shared, setShared] = useState(true);
  const [media, setMedia] = useState<UploadedMedia | null>(null);

  function resetForm() {
    setTitle(""); setDescription(""); setUrl(""); setType("link");
    setCategory(""); setShared(true); setMedia(null); setTab("upload");
  }

  async function load() {
    setLoading(true);
    try {
      setItems(await api<Material[]>(`/prontuario/${recordId}/materials`));
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [recordId]);

  function onMediaChange(m: UploadedMedia | null) {
    setMedia(m);
    if (m) {
      setUrl(m.url);
      setType(mimeToType(m.mimetype));
      if (!title) setTitle(m.originalName.replace(/\.[^.]+$/, ""));
    }
  }

  async function save() {
    if (!title.trim()) { toast.error("Informe um título"); return; }
    if (tab === "upload" && !media) { toast.error("Envie um arquivo"); return; }
    if (tab === "link" && !url.trim()) { toast.error("Informe a URL"); return; }
    setSaving(true);
    try {
      const body: any = {
        title, description, url: url || undefined, type,
        category: category || undefined, sharedWithMentee: shared,
      };
      if (media) {
        body.fileName = media.originalName;
        body.mimeType = media.mimetype;
        body.fileSize = media.size;
      }
      await api(`/prontuario/${recordId}/materials`, { method: "POST", body });
      toast.success("Material adicionado");
      resetForm();
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

  /** Quando o mentor clica em "Abrir" / "Baixar", já contamos como uma visualização
   *  manual (útil enquanto a área do mentorado não dispara automaticamente). */
  async function track(id: string, action: "view" | "download", actor: "mentor" | "mentorado" = "mentor") {
    try {
      await api(`/prontuario/${recordId}/materials/${id}/track`, {
        method: "POST", body: { action, actor },
      });
      load();
    } catch { /* silencioso */ }
  }

  async function markAsViewed(id: string) {
    await track(id, "view", "mentorado");
    toast.success("Marcado como visto pelo mentorado");
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
          Nenhum material registrado. Envie arquivos, links ou referências para o mentorado.
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {items.map(m => {
            const meta = TYPE_META[m.type] || TYPE_META.other;
            const TIcon = meta.Icon;
            const seen = !!m.firstViewedAt;
            const downloaded = !!m.firstDownloadedAt;
            return (
              <Card key={m.id} className="p-4 flex flex-col">
                <div className="flex items-start gap-3 mb-2">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center border ${meta.cls}`}>
                    <TIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{m.title}</h4>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <Badge variant="outline" className={meta.cls}>{meta.label}</Badge>
                      {m.category && <Badge variant="outline" className="text-xs">{m.category}</Badge>}
                      {m.fileSize ? (
                        <Badge variant="outline" className="text-xs">{formatBytes(m.fileSize)}</Badge>
                      ) : null}
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

                {/* Tracking */}
                {m.sharedWithMentee && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {seen ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Visto {m.viewCount}× • {relativeDate(m.lastViewedAt!)}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/30">
                        <Clock className="h-3 w-3 mr-1" /> Ainda não visto
                      </Badge>
                    )}
                    {downloaded && (
                      <Badge variant="outline" className="bg-sky-500/10 text-sky-300 border-sky-500/30">
                        <Download className="h-3 w-3 mr-1" />
                        Baixado {m.downloadCount}× • {relativeDate(m.lastDownloadedAt!)}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40 flex-wrap">
                  {m.url && (
                    <>
                      <Button size="sm" variant="outline" asChild onClick={() => track(m.id, "view", "mentor")}>
                        <a href={m.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" /> Abrir
                        </a>
                      </Button>
                      {m.fileName && (
                        <Button size="sm" variant="outline" asChild onClick={() => track(m.id, "download", "mentor")}>
                          <a href={m.url} download={m.fileName}>
                            <Download className="h-3 w-3 mr-1" /> Baixar
                          </a>
                        </Button>
                      )}
                    </>
                  )}
                  {m.sharedWithMentee && !seen && (
                    <Button size="sm" variant="ghost" onClick={() => markAsViewed(m.id)} title="Marcar manualmente como visto pelo mentorado">
                      <Eye className="h-3 w-3 mr-1" /> Marcar como visto
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

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Novo material</DialogTitle></DialogHeader>

          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="upload"><Upload className="h-4 w-4 mr-2" /> Enviar arquivo</TabsTrigger>
              <TabsTrigger value="link"><Link2 className="h-4 w-4 mr-2" /> Adicionar link</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-3 mt-4">
              <MediaUpload
                value={media?.url}
                onChange={onMediaChange}
                hint="Arraste o arquivo aqui ou clique. PDF, Word, Excel, imagens, vídeos, áudios — até 200MB."
              />
            </TabsContent>

            <TabsContent value="link" className="space-y-3 mt-4">
              <Input placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_META).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TabsContent>
          </Tabs>

          <div className="space-y-3 mt-2">
            <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea placeholder="Descrição (opcional)" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            <Input placeholder="Categoria (opcional)" value={category} onChange={(e) => setCategory(e.target.value)} />
            <div className="flex items-center gap-2 p-3 rounded-lg border border-border/50 bg-card/50">
              <Switch id="shared" checked={shared} onCheckedChange={setShared} />
              <Label htmlFor="shared" className="text-sm flex-1 cursor-pointer">
                Compartilhar com o mentorado
                <span className="block text-xs text-muted-foreground">
                  Aparece na área dele e podemos rastrear quando visualizar/baixar.
                </span>
              </Label>
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
