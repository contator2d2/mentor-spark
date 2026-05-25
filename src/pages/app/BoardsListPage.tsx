import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, KanbanSquare, Settings, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Board { id: string; name: string; type: string; isDefault: boolean; color?: string; description?: string; }

function SortableBoardCard({
  b,
  onOpen,
  onSettings,
  onRemove,
}: {
  b: Board;
  onOpen: () => void;
  onSettings: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: b.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto" as const,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="p-5 hover:border-primary/40 transition-colors cursor-pointer relative group"
      onClick={onOpen}
    >
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        aria-label="Reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="h-2 w-12 rounded-full mb-3 ml-6" style={{ backgroundColor: b.color || "#6366f1" }} />
      <div className="flex items-center gap-2 mb-1 ml-6">
        <h3 className="font-semibold">{b.name}</h3>
        {b.isDefault && <Badge variant="outline" className="text-xs">Padrão</Badge>}
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2 ml-6">{b.description || `Tipo: ${b.type}`}</p>
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onSettings(); }}>
          <Settings className="h-3 w-3" />
        </Button>
        {!b.isDefault && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
            <Trash2 className="h-3 w-3 text-rose-400" />
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function BoardsListPage() {
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "custom" as const, useTemplate: "" as "" | "leads" | "tasks", color: "#6366f1", description: "" });
  const [saving, setSaving] = useState(false);
  const nav = useNavigate();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function load() { try { setBoards(await api<Board[]>("/kanban/boards")); } catch (e: any) { toast.error(e.message); } }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.name) return toast.error("Nome obrigatório");
    setSaving(true);
    try {
      const b = await api<Board>("/kanban/boards", { method: "POST", body: { ...form, useTemplate: form.useTemplate || null } });
      toast.success("Board criado!"); setOpen(false);
      setForm({ name: "", type: "custom" as const, useTemplate: "", color: "#6366f1", description: "" });
      load();
      nav(`/app/boards/${b.id}`);
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm("Excluir board e todos os cards?")) return;
    try { await api(`/kanban/boards/${id}`, { method: "DELETE" }); load(); } catch (e: any) { toast.error(e.message); }
  }

  async function handleDragEnd(e: DragEndEvent) {
    if (!boards || !e.over || e.active.id === e.over.id) return;
    const oldIdx = boards.findIndex((b) => b.id === e.active.id);
    const newIdx = boards.findIndex((b) => b.id === e.over!.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(boards, oldIdx, newIdx);
    setBoards(next); // otimista
    try {
      await api("/kanban/boards/reorder", { method: "POST", body: { ids: next.map((b) => b.id) } });
    } catch (err: any) {
      toast.error(err.message);
      load();
    }
  }

  if (!boards) return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display flex items-center gap-2"><KanbanSquare className="h-7 w-7 text-primary" />Meus Kanbans</h1>
          <p className="text-muted-foreground mt-1">Crie quantos boards quiser. Arraste pelo canto esquerdo para reordenar.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-primary"><Plus className="h-4 w-4 mr-2" />Novo board</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Kanban</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs">Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Pós-venda, Onboarding..." /></div>
              <div><Label className="text-xs">Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div>
                <Label className="text-xs">Modelo inicial</Label>
                <Select value={form.useTemplate} onValueChange={(v: any) => setForm({ ...form, useTemplate: v })}>
                  <SelectTrigger><SelectValue placeholder="Em branco" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Em branco (1 coluna)</SelectItem>
                    <SelectItem value="leads">Funil de vendas (6 etapas)</SelectItem>
                    <SelectItem value="tasks">Tarefas (A fazer / Fazendo / Feito)</SelectItem>
                    <SelectItem value="demands">Demandas (Fluxo completo de produção)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.useTemplate === "demands" && (
                <div className="bg-muted/50 p-2 rounded text-[10px] text-muted-foreground border">
                  Este modelo cria um board configurado especificamente para a Central de Demandas.
                </div>
              )}
              <div><Label className="text-xs">Cor</Label><Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 w-20" /></div>
            </div>
            <DialogFooter><Button onClick={create} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Criar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={boards.map((b) => b.id)} strategy={rectSortingStrategy}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((b) => (
              <SortableBoardCard
                key={b.id}
                b={b}
                onOpen={() => nav(`/app/boards/${b.id}`)}
                onSettings={() => nav(`/app/boards/${b.id}/settings`)}
                onRemove={() => remove(b.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
