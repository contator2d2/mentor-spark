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
import { ChevronLeft, Plus, Trash2, GripVertical, Save, Video, FileText, Headphones, Lock, Users, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ImageUploadField } from "@/components/ImageUploadField";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const LESSON_ICONS: any = { video: Video, article: FileText, audio: Headphones, pdf: FileText };

export default function TrailEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trail, setTrail] = useState<any>(null);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [allTrails, setAllTrails] = useState<any[]>([]);
  const [grants, setGrants] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  async function load() {
    try { setTrail(await api(`/trails/${id}`)); } catch (e: any) { toast.error(e.message); }
  }
  async function loadAccess() {
    if (!id) return;
    try {
      const [g, t, gr, l, rq] = await Promise.all([
        api<any[]>("/access-groups"),
        api<any[]>("/trails"),
        api<any[]>(`/trail-access/trails/${id}/grants`),
        api<any[]>("/leads"),
        api<any[]>("/trail-access/requests?status=pending"),
      ]);
      setGroups(g); setAllTrails(t.filter((x) => x.id !== id));
      setGrants(gr); setLeads(l); setRequests(rq.filter((r) => r.trailId === id));
    } catch {}
  }
  useEffect(() => { if (id) { load(); loadAccess(); } }, [id]);

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

  const groupIds: string[] = trail.groupIds || [];
  const prereqIds: string[] = trail.prerequisiteTrailIds || [];

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/app/trails")}><ChevronLeft className="h-4 w-4 mr-1" />Academy</Button>

      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Conteúdo</TabsTrigger>
          <TabsTrigger value="access"><Lock className="h-3 w-3 mr-1" />Acesso & Paywall</TabsTrigger>
        </TabsList>

        <TabsContent value="content">
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-3">
          <Card className="p-4 space-y-3">
            <div><Label>Título</Label><Input value={trail.title} onChange={(e) => setTrail({ ...trail, title: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea value={trail.description || ""} onChange={(e) => setTrail({ ...trail, description: e.target.value })} /></div>
            <ImageUploadField
              label="Capa do curso"
              hint="Esta imagem aparece para os alunos no card e na página do curso."
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
        </TabsContent>

        <TabsContent value="access" className="space-y-4">
          <Card className="p-4 space-y-4">
            <div>
              <Label className="text-base font-bold flex items-center gap-2"><DollarSign className="h-4 w-4" />Modo de acesso</Label>
              <Select value={trail.accessMode || "open"} onValueChange={(v) => setTrail({ ...trail, accessMode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Aberto (segue regras de grupo/pré-req)</SelectItem>
                  <SelectItem value="request">Solicitar acesso (mentor aprova)</SelectItem>
                  <SelectItem value="paid">Pago (cobrança via Asaas)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {trail.accessMode === "paid" && (
              <div>
                <Label>Preço (R$)</Label>
                <Input type="number" step="0.01" value={(trail.priceCents || 0) / 100}
                  onChange={(e) => setTrail({ ...trail, priceCents: Math.round(parseFloat(e.target.value || "0") * 100) })} />
              </div>
            )}
            <div>
              <Label>Texto exibido no card bloqueado (CTA)</Label>
              <Textarea value={trail.upgradeCallout || ""} placeholder="Ex.: Faça upgrade para o plano Premium e acesse esse curso."
                onChange={(e) => setTrail({ ...trail, upgradeCallout: e.target.value })} />
            </div>
            <div>
              <Label>Disponível a partir de</Label>
              <Input type="datetime-local" value={trail.availableAt ? new Date(trail.availableAt).toISOString().slice(0, 16) : ""}
                onChange={(e) => setTrail({ ...trail, availableAt: e.target.value || null })} />
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <Label className="text-base font-bold flex items-center gap-2"><Users className="h-4 w-4" />Grupos com acesso</Label>
            <p className="text-xs text-muted-foreground">Vazio = todos os mentorados/prospects podem ver. Selecione grupos para restringir.</p>
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => {
                const on = groupIds.includes(g.id);
                return (
                  <Badge key={g.id} variant={on ? "default" : "outline"} className="cursor-pointer"
                    onClick={() => setTrail({ ...trail, groupIds: on ? groupIds.filter((x) => x !== g.id) : [...groupIds, g.id] })}>
                    {g.name} <span className="ml-1 opacity-70">({g.memberCount})</span>
                  </Badge>
                );
              })}
              {!groups.length && <span className="text-xs text-muted-foreground">Crie grupos em "Grupos de Acesso".</span>}
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <Label className="text-base font-bold">Pré-requisitos (concluir antes)</Label>
            <div className="flex flex-wrap gap-2">
              {allTrails.map((t) => {
                const on = prereqIds.includes(t.id);
                return (
                  <Badge key={t.id} variant={on ? "default" : "outline"} className="cursor-pointer"
                    onClick={() => setTrail({ ...trail, prerequisiteTrailIds: on ? prereqIds.filter((x) => x !== t.id) : [...prereqIds, t.id] })}>
                    {t.title}
                  </Badge>
                );
              })}
              {!allTrails.length && <span className="text-xs text-muted-foreground">Sem outros cursos.</span>}
            </div>
          </Card>

          <Button onClick={saveTrail} className="w-full"><Save className="h-4 w-4 mr-1" />Salvar configurações de acesso</Button>

          <Card className="p-4 space-y-3">
            <Label className="text-base font-bold">Acessos manuais individuais</Label>
            <Select value="" onValueChange={async (leadId) => {
              if (!leadId) return;
              await api(`/trail-access/trails/${id}/grants`, { method: "POST", body: { leadId } });
              toast.success("Acesso liberado"); loadAccess();
            }}>
              <SelectTrigger><SelectValue placeholder="Liberar para mentorado..." /></SelectTrigger>
              <SelectContent>
                {leads.filter((l) => !grants.some((g) => g.leadId === l.id)).map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name} — {l.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="space-y-1">
              {grants.map((g) => (
                <div key={g.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="text-sm">{g.lead?.name} <span className="text-muted-foreground">— {g.source}</span></div>
                  <Button size="sm" variant="ghost" onClick={async () => {
                    await api(`/trail-access/trails/${id}/grants/${g.leadId}`, { method: "DELETE" });
                    loadAccess();
                  }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
              {!grants.length && <div className="text-xs text-muted-foreground">Ninguém liberado manualmente ainda.</div>}
            </div>
          </Card>

          {requests.length > 0 && (
            <Card className="p-4 space-y-3">
              <Label className="text-base font-bold">Solicitações pendentes</Label>
              {requests.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="text-sm">
                    <div className="font-medium">{r.lead?.name}</div>
                    {r.message && <div className="text-xs text-muted-foreground">"{r.message}"</div>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={async () => { await api(`/trail-access/requests/${r.id}/deny`, { method: "POST" }); loadAccess(); }}>Negar</Button>
                    <Button size="sm" onClick={async () => { await api(`/trail-access/requests/${r.id}/approve`, { method: "POST" }); loadAccess(); }}>Aprovar</Button>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </TabsContent>
      </Tabs>

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
              <div className="border-t pt-3 space-y-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Regras de liberação</div>
                <div>
                  <Label>Drip — dias após inscrição</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editingModule.dripDaysAfterEnroll ?? 0}
                    onChange={(e) => setEditingModule({ ...editingModule, dripDaysAfterEnroll: +e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">0 = sem espera. Ex.: 7 = libera 7 dias após o aluno receber acesso ao curso.</p>
                </div>
                <div>
                  <Label>Disponível a partir de (data fixa)</Label>
                  <Input
                    type="datetime-local"
                    value={editingModule.availableAt ? new Date(editingModule.availableAt).toISOString().slice(0, 16) : ""}
                    onChange={(e) => setEditingModule({ ...editingModule, availableAt: e.target.value || null })}
                  />
                </div>
                <div>
                  <Label>Pré-requisitos (concluir módulos antes)</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(trail.modules || []).filter((m: any) => m.id !== editingModule.id).map((m: any) => {
                      const prereqs: string[] = editingModule.prerequisiteModuleIds || [];
                      const on = prereqs.includes(m.id);
                      return (
                        <Badge
                          key={m.id}
                          variant={on ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => setEditingModule({
                            ...editingModule,
                            prerequisiteModuleIds: on ? prereqs.filter((x) => x !== m.id) : [...prereqs, m.id],
                          })}
                        >
                          {m.title}
                        </Badge>
                      );
                    })}
                    {(trail.modules || []).filter((m: any) => m.id !== editingModule.id).length === 0 && (
                      <span className="text-xs text-muted-foreground">Não há outros módulos neste curso.</span>
                    )}
                  </div>
                </div>
              </div>
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
