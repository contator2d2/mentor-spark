// Kanban do Funil — /app/leads (Dark Premium)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, Kanban as KanbanIcon, ExternalLink, Flame, Snowflake, Cloud,
  TrendingUp, Users, Sparkles, Plus, Zap,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  { id: "new",         label: "Novo Lead",   gradient: "from-slate-500/20 to-slate-700/10",   dot: "bg-slate-400" },
  { id: "tested",      label: "Fez Teste",   gradient: "from-blue-500/20 to-blue-700/10",     dot: "bg-blue-400" },
  { id: "engaged",     label: "Engajado",    gradient: "from-amber-500/20 to-amber-700/10",   dot: "bg-amber-400" },
  { id: "negotiating", label: "Negociação",  gradient: "from-violet-500/20 to-violet-700/10", dot: "bg-violet-400" },
  { id: "client",      label: "Mentorado",   gradient: "from-emerald-500/20 to-emerald-700/10", dot: "bg-emerald-400" },
  { id: "lost",        label: "Perdido",     gradient: "from-rose-500/20 to-rose-700/10",     dot: "bg-rose-400" },
];

function tempBadge(t?: string) {
  if (t === "hot")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-[0_0_12px_hsl(var(--hot)/0.3)]">
        <Flame className="h-2.5 w-2.5" /> HOT
      </span>
    );
  if (t === "warm")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
        <Cloud className="h-2.5 w-2.5" /> WARM
      </span>
    );
  if (t === "cold")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
        <Snowflake className="h-2.5 w-2.5" /> COLD
      </span>
    );
  return null;
}

function avatarFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function LeadCard({ lead, onOpen }: { lead: Lead; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.4 : 1 }
    : undefined;
  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group glass-card border-border/60 p-3 cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-glow transition-all space-y-2"
    >
      <div className="flex items-start gap-2.5">
        <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground shadow-glow shrink-0">
          {avatarFromName(lead.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm leading-tight truncate group-hover:text-gradient transition-all">
            {lead.name}
          </div>
          {lead.company && <div className="text-[11px] text-muted-foreground truncate">{lead.company}</div>}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
        <div className="flex items-center gap-1.5">
          {tempBadge(lead.temperature)}
          {lead.score != null && (
            <Badge variant="outline" className="text-[10px] h-5 border-border/60 bg-card/40">
              {Math.round(lead.score)}%
            </Badge>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
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
  index,
}: {
  stage: typeof STAGES[0];
  leads: Lead[];
  onOpen: (id: string) => void;
  index: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <div className={`flex-shrink-0 w-72 animate-fade-in anim-delay-${Math.min((index + 1) * 100, 600)}`}>
      <div className={`rounded-2xl bg-gradient-to-br ${stage.gradient} border border-border/40 p-3 mb-2`}>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${stage.dot} shadow-[0_0_8px_currentColor]`} />
          <h3 className="font-semibold text-sm">{stage.label}</h3>
          <Badge variant="outline" className="ml-auto text-xs border-border/60 bg-card/40">
            {leads.length}
          </Badge>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-2 min-h-[60vh] p-2 rounded-2xl border-2 border-dashed transition-all ${
          isOver
            ? "border-primary bg-primary/5 shadow-glow"
            : "border-border/30 bg-card/20"
        }`}
      >
        {leads.map((l) => (
          <LeadCard key={l.id} lead={l} onOpen={() => onOpen(l.id)} />
        ))}
        {leads.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-8">Solte um card aqui</div>
        )}
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quick, setQuick] = useState({ name: "", email: "", phone: "", company: "", sendInvite: false });
  const nav = useNavigate();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function load() {
    try { setLeads(await api<Lead[]>("/leads")); }
    catch (e: any) { toast.error(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function quickCreate() {
    if (!quick.name || !quick.email) { toast.error("Nome e email obrigatórios"); return; }
    setQuickSaving(true);
    try {
      const lead = await api<any>("/leads/manual", { method: "POST", body: quick });
      toast.success("Lead criado!");
      setQuickOpen(false);
      setQuick({ name: "", email: "", phone: "", company: "", sendInvite: false });
      setLeads((prev) => prev ? [lead, ...prev] : [lead]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setQuickSaving(false);
    }
  }

  function onStart(e: DragStartEvent) { setActiveId(String(e.active.id)); }

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

  if (!leads) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const dragging = activeId ? leads.find((l) => l.id === activeId) : null;
  const hot = leads.filter((l) => l.temperature === "hot").length;
  const clients = leads.filter((l) => l.stage === "client").length;
  const conversionRate = leads.length > 0 ? Math.round((clients / leads.length) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-hero border border-border/60 p-8 md:p-10">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />

        <div className="relative animate-fade-in">
          <Badge variant="outline" className="mb-3 border-accent/40 bg-accent/10 text-accent">
            <KanbanIcon className="h-3 w-3 mr-1" /> Pipeline de vendas
          </Badge>
          <h1 className="text-4xl md:text-5xl font-display tracking-tight text-balance">
            Funil de <span className="text-gradient">leads</span>
          </h1>
          <p className="text-muted-foreground mt-2 max-w-lg">
            Arraste cards entre as etapas. Clique no ícone para abrir o prontuário completo.
          </p>
        </div>

        <div className="relative animate-fade-in flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge variant="outline" className="mb-3 border-accent/40 bg-accent/10 text-accent">
              <KanbanIcon className="h-3 w-3 mr-1" /> Pipeline de vendas
            </Badge>
            <h1 className="text-4xl md:text-5xl font-display tracking-tight text-balance">
              Funil de <span className="text-gradient">leads</span>
            </h1>
            <p className="text-muted-foreground mt-2 max-w-lg">
              Arraste cards entre as etapas. Clique no ícone para abrir o prontuário completo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-accent/40">
                  <Zap className="h-4 w-4 mr-2" />Cadastro rápido
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cadastro rápido</DialogTitle>
                  <DialogDescription>Apenas o essencial. Você pode completar depois no prontuário.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 col-span-2"><Label className="text-xs">Nome *</Label><Input value={quick.name} onChange={(e) => setQuick({ ...quick, name: e.target.value })} /></div>
                  <div className="space-y-1 col-span-2"><Label className="text-xs">Email *</Label><Input type="email" value={quick.email} onChange={(e) => setQuick({ ...quick, email: e.target.value })} /></div>
                  <div className="space-y-1"><Label className="text-xs">Telefone</Label><Input value={quick.phone} onChange={(e) => setQuick({ ...quick, phone: e.target.value })} /></div>
                  <div className="space-y-1"><Label className="text-xs">Empresa</Label><Input value={quick.company} onChange={(e) => setQuick({ ...quick, company: e.target.value })} /></div>
                  <div className="col-span-2 flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/40">
                    <div>
                      <div className="text-sm font-medium">Enviar convite</div>
                      <div className="text-xs text-muted-foreground">Cria login + envia senha por email.</div>
                    </div>
                    <Switch checked={quick.sendInvite} onCheckedChange={(v) => setQuick({ ...quick, sendInvite: v })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={quickCreate} disabled={quickSaving} className="bg-gradient-primary">
                    {quickSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Criar lead
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button onClick={() => nav("/app/leads/novo")} className="bg-gradient-primary">
              <Plus className="h-4 w-4 mr-2" />Cadastro completo
            </Button>
          </div>
        </div>

        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
          {[
            { label: "Total", value: leads.length, icon: Users, glow: "text-foreground" },
            { label: "Hot leads", value: hot, icon: Flame, glow: "text-rose-400" },
            { label: "Mentorados", value: clients, icon: Sparkles, glow: "text-emerald-400" },
            { label: "Conversão", value: `${conversionRate}%`, icon: TrendingUp, glow: "text-violet-400" },
          ].map((s, i) => (
            <div key={s.label} className={`glass-card rounded-2xl p-4 animate-fade-in anim-delay-${(i + 1) * 100}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</span>
                <s.icon className={`h-4 w-4 ${s.glow}`} />
              </div>
              <div className={`text-3xl font-display font-bold mt-1 ${s.glow}`}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* KANBAN */}
      <DndContext sensors={sensors} onDragStart={onStart} onDragEnd={onEnd}>
        <div className="flex gap-4 overflow-x-auto pb-6 -mx-4 px-4">
          {STAGES.map((s, i) => (
            <Column
              key={s.id}
              index={i}
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
