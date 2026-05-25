import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, Save, Trash2, Plus, Settings as SettingsIcon, GripVertical, BellOff, Bell } from "lucide-react";
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
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Column { id: string; name: string; color: string; order: number; slug?: string }
interface Board {
  id: string;
  name: string;
  description?: string;
  color?: string;
  notificationsDisabled: boolean;
  type?: string;
  isDefault?: boolean;
  columns: Column[];
}

const PRESET_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6", "#64748b"];

function SortableColumnRow({
  col,
  onRename,
  onColor,
  onRemove,
}: {
  col: Column;
  onRename: (v: string) => void;
  onColor: (v: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 bg-card border rounded-md p-2">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground" aria-label="Reordenar">
        <GripVertical className="h-4 w-4" />
      </button>
      <Input
        type="color"
        value={col.color}
        onChange={(e) => onColor(e.target.value)}
        className="h-9 w-12 p-1 shrink-0"
      />
      <Input
        value={col.name}
        onChange={(e) => onRename(e.target.value)}
        className="flex-1"
      />
      <Button size="icon" variant="ghost" onClick={onRemove}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

export default function BoardSettingsPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [board, setBoard] = useState<Board | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [notificationsDisabled, setNotificationsDisabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCol, setNewCol] = useState({ name: "", color: "#6366f1" });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function load() {
    try {
      const b = await api<Board>(`/kanban/boards/${id}`);
      b.columns = (b.columns || []).slice().sort((a, c) => a.order - c.order);
      setBoard(b);
      setName(b.name || "");
      setDescription(b.description || "");
      setColor(b.color || "#6366f1");
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  useEffect(() => { load(); }, [id]);

  async function save() {
    setSaving(true);
    try {
      await api(`/kanban/boards/${id}`, { method: "PATCH", body: { name, description, color } });
      toast.success("Configurações salvas");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeBoard() {
    if (!confirm("Excluir este board? Esta ação não pode ser desfeita.")) return;
    try {
      await api(`/kanban/boards/${id}`, { method: "DELETE" });
      toast.success("Board excluído");
      nav("/app/boards");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function addColumn() {
    if (!newCol.name) return;
    try {
      await api(`/kanban/boards/${id}/columns`, { method: "POST", body: newCol });
      setNewCol({ name: "", color: "#6366f1" });
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function persistColumn(colId: string, patch: Partial<Column>) {
    try {
      await api(`/kanban/columns/${colId}`, { method: "PATCH", body: patch });
    } catch (e: any) {
      toast.error(e.message);
      load();
    }
  }

  async function removeColumn(colId: string) {
    if (!confirm("Excluir esta coluna? Os cards associados precisam ser movidos antes.")) return;
    try {
      await api(`/kanban/columns/${colId}`, { method: "DELETE" });
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleColumnsDragEnd(e: DragEndEvent) {
    if (!board || !e.over || e.active.id === e.over.id) return;
    const oldIdx = board.columns.findIndex((c) => c.id === e.active.id);
    const newIdx = board.columns.findIndex((c) => c.id === e.over!.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(board.columns, oldIdx, newIdx).map((c, i) => ({ ...c, order: i }));
    setBoard({ ...board, columns: next });
    try {
      await api(`/kanban/boards/${id}/columns/reorder`, { method: "POST", body: { ids: next.map((c) => c.id) } });
    } catch (err: any) {
      toast.error(err.message);
      load();
    }
  }

  if (!board) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => nav(`/app/boards/${id}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />Voltar ao board
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Save className="h-4 w-4 mr-2" />Salvar
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <SettingsIcon className="h-6 w-6 text-accent" />
        <div>
          <h1 className="font-display text-3xl font-bold">Configurações do Board</h1>
          <p className="text-muted-foreground">Ajuste o nome, cor e colunas deste board.</p>
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <div>
          <Label>Nome *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Descrição</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <div>
          <Label>Cor</Label>
          <div className="flex gap-2 flex-wrap mt-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-full border-2 transition-transform ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
            <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-16 p-1" />
          </div>
        </div>
        {board.type && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">{board.type}</Badge>
            {board.isDefault && <Badge>Padrão</Badge>}
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="font-display text-xl font-bold">Colunas ({board.columns?.length || 0})</h2>
          <p className="text-sm text-muted-foreground">Arraste pelo punho para reordenar. Renomeie clicando no campo.</p>
        </div>

        {board.columns?.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleColumnsDragEnd}>
            <SortableContext items={board.columns.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {board.columns.map((col) => (
                  <SortableColumnRow
                    key={col.id}
                    col={col}
                    onRename={(v) => setBoard({ ...board, columns: board.columns.map((c) => c.id === col.id ? { ...c, name: v } : c) })}
                    onColor={(v) => {
                      setBoard({ ...board, columns: board.columns.map((c) => c.id === col.id ? { ...c, color: v } : c) });
                      persistColumn(col.id, { color: v });
                    }}
                    onRemove={() => removeColumn(col.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* persist nome no blur de cada input */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground -mt-2">
          <span>Dica: clique fora do nome para salvar.</span>
          <button
            className="underline"
            onClick={() => board.columns.forEach((c) => persistColumn(c.id, { name: c.name }))}
          >
            Salvar nomes agora
          </button>
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Input
            type="color"
            value={newCol.color}
            onChange={(e) => setNewCol({ ...newCol, color: e.target.value })}
            className="h-9 w-12 p-1 shrink-0"
          />
          <Input
            placeholder="Nome da nova coluna"
            value={newCol.name}
            onChange={(e) => setNewCol({ ...newCol, name: e.target.value })}
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && addColumn()}
          />
          <Button onClick={addColumn} disabled={!newCol.name}>
            <Plus className="h-4 w-4 mr-1" />Adicionar
          </Button>
        </div>
      </Card>

      {!board.isDefault && (
        <Card className="p-6 space-y-3 border-destructive/40">
          <div>
            <h2 className="font-display text-lg font-bold text-destructive">Zona de perigo</h2>
            <p className="text-sm text-muted-foreground">Excluir o board remove todas as colunas e cards. Não pode ser desfeito.</p>
          </div>
          <Button variant="destructive" onClick={removeBoard}>
            <Trash2 className="h-4 w-4 mr-2" />Excluir board
          </Button>
        </Card>
      )}
    </div>
  );
}
