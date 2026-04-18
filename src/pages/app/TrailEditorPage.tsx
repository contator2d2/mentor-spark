import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Plus, Trash2, GripVertical, Save, Video, FileText, Headphones } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ImageUploadField } from "@/components/ImageUploadField";

const LESSON_ICONS: any = { video: Video, article: FileText, audio: Headphones, pdf: FileText };

export default function TrailEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trail, setTrail] = useState<any>(null);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [editingModule, setEditingModule] = useState<any>(null);

  async function load() {
    try { setTrail(await api(`/trails/${id}`)); } catch (e: any) { toast.error(e.message); }
  }
  useEffect(() => { if (id) load(); }, [id]);

  async function saveTrail() {
    try {
      await api(`/trails/${id}`, { method: "PATCH", body: trail });
      toast.success("Salvo!");
    } catch (e: any) { toast.error(e.message); }
  }

  async function addModule() {
    const title = prompt("Nome do módulo:");
    if (!title) return;
    await api(`/trails/${id}/modules`, { method: "POST", body: { title, order: trail.modules?.length || 0 } });
    load();
  }
  async function removeModule(mid: string) {
    if (!confirm("Remover módulo?")) return;
    await api(`/trails/modules/${mid}`, { method: "DELETE" });
    load();
  }
  async function saveModule() {
    if (!editingModule) return;
    await api(`/trails/modules/${editingModule.id}`, { method: "PATCH", body: editingModule });
    setEditingModule(null); load();
  }

  async function addLesson(moduleId: string) {
    setEditingLesson({ moduleId, type: "video", title: "", order: 0 });
  }
  async function saveLesson() {
    if (!editingLesson) return;
    try {
      if (editingLesson.id) await api(`/trails/lessons/${editingLesson.id}`, { method: "PATCH", body: editingLesson });
      else await api(`/trails/modules/${editingLesson.moduleId}/lessons`, { method: "POST", body: editingLesson });
      setEditingLesson(null); load();
    } catch (e: any) { toast.error(e.message); }
  }
  async function removeLesson(lid: string) {
    if (!confirm("Remover aula?")) return;
    await api(`/trails/lessons/${lid}`, { method: "DELETE" });
    load();
  }

  if (!trail) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/app/trails")}><ChevronLeft className="h-4 w-4 mr-1" />Trilhas</Button>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-3">
          <Card className="p-4 space-y-3">
            <div><Label>Título</Label><Input value={trail.title} onChange={(e) => setTrail({ ...trail, title: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea value={trail.description || ""} onChange={(e) => setTrail({ ...trail, description: e.target.value })} /></div>
            <ImageUploadField
              label="Capa da trilha"
              hint="Esta imagem aparece para os mentorados no card e na página da trilha."
              aspect="16/9"
              value={trail.coverUrl || ""}
              onChange={(url) => setTrail({ ...trail, coverUrl: url })}
            />
            <div>
              <Label>Modo de liberação</Label>
              <Select value={trail.releaseMode} onValueChange={(v) => setTrail({ ...trail, releaseMode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Imediata (tudo liberado)</SelectItem>
                  <SelectItem value="sequential">Sequencial (após concluir o anterior)</SelectItem>
                  <SelectItem value="drip">Gotejada (a cada X dias)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {trail.releaseMode === "drip" && (
              <div><Label>Dias entre módulos</Label><Input type="number" value={trail.dripDays} onChange={(e) => setTrail({ ...trail, dripDays: +e.target.value })} /></div>
            )}
            <div className="flex items-center justify-between"><Label>Publicada</Label><Switch checked={trail.published} onCheckedChange={(v) => setTrail({ ...trail, published: v })} /></div>
            <div className="flex items-center justify-between"><Label>Emite certificado</Label><Switch checked={trail.certificateEnabled} onCheckedChange={(v) => setTrail({ ...trail, certificateEnabled: v })} /></div>
            <Button className="w-full" onClick={saveTrail}><Save className="h-4 w-4 mr-1" />Salvar</Button>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Módulos & Aulas</h2>
            <Button size="sm" onClick={addModule}><Plus className="h-4 w-4 mr-1" />Módulo</Button>
          </div>
          {trail.modules?.map((m: any) => (
            <Card key={m.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => setEditingModule(m)}>
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-semibold">{m.title}</div>
                    {m.description && <div className="text-xs text-muted-foreground">{m.description}</div>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => addLesson(m.id)}><Plus className="h-3 w-3 mr-1" />Aula</Button>
                  <Button size="icon" variant="ghost" onClick={() => removeModule(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
              <div className="space-y-1 ml-6 border-l pl-4">
                {m.lessons?.map((l: any) => {
                  const Icon = LESSON_ICONS[l.type] || FileText;
                  return (
                    <div key={l.id} className="flex items-center justify-between py-2 hover:bg-muted/30 rounded px-2 cursor-pointer" onClick={() => setEditingLesson(l)}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{l.title}</span>
                        {l.durationMinutes > 0 && <span className="text-xs text-muted-foreground">· {l.durationMinutes}min</span>}
                      </div>
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); removeLesson(l.id); }}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  );
                })}
                {(!m.lessons?.length) && <div className="text-xs text-muted-foreground py-2">Sem aulas. Clique em "Aula" para adicionar.</div>}
              </div>
            </Card>
          ))}
          {(!trail.modules?.length) && <Card className="p-8 text-center text-muted-foreground">Adicione o primeiro módulo.</Card>}
        </div>
      </div>

      {/* Lesson editor */}
      <Dialog open={!!editingLesson} onOpenChange={(o) => !o && setEditingLesson(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingLesson?.id ? "Editar aula" : "Nova aula"}</DialogTitle></DialogHeader>
          {editingLesson && (
            <div className="space-y-3">
              <div><Label>Título</Label><Input value={editingLesson.title} onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })} /></div>
              <div>
                <Label>Tipo</Label>
                <Select value={editingLesson.type} onValueChange={(v) => setEditingLesson({ ...editingLesson, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Vídeo (YouTube/Vimeo/MP4)</SelectItem>
                    <SelectItem value="article">Artigo (texto)</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="audio">Áudio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingLesson.type === "article" ? (
                <div><Label>Conteúdo</Label><Textarea rows={8} value={editingLesson.body || ""} onChange={(e) => setEditingLesson({ ...editingLesson, body: e.target.value })} /></div>
              ) : (
                <div><Label>URL do conteúdo</Label><Input value={editingLesson.contentUrl || ""} onChange={(e) => setEditingLesson({ ...editingLesson, contentUrl: e.target.value })} placeholder="https://..." /></div>
              )}
              <div><Label>Duração (min)</Label><Input type="number" value={editingLesson.durationMinutes || 0} onChange={(e) => setEditingLesson({ ...editingLesson, durationMinutes: +e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingLesson(null)}>Cancelar</Button>
            <Button onClick={saveLesson}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Module editor */}
      <Dialog open={!!editingModule} onOpenChange={(o) => !o && setEditingModule(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar módulo</DialogTitle></DialogHeader>
          {editingModule && (
            <div className="space-y-3">
              <div><Label>Título</Label><Input value={editingModule.title} onChange={(e) => setEditingModule({ ...editingModule, title: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea value={editingModule.description || ""} onChange={(e) => setEditingModule({ ...editingModule, description: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingModule(null)}>Cancelar</Button>
            <Button onClick={saveModule}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
