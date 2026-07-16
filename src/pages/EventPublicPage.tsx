import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarDays, MapPin, Video, CheckCircle2, Users, Ticket, Check } from "lucide-react";
import { toast } from "sonner";

interface PublicEvent {
  id: string; name: string; description?: string; slug: string;
  location?: string; virtualUrl?: string; modality: string;
  startsAt?: string; endsAt?: string; capacity?: number;
  coverImageUrl?: string; isActive: boolean; status: string;
  registrations: number;
  isPaid?: boolean; currency?: string;
  tiers?: Array<{
    id: string; name: string; description?: string;
    priceCents: number; currency: string;
    quantity?: number; sold: number; isActive: boolean;
  }>;
}

interface CouponResult {
  valid: boolean;
  message?: string;
  code?: string;
  discountType?: "percent" | "fixed";
  discountValue?: number;
  discountCents?: number;
  originalCents?: number;
  finalCents?: number;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export default function EventPublicPage() {
  const { slug } = useParams();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ ticketCode: string; payment?: any } | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", role: "" });
  const [tierId, setTierId] = useState<string>("");
  const [cpfCnpj, setCpfCnpj] = useState<string>("");
  const [couponCode, setCouponCode] = useState<string>("");
  const [coupon, setCoupon] = useState<CouponResult | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/public/events/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        setEvent(d);
        if (d?.isPaid && d?.tiers?.length) setTierId(d.tiers[0].id);
      })
      .catch(() => toast.error("Evento não encontrado"))
      .finally(() => setLoading(false));
  }, [slug]);

  const selectedTier = useMemo(
    () => event?.tiers?.find((t) => t.id === tierId) || null,
    [event, tierId]
  );

  const displayCents = coupon?.valid ? coupon.finalCents ?? selectedTier?.priceCents ?? 0 : selectedTier?.priceCents ?? 0;

  async function applyCoupon() {
    if (!couponCode.trim() || !event || !selectedTier) return;
    if (!form.email) {
      toast.error("Informe seu email antes de aplicar o cupom");
      return;
    }
    setValidatingCoupon(true);
    try {
      const res = await fetch(`${API_URL}/public/event-payments/coupons/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          code: couponCode.trim(),
          tierId: selectedTier.id,
          email: form.email,
          cpfCnpj,
        }),
      });
      const data: CouponResult = await res.json();
      setCoupon(data);
      if (data.valid) toast.success(`Cupom aplicado! -R$ ${((data.discountCents || 0) / 100).toFixed(2)}`);
      else toast.error(data.message || "Cupom inválido");
    } catch (e: any) {
      toast.error("Erro ao validar cupom");
    } finally {
      setValidatingCoupon(false);
    }
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponCode("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = { ...form };
      if (event?.isPaid && tierId) payload.tierId = tierId;
      if (cpfCnpj) payload.cpfCnpj = cpfCnpj;
      if (coupon?.valid && couponCode) payload.couponCode = couponCode.trim();
      const res = await fetch(`${API_URL}/public/events/${slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erro ao inscrever");
      }
      const data = await res.json();
      setDone({ ticketCode: data.registration.ticketCode, payment: data.payment });
      toast.success(event?.isPaid ? "Inscrição criada! Finalize o pagamento." : "Inscrição confirmada!");
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
            <p className="text-muted-foreground">
              {done.payment && !done.payment.free
                ? "Finalize o pagamento na próxima página para garantir sua vaga."
                : <>Seu ingresso foi enviado para <b>{form.email}</b>. Apresente o QR no dia.</>}
            </p>
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

              {event.isPaid && event.tiers && event.tiers.length > 0 && (
                <div className="space-y-2">
                  <Label>Escolha o lote</Label>
                  <div className="space-y-2">
                    {event.tiers.filter((t) => t.isActive).map((t) => {
                      const soldOut = t.quantity != null && t.sold >= t.quantity;
                      const active = tierId === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          disabled={soldOut}
                          onClick={() => { setTierId(t.id); setCoupon(null); }}
                          className={`w-full text-left rounded-xl border p-3 transition ${
                            active
                              ? "border-primary bg-primary/10"
                              : "border-border/50 hover:border-border bg-muted/20"
                          } ${soldOut ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{t.name}</div>
                              {t.description && <div className="text-xs text-muted-foreground">{t.description}</div>}
                            </div>
                            <div className="text-right">
                              <div className="font-display text-lg">R$ {(t.priceCents / 100).toFixed(2)}</div>
                              {soldOut && <div className="text-xs text-rose-500">Esgotado</div>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div><Label>Nome *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Email *</Label><Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>WhatsApp</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" /></div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label>Empresa</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
                <div><Label>Cargo</Label><Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /></div>
              </div>

              {event.isPaid && selectedTier && (
                <>
                  <div>
                    <Label>CPF/CNPJ (para nota fiscal)</Label>
                    <Input value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)} placeholder="000.000.000-00" />
                  </div>

                  <div className="space-y-2 rounded-xl border border-border/50 bg-muted/20 p-3">
                    <Label className="flex items-center gap-2"><Ticket className="h-4 w-4 text-primary" /> Cupom de desconto</Label>
                    {coupon?.valid ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-500 text-sm">
                          <Check className="h-4 w-4" />
                          <span className="font-mono font-semibold">{coupon.code}</span>
                          <span className="text-muted-foreground">
                            -R$ {((coupon.discountCents || 0) / 100).toFixed(2)}
                          </span>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={removeCoupon}>Remover</Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          placeholder="Digite o código"
                          className="font-mono uppercase"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={applyCoupon}
                          disabled={validatingCoupon || !couponCode.trim()}
                        >
                          {validatingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-border/50 bg-background/30 p-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>R$ {(selectedTier.priceCents / 100).toFixed(2)}</span>
                    </div>
                    {coupon?.valid && (
                      <div className="flex justify-between text-emerald-500">
                        <span>Desconto ({coupon.code})</span>
                        <span>-R$ {((coupon.discountCents || 0) / 100).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-display text-lg pt-1 border-t border-border/40">
                      <span>Total</span>
                      <span>R$ {(displayCents / 100).toFixed(2)}</span>
                    </div>
                  </div>
                </>
              )}

              <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary hover:opacity-90 shadow-glow text-base h-12">
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {event.isPaid && selectedTier ? `Pagar R$ ${(displayCents / 100).toFixed(2)}` : "Confirmar inscrição"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
