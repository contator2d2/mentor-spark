import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Phone, Mail, Video, Check, X } from "lucide-react";
import { toast } from "sonner";

interface Booking {
  id: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  startsAt: string;
  endsAt: string;
  status: string;
  meetingUrl?: string;
  notes?: string;
}

export default function SchedulingBookingsPage() {
  const [list, setList] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<"upcoming" | "past" | "pending">("upcoming");

  async function load() {
    try {
      const params = new URLSearchParams();
      if (filter === "upcoming") params.set("from", new Date().toISOString());
      if (filter === "past") params.set("to", new Date().toISOString());
      if (filter === "pending") params.set("status", "pending");
      const r = await api<Booking[]>(`/scheduling/bookings?${params}`);
      setList(r);
    } catch (e: any) { toast.error(e.message); }
  }
  useEffect(() => { load(); }, [filter]);

  async function setStatus(id: string, status: string) {
    await api(`/scheduling/bookings/${id}/status`, { method: "PATCH", body: { status } });
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold flex items-center gap-2">
          <Calendar className="h-7 w-7 text-primary" /> Agendamentos recebidos
        </h1>
      </div>

      <div className="flex gap-2">
        {(["upcoming", "pending", "past"] as const).map(f => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f === "upcoming" ? "Próximos" : f === "pending" ? "Pendentes" : "Passados"}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {list.map(b => (
          <Card key={b.id} className="p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-semibold">{b.guestName}</div>
                  <Badge variant={b.status === "confirmed" ? "default" : b.status === "pending" ? "secondary" : "outline"}>{b.status}</Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  📅 {new Date(b.startsAt).toLocaleString("pt-BR")} → {new Date(b.endsAt).toLocaleTimeString("pt-BR").slice(0,5)}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {b.guestEmail}</span>
                  {b.guestPhone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {b.guestPhone}</span>}
                </div>
                {b.notes && <div className="text-sm mt-2 italic text-muted-foreground">"{b.notes}"</div>}
              </div>
              <div className="flex flex-col gap-2 items-end">
                {b.meetingUrl && (
                  <a href={b.meetingUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Video className="h-3 w-3" /> Abrir Meet
                  </a>
                )}
                {b.status === "pending" && (
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => setStatus(b.id, "confirmed")}><Check className="h-3 w-3 mr-1" />Aprovar</Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus(b.id, "cancelled")}><X className="h-3 w-3 mr-1" />Recusar</Button>
                  </div>
                )}
                {b.status === "confirmed" && new Date(b.endsAt) < new Date() && (
                  <Button size="sm" variant="outline" onClick={() => setStatus(b.id, "completed")}>Marcar concluído</Button>
                )}
              </div>
            </div>
          </Card>
        ))}
        {list.length === 0 && <Card className="p-8 text-center text-muted-foreground">Nenhum agendamento.</Card>}
      </div>
    </div>
  );
}
