import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Save, Trash2, Plus, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";

interface Column { id: string; name: string; color: string; order: number; slug?: string }
interface Board {
  id: string;
  name: string;
  description?: string;
  color?: string;
  type?: string;
  isDefault?: boolean;
  columns: Column[];
}

const PRESET_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6", "#64748b"];

export default function BoardSettingsPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [board, setBoard] = useState<Board | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [saving, setSaving] = useState(false);
  const [newCol, setNewCol] = useState({ name: "", color: "#6366f1" });

  async function load() {
    try {
      const b = await api<Board>(`/kanban/boards/${id}`);
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

  async function updateColumn(colId: string, patch: Partial<Column>) {
    try {
      await api(`/kanban/columns/${colId}`, { method: "PATCH", body: patch });
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function removeColumn(colId: string) {
    if (!confirm("Excluir esta coluna? Os cards associados também serão removidos.")) return;
    try {
      await api(`/kanban/columns/${colId}`, { method: "DELETE" });
      load();
    } catch (e: any) {
      toast.error(e.message);
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
          <p className="text-sm text-muted-foreground">Renomeie, reordene e gerencie as colunas do board.</p>
        </div>

        <div className="space-y-2">
          {board.columns?.sort((a, b) => a.order - b.order).map((col) => (
            <div key={col.id} className="flex items-center gap-2">
              <Input
                type="color"
                value={col.color}
                onChange={(e) => updateColumn(col.id, { color: e.target.value })}
                className="h-9 w-12 p-1 shrink-0"
              />
              <Input
                value={col.name}
                onChange={(e) => setBoard({ ...board, columns: board.columns.map((c) => c.id === col.id ? { ...c, name: e.target.value } : c) })}
                onBlur={(e) => updateColumn(col.id, { name: e.target.value })}
                className="flex-1"
              />
              <Button size="icon" variant="ghost" onClick={() => removeColumn(col.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
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
