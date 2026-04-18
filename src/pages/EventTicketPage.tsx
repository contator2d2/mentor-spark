import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import QRCode from "qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarDays, MapPin, Video, Download, CheckCircle2 } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export default function EventTicketPage() {
  const { slug, ticketCode } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetch(`${API_URL}/public/events/ticket/${ticketCode}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [ticketCode]);

  useEffect(() => {
    if (data && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, ticketCode!, { width: 280, margin: 2, color: { dark: "#000", light: "#fff" } });
    }
  }, [data, ticketCode]);

  function download() {
    const url = canvasRef.current!.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url; a.download = `ticket-${ticketCode}.png`; a.click();
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!data?.event) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Ticket inválido.</div>;

  const { event, registration } = data;
  const isCheckedIn = registration.status === "checked_in";

  return (
    <div className="min-h-screen bg-gradient-hero py-8 px-4">
      <div className="max-w-md mx-auto">
        <Card className="glass-card border-border/60">
          <CardContent className="p-6 text-center space-y-5">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Seu ingresso</div>
              <h1 className="text-2xl font-display mt-1">{event.name}</h1>
            </div>

            {isCheckedIn ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 space-y-2">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
                <div className="font-semibold text-emerald-500">Check-in realizado</div>
                <div className="text-xs text-muted-foreground">Aproveite o evento!</div>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-2xl inline-block mx-auto">
                <canvas ref={canvasRef} />
              </div>
            )}

            <div className="space-y-2 text-sm text-left bg-muted/30 rounded-xl p-4">
              <div><b>{registration.name}</b></div>
              <div className="text-muted-foreground">{registration.email}</div>
              {event.startsAt && <div className="flex items-center gap-2 text-xs"><CalendarDays className="h-3 w-3" />{new Date(event.startsAt).toLocaleString("pt-BR")}</div>}
              {event.location && <div className="flex items-center gap-2 text-xs"><MapPin className="h-3 w-3" />{event.location}</div>}
              {event.virtualUrl && (
                <div className="pt-2 border-t border-border/40">
                  <Button asChild className="w-full bg-gradient-primary hover:opacity-90" size="sm">
                    <a href={event.virtualUrl} target="_blank" rel="noreferrer"><Video className="h-3 w-3 mr-2" />Acessar sala virtual</a>
                  </Button>
                </div>
              )}
            </div>

            <div className="text-xs text-muted-foreground">Código: <code className="bg-muted/50 px-2 py-0.5 rounded">{ticketCode}</code></div>

            {!isCheckedIn && (
              <Button variant="outline" onClick={download} className="w-full"><Download className="h-3 w-3 mr-2" />Baixar QR</Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
