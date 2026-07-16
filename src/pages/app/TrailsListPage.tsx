import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Trail {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  releaseMode: string;
  published: boolean;
  certificateEnabled: boolean;
}

export default function TrailsListPage() {
  const [list, setList] = useState<Trail[]>([]);
  const [creating, setCreating] = useState<Partial<Trail> | null>(null);
  const navigate = useNavigate();

  async function load() {
    try { setList(await api<Trail[]>("/trails")); } catch (e: any) { toast.error(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!creating?.title) { toast.error("Título obrigatório"); return; }
    try {
      const created = await api<Trail>("/trails", { method: "POST", body: creating });
      setCreating(null);
      navigate(`/app/trails/${created.id}`);
    } catch (e: any) { toast.error(e.message); }
  }

  async function remove(id: string) {
    if (!confirm("Remover curso?")) return;
    await api(`/trails/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" /> Academy
          </h1>
          <p className="text-muted-foreground">Crie e venda cursos ilimitados diretamente na sua plataforma — sem intermediários.</p>
        </div>
        <Button onClick={() => setCreating({ title: "", releaseMode: "immediate", published: true, certificateEnabled: true })}>
          <Plus className="h-4 w-4 mr-1" /> Novo curso
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {list.map(t => (
          <Card key={t.id} className="overflow-hidden cursor-pointer hover:border-primary transition-colors" onClick={() => navigate(`/app/trails/${t.id}`)}>
            <div className="h-32 bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
              {t.coverUrl ? <img src={t.coverUrl} alt={t.title} className="h-full w-full object-cover" /> : <GraduationCap className="h-12 w-12 text-white/60" />}
            </div>
            <div className="p-4">
              <div className="font-semibold truncate">{t.title}</div>
              <div className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem] mt-1">{t.description || "Sem descrição"}</div>
              <div className="flex items-center justify-between mt-3">
                <Badge variant={t.published ? "default" : "outline"}>{t.published ? "Publicada" : "Rascunho"}</Badge>
                <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); remove(t.id); }}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {list.length === 0 && <Card className="p-8 text-center text-muted-foreground col-span-full">Nenhum curso ainda. Crie o primeiro!</Card>}
      </div>

      <Dialog open={!!creating} onOpenChange={(o) => !o && setCreating(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo curso</DialogTitle></DialogHeader>
          {creating && (
            <div className="space-y-3">
              <div><Label>Título *</Label><Input value={creating.title || ""} onChange={(e) => setCreating({ ...creating, title: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea value={creating.description || ""} onChange={(e) => setCreating({ ...creating, description: e.target.value })} /></div>
              <div><Label>URL da capa</Label><Input value={creating.coverUrl || ""} onChange={(e) => setCreating({ ...creating, coverUrl: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(null)}>Cancelar</Button>
            <Button onClick={save}>Criar e editar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
