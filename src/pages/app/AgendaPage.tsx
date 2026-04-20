import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDays, addMonths, addWeeks, endOfDay, endOfMonth, endOfWeek, format,
  isSameDay, isSameMonth, startOfDay, startOfMonth, startOfWeek, subMonths, subWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, CalendarDays,
  CheckSquare, Users, Video, Clock,
} from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Kind = "meeting" | "task" | "event" | "booking";
type View = "day" | "week" | "month";

interface CalendarEvent {
  id: string;
  kind: Kind;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  status?: string;
  color: string; // semantic token name
  url?: string;
  meta?: any;
}

const KIND_META: Record<Kind, { label: string; icon: any; dot: string; bg: string; border: string; text: string }> = {
  meeting: {
    label: "Reuniões", icon: Video,
    dot: "bg-primary",
    bg: "bg-primary/10 hover:bg-primary/20",
    border: "border-l-primary",
    text: "text-primary",
  },
  event: {
    label: "Eventos", icon: CalendarDays,
    dot: "bg-accent",
    bg: "bg-accent/10 hover:bg-accent/20",
    border: "border-l-accent",
    text: "text-accent",
  },
  task: {
    label: "Tarefas", icon: CheckSquare,
    dot: "bg-warning",
    bg: "bg-warning/10 hover:bg-warning/20",
    border: "border-l-warning",
    text: "text-warning",
  },
  booking: {
    label: "Agendamentos", icon: Users,
    dot: "bg-success",
    bg: "bg-success/10 hover:bg-success/20",
    border: "border-l-success",
    text: "text-success",
  },
};

const ALL_KINDS: Kind[] = ["meeting", "event", "task", "booking"];

function colorClasses(color: string) {
  // backend pode mandar variações (destructive/success) por status; mapeia no front
  switch (color) {
    case "primary": return KIND_META.meeting;
    case "accent": return KIND_META.event;
    case "warning": return KIND_META.task;
    case "success": return KIND_META.booking;
    case "destructive": return {
      label: "", icon: Clock,
      dot: "bg-destructive",
      bg: "bg-destructive/10 hover:bg-destructive/20",
      border: "border-l-destructive",
      text: "text-destructive",
    };
    default: return KIND_META.meeting;
  }
}

export default function AgendaPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [enabledKinds, setEnabledKinds] = useState<Set<Kind>>(new Set(ALL_KINDS));
  const [selected, setSelected] = useState<CalendarEvent | null>(null);

  const range = useMemo(() => {
    if (view === "day") return { from: startOfDay(cursor), to: endOfDay(cursor) };
    if (view === "week") return { from: startOfWeek(cursor, { weekStartsOn: 0 }), to: endOfWeek(cursor, { weekStartsOn: 0 }) };
    return { from: startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 }), to: endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 }) };
  }, [cursor, view]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        kinds: ALL_KINDS.join(","),
      });
      const data = await api<CalendarEvent[]>(`/calendar?${params.toString()}`);
      setEvents(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [range.from.toISOString(), range.to.toISOString()]);

  const filtered = useMemo(() => events.filter((e) => enabledKinds.has(e.kind)), [events, enabledKinds]);

  function toggleKind(k: Kind) {
    setEnabledKinds((s) => {
      const n = new Set(s);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  }

  function navPrev() {
    setCursor(view === "day" ? addDays(cursor, -1) : view === "week" ? subWeeks(cursor, 1) : subMonths(cursor, 1));
  }
  function navNext() {
    setCursor(view === "day" ? addDays(cursor, 1) : view === "week" ? addWeeks(cursor, 1) : addMonths(cursor, 1));
  }

  const headerLabel = useMemo(() => {
    if (view === "day") return format(cursor, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    if (view === "week") {
      const s = startOfWeek(cursor, { weekStartsOn: 0 });
      const e = endOfWeek(cursor, { weekStartsOn: 0 });
      return `${format(s, "dd MMM", { locale: ptBR })} – ${format(e, "dd MMM yyyy", { locale: ptBR })}`;
    }
    return format(cursor, "MMMM 'de' yyyy", { locale: ptBR });
  }, [cursor, view]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
          <CalendarIcon className="h-7 w-7 text-primary" /> Agenda
        </h1>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>Hoje</Button>
          <Button variant="ghost" size="icon" onClick={navPrev}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={navNext}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="font-display text-lg capitalize">{headerLabel}</div>
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList>
            <TabsTrigger value="day">Dia</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="month">Mês</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filtros por tipo */}
      <div className="flex flex-wrap gap-2">
        {ALL_KINDS.map((k) => {
          const m = KIND_META[k];
          const Icon = m.icon;
          const on = enabledKinds.has(k);
          const count = events.filter((e) => e.kind === k).length;
          return (
            <Badge
              key={k}
              variant={on ? "default" : "outline"}
              className={cn("cursor-pointer gap-1 py-1 px-3", on && m.bg, on && m.text)}
              onClick={() => toggleKind(k)}
            >
              <span className={cn("h-2 w-2 rounded-full", m.dot)} />
              <Icon className="h-3 w-3" />
              {m.label} <span className="opacity-70 ml-1">({count})</span>
            </Badge>
          );
        })}
      </div>

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">Carregando agenda...</Card>
      ) : view === "month" ? (
        <MonthView cursor={cursor} events={filtered} onSelect={setSelected} />
      ) : view === "week" ? (
        <WeekView cursor={cursor} events={filtered} onSelect={setSelected} />
      ) : (
        <DayView cursor={cursor} events={filtered} onSelect={setSelected} />
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className={cn("h-3 w-3 rounded-full", colorClasses(selected.color).dot)} />
                  {selected.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {format(new Date(selected.start), "EEEE, dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                  {selected.end && ` – ${format(new Date(selected.end), "HH:mm")}`}
                </div>
                {selected.status && <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline">{selected.status}</Badge></div>}
                {selected.meta?.leadName && <div><span className="text-muted-foreground">Mentorado:</span> {selected.meta.leadName}</div>}
                {selected.meta?.location && <div><span className="text-muted-foreground">Local:</span> {selected.meta.location}</div>}
                {selected.meta?.meetingUrl && (
                  <div>
                    <a href={selected.meta.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      Abrir link da reunião
                    </a>
                  </div>
                )}
                {selected.url && (
                  <Button className="w-full mt-2" onClick={() => { navigate(selected.url!); setSelected(null); }}>
                    Ir para o item →
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* =============================== MONTH ================================== */
function MonthView({ cursor, events, onSelect }: { cursor: Date; events: CalendarEvent[]; onSelect: (e: CalendarEvent) => void }) {
  const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 bg-muted/30 text-xs font-semibold uppercase tracking-wide">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
          <div key={d} className="px-2 py-2 text-center text-muted-foreground">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-fr">
        {days.map((d) => {
          const inMonth = isSameMonth(d, cursor);
          const isToday = isSameDay(d, new Date());
          const dayEvents = events.filter((e) => isSameDay(new Date(e.start), d));
          return (
            <div
              key={d.toISOString()}
              className={cn(
                "border-t border-l p-1.5 min-h-[110px] flex flex-col gap-1",
                !inMonth && "bg-muted/10 text-muted-foreground",
              )}
            >
              <div className={cn(
                "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full",
                isToday && "bg-primary text-primary-foreground",
              )}>
                {format(d, "d")}
              </div>
              <div className="space-y-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((e) => {
                  const cc = colorClasses(e.color);
                  return (
                    <button
                      key={e.id}
                      onClick={() => onSelect(e)}
                      className={cn("w-full text-left text-[11px] px-1.5 py-0.5 rounded truncate border-l-2", cc.bg, cc.border, cc.text)}
                    >
                      {!e.allDay && format(new Date(e.start), "HH:mm")} {e.title}
                    </button>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 3} mais</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* =============================== WEEK ================================== */
function WeekView({ cursor, events, onSelect }: { cursor: Date; events: CalendarEvent[]; onSelect: (e: CalendarEvent) => void }) {
  const start = startOfWeek(cursor, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="grid md:grid-cols-7 gap-2">
      {days.map((d) => {
        const dayEvents = events.filter((e) => isSameDay(new Date(e.start), d));
        const isToday = isSameDay(d, new Date());
        return (
          <Card key={d.toISOString()} className={cn("p-2 min-h-[180px]", isToday && "border-primary")}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs uppercase text-muted-foreground">{format(d, "EEE", { locale: ptBR })}</div>
              <div className={cn("text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full", isToday && "bg-primary text-primary-foreground")}>
                {format(d, "dd")}
              </div>
            </div>
            <div className="space-y-1">
              {dayEvents.length === 0 && <div className="text-xs text-muted-foreground italic">Sem itens</div>}
              {dayEvents.map((e) => {
                const cc = colorClasses(e.color);
                const Icon = cc.icon;
                return (
                  <button
                    key={e.id}
                    onClick={() => onSelect(e)}
                    className={cn("w-full text-left p-2 rounded border-l-4 transition-colors", cc.bg, cc.border)}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] font-medium">
                      <Icon className={cn("h-3 w-3", cc.text)} />
                      {!e.allDay && <span className="text-muted-foreground">{format(new Date(e.start), "HH:mm")}</span>}
                    </div>
                    <div className="text-sm font-medium truncate">{e.title}</div>
                    {e.meta?.leadName && <div className="text-[11px] text-muted-foreground truncate">{e.meta.leadName}</div>}
                  </button>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* =============================== DAY =================================== */
function DayView({ cursor, events, onSelect }: { cursor: Date; events: CalendarEvent[]; onSelect: (e: CalendarEvent) => void }) {
  const dayEvents = events
    .filter((e) => isSameDay(new Date(e.start), cursor))
    .sort((a, b) => a.start.localeCompare(b.start));

  return (
    <div className="space-y-2">
      {dayEvents.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">Nada agendado para este dia.</Card>
      )}
      {dayEvents.map((e) => {
        const cc = colorClasses(e.color);
        const Icon = cc.icon;
        return (
          <Card
            key={e.id}
            onClick={() => onSelect(e)}
            className={cn("p-3 cursor-pointer flex gap-3 border-l-4", cc.border, cc.bg)}
          >
            <div className="flex flex-col items-center justify-center w-16 shrink-0 text-center">
              <div className="text-lg font-bold tabular-nums">{e.allDay ? "Dia todo" : format(new Date(e.start), "HH:mm")}</div>
              {e.end && !e.allDay && <div className="text-xs text-muted-foreground">{format(new Date(e.end), "HH:mm")}</div>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Icon className={cn("h-4 w-4", cc.text)} />
                <div className="font-semibold truncate">{e.title}</div>
                {e.status && <Badge variant="outline" className="text-[10px]">{e.status}</Badge>}
              </div>
              {e.meta?.leadName && <div className="text-xs text-muted-foreground mt-0.5">com {e.meta.leadName}</div>}
              {e.meta?.location && <div className="text-xs text-muted-foreground">{e.meta.location}</div>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
