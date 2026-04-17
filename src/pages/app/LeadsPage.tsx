// Kanban do Funil — /app/leads
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Kanban as KanbanIcon, ExternalLink, Flame, Snowflake, Cloud } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

interface Lead {
  id: string;
  name: string;
  email: string;
  company?: string;
  stage: string;
  temperature?: "cold" | "warm" | "hot";
  score?: number;
  createdAt: string;
}

const STAGES = [
  { id: "new", label: "Novo Lead", color: "bg-slate-500" },
  { id: "tested", label: "Fez Teste", color: "bg-blue-500" },
  { id: "engaged", label: "Engajado", color: "bg-amber-500" },
  { id: "negotiating", label: "Negociação", color: "bg-purple-500" },
  { id: "client", label: "Mentorado", color: "bg-emerald-500" },
  { id: "lost", label: "Perdido", color: "bg-rose-500" },
];

function tempIcon(t?: string) {
  if (t === "hot") return <Flame className="h-3 w-3 text-orange-500" />;
  if (t === "warm") return <Cloud className="h-3 w-3 text-amber-500" />;
  if (t === "cold") return <Snowflake className="h-3 w-3 text-sky-500" />;
  return null;
}

function LeadCard({ lead, onOpen }: { lead: Lead; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1 }
    : undefined;
  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow space-y-1"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-sm leading-tight">{lead.name}</div>
        {tempIcon(lead.temperature)}
      </div>
      {lead.company && <div className="text-xs text-muted-foreground">{lead.company}</div>}
      <div className="flex items-center justify-between pt-1">
        {lead.score != null && <Badge variant="outline" className="text-xs">{Math.round(lead.score)}%</Badge>}
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
        >
          <ExternalLink className="h-3 w-3" />
        </Button>
      </div>
    </Card>
  );
}

function Column({
  stage,
  leads,
  onOpen,
}: {
  stage: typeof STAGES[0];
  leads: Lead[];
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <div className="flex-shrink-0 w-72">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={`h-2 w-2 rounded-full ${stage.color}`} />
        <h3 className="font-semibold text-sm">{stage.label}</h3>
        <Badge variant="outline" className="ml-auto text-xs">{leads.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-2 min-h-96 p-2 rounded-lg border-2 border-dashed transition-colors ${
          isOver ? "border-primary bg-primary/5" : "border-transparent bg-muted/30"
        }`}
      >
        {leads.map((l) => (
          <LeadCard key={l.id} lead={l} onOpen={() => onOpen(l.id)} />
        ))}
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const nav = useNavigate();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function load() {
    try {
      setLeads(await api<Lead[]>("/leads"));
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function onStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function onEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over || !leads) return;
    const lead = leads.find((l) => l.id === active.id);
    if (!lead || lead.stage === over.id) return;

    const prev = leads;
    setLeads(leads.map((l) => (l.id === active.id ? { ...l, stage: String(over.id) } : l)));

    try {
      await api(`/leads/${active.id}`, { method: "PATCH", body: { stage: over.id } });
      toast.success("Lead movido");
    } catch (e: any) {
      setLeads(prev);
      toast.error(e.message);
    }
  }

  if (!leads) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;

  const dragging = activeId ? leads.find((l) => l.id === activeId) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <KanbanIcon className="h-6 w-6 text-accent" />
        <div>
          <h1 className="font-display text-3xl font-bold">Funil de Leads</h1>
          <p className="text-muted-foreground">Arraste cards entre as etapas. Clique no ícone para abrir o prontuário.</p>
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={onStart} onDragEnd={onEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((s) => (
            <Column
              key={s.id}
              stage={s}
              leads={leads.filter((l) => l.stage === s.id)}
              onOpen={(id) => nav(`/app/leads/${id}`)}
            />
          ))}
        </div>
        <DragOverlay>{dragging && <LeadCard lead={dragging} onOpen={() => {}} />}</DragOverlay>
      </DndContext>
    </div>
  );
}
