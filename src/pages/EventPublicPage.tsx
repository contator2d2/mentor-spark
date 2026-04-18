import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarDays, MapPin, Video, CheckCircle2, Users } from "lucide-react";
import { toast } from "sonner";

interface PublicEvent {
  id: string; name: string; description?: string; slug: string;
  location?: string; virtualUrl?: string; modality: string;
  startsAt?: string; endsAt?: string; capacity?: number;
  coverImageUrl?: string; isActive: boolean; status: string;
  registrations: number;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export default function EventPublicPage() {
  const { slug } = useParams();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ ticketCode: string } | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", role: "" });

  useEffect(() => {
    fetch(`${API_URL}/public/events/${slug}`)
      .then((r) => r.json())
      .then((d) => setEvent(d))
      .catch(() => toast.error("Evento não encontrado"))
      .finally(() => setLoading(false));
  }, [slug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/public/events/${slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erro ao inscrever");
      }
      const data = await res.json();
      setDone({ ticketCode: data.registration.ticketCode });
      toast.success("Inscrição confirmada!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!event) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Evento não encontrado.</div>;

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="glass-card max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
            <h1 className="text-2xl font-display">Inscrição confirmada!</h1>
            <p className="text-muted-foreground">Seu ingresso foi enviado para <b>{form.email}</b>. Apresente o QR no dia.</p>
            <Button asChild className="bg-gradient-primary hover:opacity-90">
              <Link to={`/e/${slug}/ticket/${done.ticketCode}`}>Ver meu ingresso</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {event.coverImageUrl && (
          <img src={event.coverImageUrl} alt={event.name} className="w-full h-64 object-cover rounded-3xl" />
        )}
        <Card className="glass-card border-border/60">
          <CardContent className="p-8 space-y-6">
            <div>
              <Badge variant="outline" className="mb-3">
                {event.modality === "virtual" ? <><Video className="h-3 w-3 mr-1" /> Virtual</> :
                 event.modality === "hybrid" ? <><Video className="h-3 w-3 mr-1" /> Híbrido</> :
                 <><MapPin className="h-3 w-3 mr-1" /> Presencial</>}
              </Badge>
              <h1 className="text-3xl md:text-4xl font-display">{event.name}</h1>
              {event.description && <p className="text-muted-foreground mt-2 whitespace-pre-wrap">{event.description}</p>}
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {event.startsAt && <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" />{new Date(event.startsAt).toLocaleString("pt-BR")}</div>}
              {event.location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />{event.location}</div>}
              {event.capacity && <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" />{event.registrations}/{event.capacity} inscritos</div>}
            </div>

            <form onSubmit={submit} className="space-y-3 pt-4 border-t border-border/40">
              <h2 className="font-display text-xl">Garanta sua vaga</h2>
              <div><Label>Nome *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Email *</Label><Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>WhatsApp</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" /></div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label>Empresa</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
                <div><Label>Cargo</Label><Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /></div>
              </div>
              <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary hover:opacity-90 shadow-glow text-base h-12">
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Confirmar inscrição
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
