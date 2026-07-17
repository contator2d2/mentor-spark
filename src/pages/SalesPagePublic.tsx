import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2, ShieldCheck, Sparkles, Target, TrendingUp, Zap, BookOpen, Clock, Users,
  Loader2, Copy, QrCode, CreditCard,
} from "lucide-react";
import { toast } from "sonner";

const ICONS: Record<string, any> = {
  sparkles: Sparkles,
  target: Target,
  "trending-up": TrendingUp,
  "shield-check": ShieldCheck,
  zap: Zap,
  "book-open": BookOpen,
  clock: Clock,
  users: Users,
};

type Payload = {
  mentor: {
    brandName?: string; brandLogoUrl?: string;
    brandPrimaryColor?: string; brandAccentColor?: string; slug: string;
  };
  page: {
    id: string; slug: string; title: string;
    headline?: string; subheadline?: string; description?: string;
    heroImageUrl?: string; videoUrl?: string;
    features: { icon?: string; title: string; text?: string }[];
    faqs: { q: string; a: string }[];
    badges: string[]; guaranteeText?: string; ctaText: string;
    priceCents: number; currency: string; originalPriceCents?: number;
    maxInstallments: number; paymentMode: "one_time" | "subscription";
    seo?: { title?: string; description?: string };
    template?: "classic" | "long_form";
    theme?: {
      colorSource?: "brand" | "custom";
      mode?: "light" | "dark";
      primaryColor?: string;
      accentColor?: string;
      bgColor?: string;
    };
    forWho?: string[];
    notForWho?: string[];
    agenda?: { time?: string; title: string; text?: string }[];
    about?: { name?: string; role?: string; bio?: string; photoUrl?: string };
    eventInfo?: { date?: string; time?: string; location?: string; extra?: string };
    urgencyText?: string;
  };
};

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function SalesPagePublic() {
  const { mentorSlug, pageSlug } = useParams();
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/public/sales-pages/${mentorSlug}/${pageSlug}`);
        if (!r.ok) throw new Error((await r.json())?.message || "Página não encontrada");
        setData(await r.json());
      } catch (e: any) {
        setErr(e.message);
      }
    })();
  }, [mentorSlug, pageSlug]);

  useEffect(() => {
    if (data?.page?.seo?.title) document.title = data.page.seo.title;
    else if (data?.page?.title) document.title = data.page.title;
    if (data?.page?.seo?.description) {
      const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
      meta.setAttribute("name", "description");
      meta.setAttribute("content", data.page.seo.description);
      if (!meta.parentNode) document.head.appendChild(meta);
    }
  }, [data]);

  if (err) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <div className="text-4xl mb-2">🔍</div>
          <h1 className="font-bold text-xl mb-1">Página não encontrada</h1>
          <p className="text-muted-foreground">{err}</p>
        </div>
      </div>
    );
  }
  if (!data) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const { mentor, page } = data;

  // ===== Resolve cores (brand vs custom) =====
  const src = page.theme?.colorSource || "brand";
  const primaryHex = src === "custom"
    ? (page.theme?.primaryColor || "#c9a84c")
    : (mentor.brandPrimaryColor || "#c9a84c");
  const accentHex = src === "custom"
    ? (page.theme?.accentColor || primaryHex)
    : (mentor.brandAccentColor || primaryHex);
  const bgHex = src === "custom" ? (page.theme?.bgColor || "#0a0a0a") : "#0a0a0a";
  const mode: "light" | "dark" = src === "custom" ? (page.theme?.mode || "dark") : "dark";
  const isDark = mode === "dark";
  const textColor = isDark ? "#ffffff" : "#0a0a0a";
  const mutedText = isDark ? "rgba(255,255,255,0.72)" : "rgba(10,10,10,0.7)";
  const softText = isDark ? "rgba(255,255,255,0.55)" : "rgba(10,10,10,0.55)";
  const borderCol = isDark ? "rgba(255,255,255,0.08)" : "rgba(10,10,10,0.08)";

  const openCheckout = () => setCheckoutOpen(true);

  const template = page.template || "classic";

  if (template === "long_form") {
    return (
      <LongFormLayout
        mentor={mentor}
        page={page}
        colors={{ primary: primaryHex, accent: accentHex, bg: bgHex, text: textColor, muted: mutedText, soft: softText, border: borderCol, isDark }}
        onCta={openCheckout}
        mentorSlug={mentorSlug!}
        pageSlug={pageSlug!}
        checkoutOpen={checkoutOpen}
        setCheckoutOpen={setCheckoutOpen}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header (dark premium) */}
      <header className="sticky top-0 z-40 backdrop-blur bg-[#0a0a0a]/80 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {mentor.brandLogoUrl ? (
              <img src={mentor.brandLogoUrl} alt={mentor.brandName || ""} className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-[#c9a84c]/15 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-[#c9a84c]" />
              </div>
            )}
            <div className="font-bold text-white">{mentor.brandName || "Mentoria"}</div>
          </div>
          <Button
            onClick={() => setCheckoutOpen(true)}
            className="bg-[#c9a84c] hover:bg-[#d4b662] text-[#0a0a0a] font-semibold border-0 shadow-[0_8px_24px_-8px_rgba(201,168,76,0.5)]"
          >
            {page.ctaText}
          </Button>
        </div>
      </header>

      {/* Hero — Premium Dark */}
      <section className="relative overflow-hidden bg-[#0a0a0a] text-white">
        {/* Golden radial halo behind subject */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 60% at 78% 55%, rgba(201,168,76,0.28) 0%, rgba(201,168,76,0.08) 35%, rgba(10,10,10,0) 70%)",
          }}
        />
        {/* Subtle vignette on the left for text legibility */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28 grid lg:grid-cols-2 gap-10 items-center">
          <div className="relative z-10">
            {page.badges?.[0] && (
              <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full border border-[#c9a84c]/40 bg-[#c9a84c]/10 text-[#e8c97a] text-xs font-medium tracking-wide uppercase">
                <Sparkles className="h-3 w-3" /> {page.badges[0]}
              </div>
            )}
            <h1
              className="font-display text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight mb-6 text-white"
              style={{ fontFamily: "'Playfair Display', 'DM Serif Display', Georgia, serif" }}
            >
              {page.headline || page.title}
            </h1>
            {page.subheadline && (
              <p className="text-lg md:text-xl mb-6 max-w-xl leading-snug font-medium text-[#e8c97a]">
                {page.subheadline}
              </p>
            )}
            {page.description && (
              <p className="text-base md:text-lg text-white/70 mb-8 max-w-xl leading-relaxed">
                {page.description.split("\n")[0]}
              </p>
            )}
            <div className="flex flex-wrap items-baseline gap-3 mb-8">
              {page.originalPriceCents ? (
                <span className="text-white/40 line-through">{money(page.originalPriceCents)}</span>
              ) : null}
              <span className="font-display text-4xl md:text-5xl font-bold text-[#e8c97a]">
                {money(page.priceCents)}
              </span>
              {page.maxInstallments > 1 && (
                <span className="text-sm text-white/60">
                  ou até {page.maxInstallments}x de {money(Math.floor(page.priceCents / page.maxInstallments))}
                </span>
              )}
            </div>
            <Button
              size="lg"
              onClick={() => setCheckoutOpen(true)}
              className="bg-[#c9a84c] hover:bg-[#d4b662] text-[#0a0a0a] font-bold h-14 px-10 text-base rounded-md border-0 shadow-[0_16px_40px_-12px_rgba(201,168,76,0.6)] transition-transform hover:-translate-y-0.5"
            >
              {page.ctaText}
            </Button>
            {page.guaranteeText && (
              <div className="mt-5 flex items-center gap-2 text-sm text-white/70">
                <ShieldCheck className="h-4 w-4 text-[#c9a84c]" /> {page.guaranteeText}
              </div>
            )}
          </div>

          <div className="relative">
            {page.videoUrl ? (
              <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-black/50 ring-1 ring-white/10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)]">
                <iframe
                  src={page.videoUrl.replace("watch?v=", "embed/").replace("youtu.be/", "www.youtube.com/embed/")}
                  className="w-full h-full"
                  allowFullScreen
                />
              </div>
            ) : page.heroImageUrl ? (
              <div className="relative">
                {/* Fade image edges into the dark background */}
                <img
                  src={page.heroImageUrl}
                  alt={page.title}
                  className="w-full h-[520px] object-cover object-center rounded-2xl"
                  style={{
                    WebkitMaskImage:
                      "radial-gradient(ellipse at 60% 50%, #000 55%, transparent 92%)",
                    maskImage:
                      "radial-gradient(ellipse at 60% 50%, #000 55%, transparent 92%)",
                  }}
                />
              </div>
            ) : (
              <div className="aspect-[4/5] rounded-2xl bg-gradient-to-br from-[#c9a84c]/20 to-transparent flex items-center justify-center ring-1 ring-white/5">
                <Sparkles className="h-16 w-16 text-[#c9a84c]/40" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Description */}
      {page.description && (
        <section className="py-16 border-b border-border/40">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line">{page.description}</p>
          </div>
        </section>
      )}

      {/* Features */}
      {page.features?.length > 0 && (
        <section className="py-16 md:py-20 bg-muted/20 border-b border-border/40">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-center font-display text-3xl md:text-4xl font-bold mb-10">O que você recebe</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {page.features.map((f, i) => {
                const Icon = ICONS[f.icon || "sparkles"] || Sparkles;
                return (
                  <Card key={i} className="p-6">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="font-bold mb-1">{f.title}</div>
                    {f.text && <p className="text-sm text-muted-foreground">{f.text}</p>}
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Second CTA */}
      <section className="py-16 border-b border-border/40">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">{page.title}</h2>
          <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
            <span className="font-display text-3xl font-bold text-primary">{money(page.priceCents)}</span>
            {page.maxInstallments > 1 && (
              <span className="text-sm text-muted-foreground">
                ou {page.maxInstallments}x {money(Math.floor(page.priceCents / page.maxInstallments))}
              </span>
            )}
          </div>
          {page.badges?.length > 0 && (
            <div className="flex justify-center flex-wrap gap-2 mb-6">
              {page.badges.map((b, i) => (
                <span key={i} className="text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {b}
                </span>
              ))}
            </div>
          )}
          <Button size="lg" onClick={() => setCheckoutOpen(true)} className="bg-primary hover:opacity-90 h-12 px-8 shadow-lg">
            {page.ctaText}
          </Button>
        </div>
      </section>

      {/* FAQ */}
      {page.faqs?.length > 0 && (
        <section className="py-16">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-center font-display text-3xl font-bold mb-8">Perguntas frequentes</h2>
            <Accordion type="single" collapsible className="space-y-2">
              {page.faqs.map((f, i) => (
                <AccordionItem key={i} value={`f-${i}`} className="border rounded-lg px-4 bg-muted/10">
                  <AccordionTrigger className="text-left font-semibold py-4">{f.q}</AccordionTrigger>
                  <AccordionContent className="pb-4 text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      )}

      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {mentor.brandName || "Mentoria"} — Compra segura processada por Asaas.
      </footer>

      <CheckoutDialog open={checkoutOpen} onClose={() => setCheckoutOpen(false)} mentorSlug={mentorSlug!} pageSlug={pageSlug!} page={page} />
    </div>
  );
}

// ================= CHECKOUT =================
function CheckoutDialog({
  open, onClose, mentorSlug, pageSlug, page,
}: {
  open: boolean; onClose: () => void;
  mentorSlug: string; pageSlug: string;
  page: Payload["page"];
}) {
  const [step, setStep] = useState<"form" | "pix" | "success">("form");
  const [method, setMethod] = useState<"PIX" | "CREDIT_CARD">("PIX");
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [phone, setPhone] = useState("");

  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCcv, setCardCcv] = useState("");
  const [installments, setInstallments] = useState(1);
  const [postalCode, setPostalCode] = useState("");
  const [addressNumber, setAddressNumber] = useState("");

  const [pix, setPix] = useState<{ payload?: string; qrImage?: string } | null>(null);

  const submit = async () => {
    if (!name || !email || !cpfCnpj) { toast.error("Preencha nome, e-mail e CPF/CNPJ"); return; }
    if (method === "CREDIT_CARD" && (!cardNumber || !cardHolder || !cardExp || !cardCcv || !postalCode || !addressNumber)) {
      toast.error("Preencha todos os dados do cartão e endereço"); return;
    }
    setLoading(true);
    try {
      const [mm, yy] = cardExp.split("/").map((s) => s.trim());
      const body: any = {
        name, email, cpfCnpj, phone, billingType: method,
      };
      if (method === "CREDIT_CARD") {
        body.installments = installments;
        body.creditCard = {
          holderName: cardHolder,
          number: cardNumber,
          expiryMonth: mm,
          expiryYear: yy?.length === 2 ? `20${yy}` : yy,
          ccv: cardCcv,
        };
        body.creditCardHolderInfo = {
          name, email, cpfCnpj, phone, postalCode, addressNumber,
        };
      }
      const r = await fetch(`${API_BASE}/public/sales-pages/${mentorSlug}/${pageSlug}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.message || "Falha no checkout");

      if (method === "PIX") {
        setPix(data.pix || null);
        setStep("pix");
      } else {
        setStep("success");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{step === "success" ? "Compra confirmada" : `Finalizar compra — ${money(page.priceCents)}`}</DialogTitle>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-4">
            <Tabs value={method} onValueChange={(v: any) => setMethod(v)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="PIX"><QrCode className="h-4 w-4 mr-2" />PIX</TabsTrigger>
                <TabsTrigger value="CREDIT_CARD"><CreditCard className="h-4 w-4 mr-2" />Cartão</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="grid gap-3">
              <div>
                <Label>Nome completo</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>E-mail</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label>CPF/CNPJ</Label>
                  <Input value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
              </div>

              {method === "CREDIT_CARD" && (
                <>
                  <div className="pt-2 border-t" />
                  <div>
                    <Label>Número do cartão</Label>
                    <Input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="0000 0000 0000 0000" />
                  </div>
                  <div>
                    <Label>Nome impresso no cartão</Label>
                    <Input value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Validade (MM/AA)</Label>
                      <Input value={cardExp} onChange={(e) => setCardExp(e.target.value)} placeholder="MM/AA" />
                    </div>
                    <div>
                      <Label>CVV</Label>
                      <Input value={cardCcv} onChange={(e) => setCardCcv(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>CEP</Label>
                      <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                    </div>
                    <div>
                      <Label>Nº do endereço</Label>
                      <Input value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} />
                    </div>
                  </div>
                  {page.maxInstallments > 1 && (
                    <div>
                      <Label>Parcelas</Label>
                      <select
                        className="w-full h-10 rounded-md border border-input bg-background px-3"
                        value={installments}
                        onChange={(e) => setInstallments(parseInt(e.target.value))}
                      >
                        {Array.from({ length: page.maxInstallments }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n}x de {money(Math.floor(page.priceCents / n))} {n === 1 ? "(à vista)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>

            <Button onClick={submit} disabled={loading} className="w-full bg-primary hover:opacity-90">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {method === "PIX" ? "Gerar PIX" : `Pagar ${money(page.priceCents)}`}
            </Button>
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3 w-3" /> Processado com segurança pela Asaas
            </div>
          </div>
        )}

        {step === "pix" && (
          <div className="space-y-4 text-center">
            {pix?.qrImage ? (
              <img src={pix.qrImage} alt="QR Code Pix" className="mx-auto w-56 h-56 rounded-lg border" />
            ) : (
              <div className="text-sm text-muted-foreground">Gerando QR Code…</div>
            )}
            {pix?.payload && (
              <>
                <div className="text-xs text-muted-foreground">Ou copie o código:</div>
                <div className="rounded-lg border p-3 text-xs break-all bg-muted/30">{pix.payload}</div>
                <Button
                  variant="outline" className="w-full"
                  onClick={() => { navigator.clipboard.writeText(pix.payload!); toast.success("Código copiado"); }}
                >
                  <Copy className="h-4 w-4 mr-2" /> Copiar código PIX
                </Button>
              </>
            )}
            <p className="text-xs text-muted-foreground">
              Assim que o pagamento cair, você recebe a confirmação por e-mail.
            </p>
          </div>
        )}

        {step === "success" && (
          <div className="text-center space-y-3 py-4">
            <div className="h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-bold text-lg">Pagamento em processamento</h3>
            <p className="text-sm text-muted-foreground">
              Você receberá a confirmação por e-mail assim que a Asaas aprovar o cartão.
            </p>
            <Button onClick={onClose} className="w-full">Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}