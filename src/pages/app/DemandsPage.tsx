 import { useEffect, useState } from "react";
import { api } from "@/lib/api";
 import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Plus,
  GripVertical,
  Calendar as CalIcon,
  User as UserIcon,
  LayoutGrid,
  List as ListIcon,
  Search,
  Bell,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DemandStatus = 
  | 'new' 
  | 'analysis' 
  | 'planned' 
  | 'production' 
  | 'waiting_feedback' 
  | 'review' 
  | 'adjustments' 
  | 'approved' 
  | 'finished' 
  | 'canceled';

interface Demand {
  id: string;
  title: string;
  type: string;
  status: DemandStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  department?: string;
  definedDeadline?: string;
  responsible?: { name: string };
  responsibles?: { id: string, name: string }[];
  agency?: { name: string };
}

const STATUS_COLUMNS: { key: DemandStatus; label: string; color: string }[] = [
  { key: "new", label: "Nova", color: "border-t-slate-400" },
  { key: "analysis", label: "Em Análise", color: "border-t-blue-400" },
  { key: "production", label: "Em Produção", color: "border-t-amber-400" },
  { key: "waiting_feedback", label: "Aguardando", color: "border-t-purple-400" },
  { key: "approved", label: "Aprovada", color: "border-t-emerald-400" },
];

const ALL_STATUSES: { key: DemandStatus; label: string }[] = [
  { key: "new", label: "Nova" },
  { key: "analysis", label: "Em Análise" },
  { key: "planned", label: "Planejada" },
  { key: "production", label: "Em Produção" },
  { key: "waiting_feedback", label: "Aguardando Feedback" },
  { key: "review", label: "Em Revisão" },
  { key: "adjustments", label: "Ajustes" },
  { key: "approved", label: "Aprovada" },
  { key: "finished", label: "Finalizada" },
  { key: "canceled", label: "Cancelada" },
];

const PRIORITY_COLORS = {
  low: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  medium: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  high: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  urgent: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

export default function DemandsPage() {
   const { user } = useAuth();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    notifyVia: "both" as "whatsapp" | "email" | "both" | "none",
    reminderMinutes: 60,
    overdueReminderFrequencyHours: 24,
  });

  const loadSettings = () => {
    if (user?.role === "mentor" || user?.role === "super_admin") {
      setNotificationSettings({
        notifyVia: user.demandNotificationSettings?.notifyVia || "both",
        reminderMinutes: user.demandNotificationSettings?.reminderMinutes || 60,
        overdueReminderFrequencyHours: user.demandNotificationSettings?.overdueReminderFrequencyHours || 24,
      });
    }
  };

  useEffect(() => {
    loadSettings();
  }, [user]);

  async function saveSettings() {
    setSavingSettings(true);
    try {
      await api("/me/brand", {
        method: "PUT",
        body: { demandNotificationSettings: notificationSettings },
      });
      toast.success("Configurações de notificação salvas!");
      setSettingsOpen(false);
    } catch (e: any) {
      toast.error("Erro ao salvar configurações");
    } finally {
      setSavingSettings(false);
    }
  }

  const isAgency = user?.teamRole === "agency";
 
  const load = () => api<Demand[]>("/demands").then(setDemands).finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  async function moveDemand(id: string, status: DemandStatus) {
    try {
      await api(`/demands/${id}`, { method: "PATCH", body: { status } });
      setDemands((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
      toast.success("Status atualizado");
    } catch (e: any) {
      toast.error("Erro ao mover demanda");
    }
  }

  const filtered = demands.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(search.toLowerCase()) || 
      d.type.toLowerCase().includes(search.toLowerCase());
    
    if (showOverdueOnly) {
      if (!d.definedDeadline) return false;
      const isOverdue = new Date(d.definedDeadline) < new Date() && d.status !== 'finished' && d.status !== 'approved';
      return matchesSearch && isOverdue;
    }

    return matchesSearch;
  });

  if (loading) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Central de Demandas</h1>
          <p className="text-muted-foreground mt-1">
            Gestão de produção de materiais e marketing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(user?.role === "mentor" || user?.role === "super_admin") && (
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)} className="gap-2">
              <Bell className="h-4 w-4" /> Notificações
            </Button>
          )}
          <div className="bg-muted p-1 rounded-lg flex items-center gap-1 mr-2">
             <Button 
               variant={view === "kanban" ? "secondary" : "ghost"} 
               size="sm" 
               className="h-8 px-2"
               onClick={() => setView("kanban")}
             >
               <LayoutGrid className="h-4 w-4 mr-1" /> Kanban
             </Button>
             <Button 
               variant={view === "list" ? "secondary" : "ghost"} 
               size="sm" 
               className="h-8 px-2"
               onClick={() => setView("list")}
             >
               <ListIcon className="h-4 w-4 mr-1" /> Lista
             </Button>
          </div>
           {!isAgency && (
             <Button onClick={() => navigate("new")}>
               <Plus className="h-4 w-4 mr-2" />Nova Demanda
             </Button>
           )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar demandas..." 
            className="pl-9" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Button
          variant={showOverdueOnly ? "destructive" : "outline"}
          size="sm"
          onClick={() => setShowOverdueOnly(!showOverdueOnly)}
          className="gap-2 shrink-0"
        >
          <AlertCircle className="h-4 w-4" />
          {showOverdueOnly ? "Mostrando Atrasadas" : "Filtrar Atrasadas"}
        </Button>
      </div>

      {view === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/30">
          {STATUS_COLUMNS.map((col) => {
            const items = filtered.filter((d) => d.status === col.key);
            return (
              <div
                key={col.key}
                className={`bg-muted/30 rounded-xl border-t-4 ${col.color} p-3 min-h-[500px] w-full min-w-[260px]`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const id = e.dataTransfer.getData("demandId");
                  if (id) moveDemand(id, col.key);
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                    {col.label}
                  </h3>
                  <Badge variant="outline" className="bg-background">{items.length}</Badge>
                </div>
                
                <div className="space-y-3">
                  {items.map((d) => (
                    <div
                      key={d.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("demandId", d.id)}
                      onClick={() => navigate(d.id)}
                      className="bg-card border border-border rounded-xl p-4 cursor-pointer shadow-sm hover:shadow-md transition-all group active:scale-[0.98]"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground/30 mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors">
                            {d.title}
                          </p>
                          <Badge variant="secondary" className="mt-1.5 text-[10px] uppercase font-bold tracking-tighter py-0">
                            {d.department ? `${d.department} • ` : ''}{d.type}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 mt-4">
                        <div className="flex items-center justify-between text-[10px]">
                           <div className="flex items-center gap-1 text-muted-foreground">
                             <UserIcon className="h-3 w-3" />
                             <span className="truncate max-w-[80px]">
                               {d.responsibles && d.responsibles.length > 0 
                                 ? d.responsibles.map(r => r.name).join(', ') 
                                 : (d.agency?.name || d.responsible?.name || 'Sem resp.')}
                             </span>
                           </div>
                           <Badge variant="secondary" className={`text-[9px] ${PRIORITY_COLORS[d.priority]}`}>
                             {d.priority.toUpperCase()}
                           </Badge>
                        </div>

                        {d.definedDeadline && (
                          <div className={`flex items-center gap-1 text-[10px] font-medium ${
                            new Date(d.definedDeadline) < new Date() && d.status !== 'finished' && d.status !== 'approved'
                              ? 'text-rose-500' 
                              : 'text-muted-foreground'
                          }`}>
                            <CalIcon className="h-3 w-3" />
                            {new Date(d.definedDeadline).toLocaleDateString()}
                            {new Date(d.definedDeadline) < new Date() && d.status !== 'finished' && d.status !== 'approved' && " (ATRASADA)"}
                          </div>
                        )}

                        <div
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                          draggable={false}
                          onDragStart={(e) => e.preventDefault()}
                          className="mt-1"
                        >
                          <Select
                            value={d.status}
                            onValueChange={(v) => moveDemand(d.id, v as DemandStatus)}
                          >
                            <SelectTrigger className="h-7 text-[11px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ALL_STATUSES.map((s) => (
                                <SelectItem key={s.key} value={s.key} className="text-xs">
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="border-2 border-dashed border-muted rounded-xl py-8 flex flex-col items-center justify-center text-muted-foreground/40">
                       <Plus className="h-6 w-6 mb-1" />
                       <span className="text-[10px] font-medium uppercase">Vazio</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left p-4 font-medium">Demanda</th>
                <th className="text-left p-4 font-medium">Tipo</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Responsável</th>
                <th className="text-left p-4 font-medium">Prazo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => navigate(d.id)}>
                  <td className="p-4 font-medium">{d.title}</td>
                  <td className="p-4 uppercase text-xs">{d.type}</td>
                  <td className="p-4">
                     <Badge variant="outline">{STATUS_COLUMNS.find(c => c.key === d.status)?.label || d.status}</Badge>
                  </td>
                  <td className="p-4 text-muted-foreground">{d.agency?.name || d.responsible?.name || '-'}</td>
                  <td className="p-4 text-muted-foreground">
                    {d.definedDeadline ? new Date(d.definedDeadline).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurações de Notificação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Enviar notificações por:</Label>
              <Select 
                value={notificationSettings.notifyVia} 
                onValueChange={(v: any) => setNotificationSettings({ ...notificationSettings, notifyVia: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">WhatsApp e E-mail</SelectItem>
                  <SelectItem value="whatsapp">Apenas WhatsApp</SelectItem>
                  <SelectItem value="email">Apenas E-mail</SelectItem>
                  <SelectItem value="none">Nenhum (Desativar)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder-minutes">Lembrete ANTES do vencimento (minutos):</Label>
              <Input 
                id="reminder-minutes"
                type="number" 
                value={notificationSettings.reminderMinutes}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, reminderMinutes: parseInt(e.target.value) || 0 })}
                placeholder="Ex: 60"
              />
              <p className="text-[10px] text-muted-foreground">O sistema enviará um alerta este número de minutos antes do prazo acabar.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="overdue-hours">Lembretes APÓS atraso (frequência em horas):</Label>
              <Input 
                id="overdue-hours"
                type="number" 
                value={notificationSettings.overdueReminderFrequencyHours}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, overdueReminderFrequencyHours: parseInt(e.target.value) || 0 })}
                placeholder="Ex: 24"
              />
              <p className="text-[10px] text-muted-foreground">Intervalo de reenvio caso a tarefa continue atrasada (ex: 24 para diário).</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSettingsOpen(false)}>Cancelar</Button>
            <Button onClick={saveSettings} disabled={savingSettings}>
              {savingSettings && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
