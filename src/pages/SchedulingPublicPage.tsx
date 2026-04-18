import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface PublicData {
  mentor: { id: string; name: string; brandName?: string; brandLogoUrl?: string };
  availabilities: Array<{ id: string; title: string; description?: string; durationMinutes: number; color: string }>;
}

interface Slot { start: string; end: string }

export default function SchedulingPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<PublicData | null>(null);
  const [selectedAvail, setSelectedAvail] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(); d.setHours(0,0,0,0); return d;
  });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [form, setForm] = useState({ guestName: "", guestEmail: "", guestPhone: "", notes: "" });
  const [done, setDone] = useState<any>(null);

  useEffect(() => {
    if (slug) api<PublicData>(`/public/scheduling/mentor/${slug}`).then(setData).catch(e => toast.error(e.message));
  }, [slug]);

  useEffect(() => {
    if (selectedAvail) {
      const from = new Date(weekStart);
      const to = new Date(weekStart); to.setDate(to.getDate() + 7);
      api<Slot[]>(`/public/scheduling/slots/${selectedAvail}?from=${from.toISOString()}&to=${to.toISOString()}`)
        .then(setSlots).catch(() => setSlots([]));
    }
  }, [selectedAvail, weekStart]);

  async function book() {
    if (!selectedSlot || !selectedAvail) return;
    if (!form.guestName || !form.guestEmail) { toast.error("Nome e email obrigatórios"); return; }
    try {
      const r = await api("/public/scheduling/book", {
        method: "POST", auth: false,
        body: { availabilityId: selectedAvail, startsAt: selectedSlot.start, ...form },
      });
      setDone(r);
    } catch (e: any) { toast.error(e.message); }
  }

  if (!data) return <div className="p-10 text-center">Carregando...</div>;
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-lg w-full p-8 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-display font-bold mb-2">Agendamento confirmado!</h1>
          <p className="text-muted-foreground mb-4">
            Você receberá um email/WhatsApp de confirmação. Detalhes:
          </p>
          <div className="text-left bg-muted/30 p-4 rounded space-y-1 text-sm">
            <div><strong>Quando:</strong> {new Date(done.startsAt).toLocaleString("pt-BR")}</div>
            <div><strong>Com:</strong> {data.mentor.brandName || data.mentor.name}</div>
            {done.meetingUrl && <div><strong>Link:</strong> <a href={done.meetingUrl} className="text-primary underline" target="_blank" rel="noreferrer">{done.meetingUrl}</a></div>}
          </div>
        </Card>
      </div>
    );
  }

  const displayName = data.mentor.brandName || data.mentor.name;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b py-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          {data.mentor.brandLogoUrl && <img src={data.mentor.brandLogoUrl} alt={displayName} className="h-10 w-10 rounded object-contain" />}
          <div>
            <div className="font-display text-lg font-bold">{displayName}</div>
            <div className="text-xs text-muted-foreground">Agendamento online</div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8">
        {!selectedAvail ? (
          <div>
            <h1 className="text-2xl font-display font-bold mb-2">Escolha o tipo de sessão</h1>
            <p className="text-muted-foreground mb-6">Selecione abaixo o tipo de agendamento que deseja fazer.</p>
            <div className="grid gap-3 md:grid-cols-2">
              {data.availabilities.map(a => (
                <Card key={a.id} className="p-5 cursor-pointer hover:border-primary transition-colors" onClick={() => setSelectedAvail(a.id)}>
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-lg shrink-0" style={{ background: a.color }} />
                    <div>
                      <div className="font-semibold">{a.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Clock className="h-3 w-3" /> {a.durationMinutes} minutos</div>
                      {a.description && <div className="text-sm mt-2 text-muted-foreground">{a.description}</div>}
                    </div>
                  </div>
                </Card>
              ))}
              {data.availabilities.length === 0 && <Card className="p-8 text-center text-muted-foreground col-span-2">Nenhum tipo disponível.</Card>}
            </div>
          </div>
        ) : !selectedSlot ? (
          <div>
            <Button variant="ghost" onClick={() => setSelectedAvail(null)} className="mb-4"><ChevronLeft className="h-4 w-4 mr-1" />Voltar</Button>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Escolha um horário</h2>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-sm">{weekStart.toLocaleDateString("pt-BR")} - {new Date(weekStart.getTime() + 6*86400000).toLocaleDateString("pt-BR")}</span>
                <Button size="icon" variant="outline" onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {slots.map(s => (
                <Button key={s.start} variant="outline" onClick={() => setSelectedSlot(s)}>
                  {new Date(s.start).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </Button>
              ))}
              {slots.length === 0 && <div className="col-span-full text-center text-muted-foreground py-8">Nenhum horário nesta semana.</div>}
            </div>
          </div>
        ) : (
          <div>
            <Button variant="ghost" onClick={() => setSelectedSlot(null)} className="mb-4"><ChevronLeft className="h-4 w-4 mr-1" />Voltar</Button>
            <Card className="p-6 max-w-md mx-auto">
              <h2 className="text-xl font-bold mb-1">Confirme seus dados</h2>
              <div className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4" /> {new Date(selectedSlot.start).toLocaleString("pt-BR")}
              </div>
              <div className="space-y-3">
                <div><Label>Nome *</Label><Input value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} /></div>
                <div><Label>Email *</Label><Input type="email" value={form.guestEmail} onChange={(e) => setForm({ ...form, guestEmail: e.target.value })} /></div>
                <div><Label>WhatsApp</Label><Input value={form.guestPhone} onChange={(e) => setForm({ ...form, guestPhone: e.target.value })} placeholder="(11) 99999-9999" /></div>
                <div><Label>Observações</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <Button className="w-full" onClick={book}>Confirmar agendamento</Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
