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
  Loader2, Copy, QrCode, CreditCard, Ticket, Check, Calendar, MapPin, UserCheck, AlertCircle, XCircle, PlayCircle,
  Rocket, Trophy, Heart, Star, Lightbulb, Award, Briefcase, Brain, DollarSign, Gift,
  MessageCircle, Mic, Video as VideoIcon, Globe, Compass, Flag, Flame, Gem, GraduationCap, Handshake,
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
  rocket: Rocket,
  trophy: Trophy,
  heart: Heart,
  star: Star,
  lightbulb: Lightbulb,
  award: Award,
  briefcase: Briefcase,
  brain: Brain,
  "dollar-sign": DollarSign,
  gift: Gift,
  "message-circle": MessageCircle,
  mic: Mic,
  video: VideoIcon,
  globe: Globe,
  compass: Compass,
  flag: Flag,
  flame: Flame,
  gem: Gem,
  "graduation-cap": GraduationCap,
  handshake: Handshake,
  calendar: Calendar,
  "map-pin": MapPin,
  check: Check,
  "check-circle": CheckCircle2,
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
    installmentInterestRate?: number;
    installmentDisplayCents?: number;
    seo?: { title?: string; description?: string };
    template?: "classic" | "long_form" | "immersion";
    theme?: {
      colorSource?: "brand" | "custom";
      mode?: "light" | "dark";
      primaryColor?: string;
      accentColor?: string;
      bgColor?: string;
      heroStyle?: "split" | "background";
      heroFocus?: string;
      heroOverlay?: number;
      titleSize?: "sm" | "md" | "lg" | "xl";
      titleColor?: string;
      highlightColor?: string;
      logoUrl?: string;
    };
    forWho?: string[];
    notForWho?: string[];
    agenda?: { time?: string; title: string; text?: string }[];
    about?: {
      name?: string; role?: string; bio?: string; photoUrl?: string;
      sectionTitle?: string;
      columns?: number;
      people?: Array<{ name?: string; role?: string; bio?: string; photoUrl?: string }>;
    };
    eventInfo?: { date?: string; time?: string; location?: string; extra?: string };
    urgencyText?: string;
    gallery?: string[];
    showcase?: { imageUrl?: string; title?: string; eyebrow?: string; text?: string; bullets?: string[]; side?: "left" | "right"; titleSize?: "sm" | "md" | "lg" | "xl"; titleColor?: string; textSize?: "sm" | "md" | "lg" | "xl"; textColor?: string }[];
    countdown?: {
      enabled?: boolean;
      endsAt?: string;
      label?: string;
      hideWhenExpired?: boolean;
    };
  };
};

// ============= Badge pill sem ícone de IA — glow na cor da marca =============
// Player de vídeo: detecta YouTube/Vimeo (iframe) vs arquivo de vídeo (tag <video>).
function VideoPlayer({ src, primary, poster }: { src: string; primary: string; poster?: string }) {
  const isYoutube = /youtube\.com|youtu\.be/i.test(src);
  const isVimeo = /vimeo\.com/i.test(src);
  const isFile = /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(src) || src.includes("/uploads/");

  if (isYoutube || isVimeo) {
    const embed = src
      .replace("watch?v=", "embed/")
      .replace("youtu.be/", "www.youtube.com/embed/")
      .replace("vimeo.com/", "player.vimeo.com/video/");
    return (
      <div
        className="aspect-video rounded-2xl overflow-hidden"
        style={{ boxShadow: `0 40px 100px -20px ${primary}66` }}
      >
        <iframe src={embed} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media; picture-in-picture" />
      </div>
    );
  }

  if (isFile) {
    return (
      <div
        className="aspect-video rounded-2xl overflow-hidden bg-black relative group"
        style={{ boxShadow: `0 40px 100px -20px ${primary}66` }}
      >
        <video
          src={src}
          poster={poster}
          controls
          playsInline
          preload="metadata"
          className="w-full h-full object-cover"
          style={{ outline: "none" }}
        />
      </div>
    );
  }

  // Fallback: tenta iframe genérico
  return (
    <div className="aspect-video rounded-2xl overflow-hidden" style={{ boxShadow: `0 40px 100px -20px ${primary}66` }}>
      <iframe src={src} className="w-full h-full" allowFullScreen />
    </div>
  );
}

function BadgePill({ children, primary, accent }: { children: React.ReactNode; primary: string; accent: string }) {
  return (
    <div
      className="inline-flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase animate-fade-in"
      style={{
        border: `1px solid ${primary}66`,
        background: `linear-gradient(90deg, ${primary}22, ${primary}0d)`,
        color: accent,
        boxShadow: `0 0 24px -6px ${primary}80, inset 0 0 12px -6px ${primary}55`,
      }}
    >
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{ background: primary, boxShadow: `0 0 10px 2px ${primary}` }}
      >
        <span
          className="absolute inset-0 rounded-full animate-ping"
          style={{ background: primary, opacity: 0.6 }}
        />
      </span>
      {children}
    </div>
  );
}

// ============= Countdown =============
function CountdownBar({
  endsAt, label, primary, accent, hideWhenExpired,
}: { endsAt: string; label?: string; primary: string; accent: string; hideWhenExpired?: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const end = new Date(endsAt).getTime();
  const diff = Math.max(0, end - now);
  const expired = diff === 0;
  if (expired && hideWhenExpired) return null;

  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");

  const Unit = ({ v, lbl }: { v: string; lbl: string }) => (
    <div className="flex flex-col items-center min-w-[52px] md:min-w-[68px]">
      <div
        className="font-display font-bold text-2xl md:text-3xl leading-none tabular-nums"
        style={{ color: accent, textShadow: `0 0 20px ${primary}80` }}
      >
        {v}
      </div>
      <div className="text-[10px] md:text-[11px] uppercase tracking-widest mt-1 opacity-70">{lbl}</div>
    </div>
  );

  return (
    <div
      className="relative z-30 w-full border-b animate-fade-in"
      style={{
        background: `linear-gradient(90deg, ${primary}14, ${primary}22, ${primary}14)`,
        borderColor: `${primary}44`,
        boxShadow: `inset 0 -1px 0 ${primary}55, 0 6px 24px -12px ${primary}80`,
      }}
    >
      <div className="max-w-6xl mx-auto px-6 py-3 flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6 text-white">
        <div
          className="text-xs md:text-sm uppercase tracking-widest font-semibold flex items-center gap-2"
          style={{ color: accent }}
        >
          <span
            className="inline-flex h-2 w-2 rounded-full animate-pulse"
            style={{ background: primary, boxShadow: `0 0 10px 2px ${primary}` }}
          />
          {expired ? "Oferta encerrada" : (label || "A oferta termina em")}
        </div>
        {!expired && (
          <div className="flex items-center gap-2 md:gap-3">
            <Unit v={pad(d)} lbl="dias" />
            <div className="opacity-40 font-bold text-xl">:</div>
            <Unit v={pad(h)} lbl="horas" />
            <div className="opacity-40 font-bold text-xl">:</div>
            <Unit v={pad(m)} lbl="min" />
            <div className="opacity-40 font-bold text-xl">:</div>
            <Unit v={pad(s)} lbl="seg" />
          </div>
        )}
      </div>
    </div>
  );
}

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Texto da parcela a prazo. Se `installmentDisplayCents` estiver definido,
 *  usa esse valor literal ("12x R$ 97,00"). Caso contrário divide o preço à vista.
 */
function installmentText(p: { priceCents: number; maxInstallments: number; installmentDisplayCents?: number }) {
  if (!p.maxInstallments || p.maxInstallments < 2) return "";
  const per = p.installmentDisplayCents && p.installmentDisplayCents > 0
    ? p.installmentDisplayCents
    : Math.floor(p.priceCents / p.maxInstallments);
  return `${p.maxInstallments}x de ${money(per)}`;
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

  if (template === "immersion") {
    return (
      <ImmersionLayout
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
            {(page.theme?.logoUrl || mentor.brandLogoUrl) ? (
              <img src={(page.theme?.logoUrl || mentor.brandLogoUrl)} alt={mentor.brandName || ""} className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm"
                style={{ background: `${primaryHex}22`, color: primaryHex, boxShadow: `0 0 20px -4px ${primaryHex}66` }}
              >
                {(mentor.brandName || "M").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="font-bold text-white">{mentor.brandName || "Mentoria"}</div>
          </div>
          <Button
            onClick={() => setCheckoutOpen(true)}
            className="font-semibold border-0 transition-transform hover:-translate-y-0.5"
            style={{ background: primaryHex, color: isDark ? "#0a0a0a" : "#fff", boxShadow: `0 8px 30px -8px ${primaryHex}` }}
          >
            {page.ctaText}
          </Button>
        </div>
      </header>

      {/* Countdown */}
      {page.countdown?.enabled && page.countdown?.endsAt && (
        <CountdownBar
          endsAt={page.countdown.endsAt}
          label={page.countdown.label}
          primary={primaryHex}
          accent={accentHex}
          hideWhenExpired={page.countdown.hideWhenExpired}
        />
      )}

      {/* Hero — Premium Dark */}
      {(page.theme?.heroStyle === "background" && page.heroImageUrl) ? (
      <section className="relative overflow-hidden bg-[#0a0a0a] text-white min-h-[80vh] flex items-center">
        <img
          src={page.heroImageUrl}
          alt={page.title}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: page.theme?.heroFocus || "center" }}
        />
        <div
          className="absolute inset-0 md:hidden"
          style={{ background: `linear-gradient(180deg, rgba(10,10,10,0.75) 0%, rgba(10,10,10,0.4) 50%, rgba(10,10,10,0.9) 100%)` }}
        />
        <div
          className="hidden md:block absolute inset-0"
          style={{ background: `linear-gradient(90deg, rgba(10,10,10,${page.theme?.heroOverlay ?? 0.75}) 0%, rgba(10,10,10,${(page.theme?.heroOverlay ?? 0.75) * 0.7}) 45%, rgba(10,10,10,${(page.theme?.heroOverlay ?? 0.75) * 0.2}) 100%)` }}
        />
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(50% 60% at 85% 50%, rgba(201,168,76,0.25) 0%, transparent 70%)" }} />
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 md:py-28 w-full">
          <div className="max-w-2xl">
            {page.badges?.[0] && (
              <BadgePill primary={primaryHex} accent={accentHex}>{page.badges[0]}</BadgePill>
            )}
            <h1
              className="font-display text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight mb-6 text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
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
              <p className="text-base md:text-lg text-white/80 mb-8 max-w-xl leading-relaxed">
                {page.description.split("\n")[0]}
              </p>
            )}
            <div className="flex flex-wrap items-baseline gap-3 mb-8">
              {page.originalPriceCents ? (
                <span className="text-white/50 line-through">{money(page.originalPriceCents)}</span>
              ) : null}
              <span className="font-display text-4xl md:text-5xl font-bold text-[#e8c97a]">
                {money(page.priceCents)}
              </span>
              {page.maxInstallments > 1 && (
                <span className="text-sm text-white/70">
                  ou {installmentText(page)}
                </span>
              )}
            </div>
            <Button
              size="lg"
              onClick={() => setCheckoutOpen(true)}
              className="bg-[#c9a84c] hover:bg-[#d4b662] text-[#0a0a0a] font-bold h-14 px-10 text-base rounded-md border-0 shadow-[0_16px_40px_-12px_rgba(201,168,76,0.7)] transition-transform hover:-translate-y-0.5"
            >
              {page.ctaText}
            </Button>
            {page.guaranteeText && (
              <div className="mt-5 flex items-center gap-2 text-sm text-white/80">
                <ShieldCheck className="h-4 w-4 text-[#c9a84c]" /> {page.guaranteeText}
              </div>
            )}
          </div>
        </div>
      </section>
      ) : (
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
              <BadgePill primary={primaryHex} accent={accentHex}>{page.badges[0]}</BadgePill>
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
                  ou {installmentText(page)}
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
              <VideoPlayer src={page.videoUrl} primary={primaryHex} poster={page.heroImageUrl} />
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
                <div className="h-32 w-32 rounded-full animate-pulse" style={{ background: `radial-gradient(circle, ${primaryHex}66, transparent 70%)` }} />
              </div>
            )}
          </div>
        </div>
      </section>
      )}

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
                ou {installmentText(page)}
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

// ================= LONG FORM (versão completa) =================
function LongFormLayout({
  mentor, page, colors, onCta, mentorSlug, pageSlug, checkoutOpen, setCheckoutOpen,
}: {
  mentor: Payload["mentor"];
  page: Payload["page"];
  colors: { primary: string; accent: string; bg: string; text: string; muted: string; soft: string; border: string; isDark: boolean };
  onCta: () => void;
  mentorSlug: string;
  pageSlug: string;
  checkoutOpen: boolean;
  setCheckoutOpen: (o: boolean) => void;
}) {
  const { primary, accent, bg, text, muted, soft, border, isDark } = colors;
  const surface = isDark ? "rgba(255,255,255,0.04)" : "rgba(10,10,10,0.03)";
  const surfaceStrong = isDark ? "rgba(255,255,255,0.06)" : "rgba(10,10,10,0.05)";

  const CtaBtn = ({ size = "lg", label }: { size?: "lg" | "default"; label?: string }) => (
    <Button
      size={size}
      onClick={onCta}
      className="font-bold border-0 shadow-lg transition-transform hover:-translate-y-0.5"
      style={{ background: primary, color: isDark ? "#0a0a0a" : "#fff", height: size === "lg" ? 56 : 44, paddingInline: 32 }}
    >
      {label || page.ctaText}
    </Button>
  );

  return (
    <div style={{ background: bg, color: text }} className="min-h-screen">
      {/* Header */}
      <header
        className="sticky top-0 z-40 backdrop-blur"
        style={{ background: `${bg}cc`, borderBottom: `1px solid ${border}` }}
      >
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(page.theme?.logoUrl || mentor.brandLogoUrl) ? (
              <img src={(page.theme?.logoUrl || mentor.brandLogoUrl)} alt={mentor.brandName || ""} className="h-9 w-auto object-contain" />
            ) : (
              <div className="font-bold" style={{ color: text }}>{mentor.brandName || "Mentoria"}</div>
            )}
          </div>
          <CtaBtn size="default" />
        </div>
      </header>

      {page.countdown?.enabled && page.countdown?.endsAt && (
        <CountdownBar
          endsAt={page.countdown.endsAt}
          label={page.countdown.label}
          primary={primary}
          accent={accent}
          hideWhenExpired={page.countdown.hideWhenExpired}
        />
      )}

      {/* HERO */}
      {(page.theme?.heroStyle === "background" && page.heroImageUrl) ? (
      <section className="relative overflow-hidden min-h-[85vh] flex items-center">
        <img
          src={page.heroImageUrl}
          alt={page.title}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: page.theme?.heroFocus || "center" }}
        />
        {/* Mobile: gradiente vertical suave (imagem visível). Desktop: gradiente horizontal. */}
        <div
          className="absolute inset-0 md:hidden"
          style={{ background: `linear-gradient(180deg, ${bg}cc 0%, ${bg}80 50%, ${bg}f0 100%)` }}
        />
        <div
          className="hidden md:block absolute inset-0"
          style={{ background: `linear-gradient(90deg, ${bg}${Math.round((page.theme?.heroOverlay ?? 0.7) * 255).toString(16).padStart(2,'0')} 0%, ${bg}99 45%, ${bg}22 100%)` }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(50% 60% at 85% 50%, ${primary}33 0%, transparent 70%)` }}
        />
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 md:py-28 w-full">
          <div className="max-w-2xl">
            {page.badges?.[0] && (
              <BadgePill primary={primary} accent={accent}>{page.badges[0]}</BadgePill>
            )}
            <h1 className="font-display text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight mb-6 drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)]" style={{ color: text }}>
              {page.headline || page.title}
            </h1>
            {page.subheadline && (
              <p className="text-lg md:text-2xl mb-6 max-w-xl leading-snug font-medium" style={{ color: accent }}>
                {page.subheadline}
              </p>
            )}
            {page.description && (
              <p className="text-base md:text-lg mb-8 max-w-xl leading-relaxed" style={{ color: muted }}>
                {page.description.split("\n")[0]}
              </p>
            )}
            <CtaBtn />
            {page.guaranteeText && (
              <div className="mt-5 flex items-center gap-2 text-sm" style={{ color: muted }}>
                <ShieldCheck className="h-4 w-4" style={{ color: primary }} /> {page.guaranteeText}
              </div>
            )}
          </div>
        </div>
      </section>
      ) : (
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(60% 60% at 78% 40%, ${primary}33 0%, ${primary}11 35%, transparent 70%)` }}
        />
        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            {page.badges?.[0] && (
              <BadgePill primary={primary} accent={accent}>{page.badges[0]}</BadgePill>
            )}
            <h1 className="font-display text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight mb-6" style={{ color: text }}>
              {page.headline || page.title}
            </h1>
            {page.subheadline && (
              <p className="text-lg md:text-2xl mb-6 max-w-xl leading-snug font-medium" style={{ color: accent }}>
                {page.subheadline}
              </p>
            )}
            {page.description && (
              <p className="text-base md:text-lg mb-8 max-w-xl leading-relaxed" style={{ color: muted }}>
                {page.description.split("\n")[0]}
              </p>
            )}
            <CtaBtn />
            {page.guaranteeText && (
              <div className="mt-5 flex items-center gap-2 text-sm" style={{ color: muted }}>
                <ShieldCheck className="h-4 w-4" style={{ color: primary }} /> {page.guaranteeText}
              </div>
            )}
          </div>
          <div className="relative">
            {page.videoUrl ? (
              <VideoPlayer src={page.videoUrl} primary={primary} poster={page.heroImageUrl} />
            ) : page.heroImageUrl ? (
              <img src={page.heroImageUrl} alt={page.title} className="w-full h-[520px] object-cover rounded-2xl" />
            ) : (
              <div className="aspect-[4/5] rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primary}22, transparent)` }}>
                <div className="h-32 w-32 rounded-full animate-pulse" style={{ background: `radial-gradient(circle, ${primary}66, transparent 70%)` }} />
              </div>
            )}
          </div>
        </div>
      </section>
      )}

      {/* Event info strip */}
      {(page.eventInfo?.date || page.eventInfo?.time || page.eventInfo?.location) && (
        <section className="py-10" style={{ borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}`, background: surface }}>
          <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-4 gap-6 text-center">
            {page.eventInfo?.date && (
              <div><div className="text-xs uppercase tracking-widest mb-1" style={{ color: soft }}>Data</div><div className="font-bold text-lg" style={{ color: text }}>{page.eventInfo.date}</div></div>
            )}
            {page.eventInfo?.time && (
              <div><div className="text-xs uppercase tracking-widest mb-1" style={{ color: soft }}>Horário</div><div className="font-bold text-lg" style={{ color: text }}>{page.eventInfo.time}</div></div>
            )}
            {page.eventInfo?.location && (
              <div><div className="text-xs uppercase tracking-widest mb-1" style={{ color: soft }}>Local</div><div className="font-bold text-lg" style={{ color: text }}>{page.eventInfo.location}</div></div>
            )}
            {page.eventInfo?.extra && (
              <div><div className="text-xs uppercase tracking-widest mb-1" style={{ color: soft }}>Detalhe</div><div className="font-bold text-lg" style={{ color: text }}>{page.eventInfo.extra}</div></div>
            )}
          </div>
        </section>
      )}

      {/* Para quem é */}
      {(page.forWho?.length || 0) > 0 && (
        <section className="py-16 md:py-20">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-10" style={{ color: text }}>Esse conteúdo é pra você se…</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {page.forWho!.map((item, i) => (
                <div key={i} className="flex gap-3 items-start p-5 rounded-xl" style={{ background: surface, border: `1px solid ${border}` }}>
                  <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" style={{ color: primary }} />
                  <div style={{ color: muted }}>{item}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Não é pra você */}
      {(page.notForWho?.length || 0) > 0 && (
        <section className="py-16" style={{ background: surface, borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}` }}>
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-10" style={{ color: text }}>NÃO é pra você se…</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {page.notForWho!.map((item, i) => (
                <div key={i} className="flex gap-3 items-start p-5 rounded-xl" style={{ background: surfaceStrong, border: `1px solid ${border}` }}>
                  <div className="h-5 w-5 shrink-0 rounded-full flex items-center justify-center mt-0.5" style={{ background: `${isDark ? "#ef4444" : "#dc2626"}22`, color: "#ef4444" }}>✕</div>
                  <div style={{ color: muted }}>{item}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features / o que você recebe */}
      {(page.features?.length || 0) > 0 && (
        <section className="py-16 md:py-24">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12" style={{ color: text }}>O que você vai receber</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {page.features.map((f, i) => {
                const Icon = ICONS[f.icon || "sparkles"] || Sparkles;
                return (
                  <div key={i} className="p-6 rounded-2xl" style={{ background: surface, border: `1px solid ${border}` }}>
                    <div className="h-11 w-11 rounded-lg flex items-center justify-center mb-4" style={{ background: `${primary}22` }}>
                      <Icon className="h-5 w-5" style={{ color: primary }} />
                    </div>
                    <div className="font-bold mb-1" style={{ color: text }}>{f.title}</div>
                    {f.text && <p className="text-sm leading-relaxed" style={{ color: muted }}>{f.text}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Agenda */}
      {(page.agenda?.length || 0) > 0 && (
        <section className="py-16 md:py-20" style={{ background: surface, borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}` }}>
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-10" style={{ color: text }}>Programação</h2>
            <div className="space-y-3">
              {page.agenda!.map((a, i) => (
                <div key={i} className="grid grid-cols-[80px_1fr] gap-4 p-5 rounded-xl" style={{ background: surfaceStrong, border: `1px solid ${border}` }}>
                  <div className="font-bold" style={{ color: primary }}>{a.time || `#${i + 1}`}</div>
                  <div>
                    <div className="font-bold" style={{ color: text }}>{a.title}</div>
                    {a.text && <div className="text-sm mt-1" style={{ color: muted }}>{a.text}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sobre o mentor / Palestrantes */}
      {(() => {
        const about = page.about;
        if (!about) return null;
        const people = about.people && about.people.length > 0
          ? about.people
          : (about.name || about.bio || about.role || about.photoUrl)
            ? [{ name: about.name, role: about.role, bio: about.bio, photoUrl: about.photoUrl }]
            : [];
        if (people.length === 0) return null;
        const sectionTitle = about.sectionTitle || (people.length > 1 ? "Palestrantes" : "Sobre");
        const cols = Math.max(1, Math.min(4, about.columns || (people.length > 1 ? Math.min(people.length, 3) : 1)));
        const gridCols: Record<number, string> = {
          1: "md:grid-cols-1",
          2: "md:grid-cols-2",
          3: "md:grid-cols-3",
          4: "md:grid-cols-4",
        };

        // Layout single = hero style; múltiplos = grid de cards
        if (people.length === 1) {
          const p = people[0];
          return (
            <section className="py-16 md:py-24">
              <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[240px_1fr] gap-10 items-center">
                {p.photoUrl ? (
                  <img src={p.photoUrl} alt={p.name || ""} className="w-full aspect-square object-cover rounded-2xl" />
                ) : (
                  <div className="w-full aspect-square rounded-2xl flex items-center justify-center" style={{ background: surface }}>
                    <Users className="h-16 w-16" style={{ color: primary }} />
                  </div>
                )}
                <div>
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: soft }}>{sectionTitle}</div>
                  <h2 className="font-display text-3xl md:text-4xl font-bold mb-1" style={{ color: text }}>{p.name || mentor.brandName}</h2>
                  {p.role && <div className="text-lg mb-4" style={{ color: accent }}>{p.role}</div>}
                  {p.bio && <p className="text-base leading-relaxed whitespace-pre-line" style={{ color: muted }}>{p.bio}</p>}
                </div>
              </div>
            </section>
          );
        }

        return (
          <section className="py-16 md:py-24">
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-xs uppercase tracking-widest mb-3 text-center" style={{ color: soft }}>{sectionTitle}</div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-10 text-center" style={{ color: text }}>Quem ministra</h2>
              <div className={`grid grid-cols-1 ${gridCols[cols]} gap-6`}>
                {people.map((p, i) => (
                  <div key={i} className="rounded-2xl p-6 flex flex-col items-center text-center" style={{ background: surface }}>
                    {p.photoUrl ? (
                      <img src={p.photoUrl} alt={p.name || ""} className="w-32 h-32 object-cover rounded-full mb-4" />
                    ) : (
                      <div className="w-32 h-32 rounded-full flex items-center justify-center mb-4" style={{ background: primary + "22" }}>
                        <Users className="h-10 w-10" style={{ color: primary }} />
                      </div>
                    )}
                    {p.name && <div className="font-display text-xl font-bold" style={{ color: text }}>{p.name}</div>}
                    {p.role && <div className="text-sm mb-3 mt-1" style={{ color: accent }}>{p.role}</div>}
                    {p.bio && <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: muted }}>{p.bio}</p>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })()}

      {/* Urgência + Oferta / Preço */}
      <section className="py-20 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${primary}22, ${accent}11)` }}>
        <div className="max-w-3xl mx-auto px-6 text-center relative">
          {page.urgencyText && (
            <div className="inline-block mb-6 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider" style={{ background: primary, color: isDark ? "#0a0a0a" : "#fff" }}>
              ⚡ {page.urgencyText}
            </div>
          )}
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4" style={{ color: text }}>{page.title}</h2>
          <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
            {page.originalPriceCents ? (
              <span className="line-through text-lg" style={{ color: soft }}>{money(page.originalPriceCents)}</span>
            ) : null}
            <span className="font-display text-4xl md:text-5xl font-bold" style={{ color: accent }}>{money(page.priceCents)}</span>
            {page.maxInstallments > 1 && (
              <span className="text-sm" style={{ color: muted }}>
                ou {installmentText(page)}
              </span>
            )}
          </div>
          {(page.badges?.length || 0) > 0 && (
            <div className="flex justify-center flex-wrap gap-2 mb-8">
              {page.badges.map((b, i) => (
                <span key={i} className="text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1"
                  style={{ background: `${primary}1a`, color: accent, border: `1px solid ${primary}44` }}>
                  <CheckCircle2 className="h-3 w-3" /> {b}
                </span>
              ))}
            </div>
          )}
          <CtaBtn />
          {page.guaranteeText && (
            <div className="mt-5 flex items-center justify-center gap-2 text-sm" style={{ color: muted }}>
              <ShieldCheck className="h-4 w-4" style={{ color: primary }} /> {page.guaranteeText}
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      {(page.faqs?.length || 0) > 0 && (
        <section className="py-16 md:py-20">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-center font-display text-3xl md:text-4xl font-bold mb-8" style={{ color: text }}>Perguntas frequentes</h2>
            <Accordion type="single" collapsible className="space-y-2">
              {page.faqs.map((f, i) => (
                <AccordionItem key={i} value={`f-${i}`} className="rounded-lg px-4"
                  style={{ background: surface, border: `1px solid ${border}` }}>
                  <AccordionTrigger className="text-left font-semibold py-4" style={{ color: text }}>{f.q}</AccordionTrigger>
                  <AccordionContent className="pb-4" style={{ color: muted }}>{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      )}

      <footer className="py-8 text-center text-xs" style={{ borderTop: `1px solid ${border}`, color: soft }}>
        © {new Date().getFullYear()} {mentor.brandName || "Mentoria"} — Compra segura processada por Asaas.
      </footer>

      <CheckoutDialog open={checkoutOpen} onClose={() => setCheckoutOpen(false)} mentorSlug={mentorSlug} pageSlug={pageSlug} page={page} />
    </div>
  );
}

// ================= IMMERSION (evento presencial — estrutura estilo "Alavanca IA") =================
function ImmersionLayout({
  mentor, page, colors, onCta, mentorSlug, pageSlug, checkoutOpen, setCheckoutOpen,
}: {
  mentor: Payload["mentor"];
  page: Payload["page"];
  colors: { primary: string; accent: string; bg: string; text: string; muted: string; soft: string; border: string; isDark: boolean };
  onCta: () => void;
  mentorSlug: string;
  pageSlug: string;
  checkoutOpen: boolean;
  setCheckoutOpen: (o: boolean) => void;
}) {
  const { primary, accent, bg, text, muted, soft, border, isDark } = colors;
  const surface = isDark ? "rgba(255,255,255,0.04)" : "rgba(10,10,10,0.03)";
  const surfaceStrong = isDark ? "rgba(255,255,255,0.07)" : "rgba(10,10,10,0.05)";
  const cardBg = isDark ? "rgba(255,255,255,0.03)" : "#ffffff";

  const Cta = ({ label, size = "lg" }: { label?: string; size?: "lg" | "default" }) => (
    <Button
      size={size}
      onClick={onCta}
      className="font-bold border-0 uppercase tracking-wide transition-transform hover:-translate-y-0.5"
      style={{
        background: `linear-gradient(90deg, ${primary}, ${accent})`,
        color: isDark ? "#0a0a0a" : "#ffffff",
        height: size === "lg" ? 60 : 46,
        paddingInline: 36,
        boxShadow: `0 20px 40px -12px ${primary}80`,
      }}
    >
      {label || page.ctaText}
    </Button>
  );

  const infoItems = [
    page.eventInfo?.date && { icon: Calendar, label: page.eventInfo.date },
    page.eventInfo?.time && { icon: Clock, label: page.eventInfo.time },
    page.eventInfo?.location && { icon: MapPin, label: page.eventInfo.location },
    page.eventInfo?.extra && { icon: UserCheck, label: page.eventInfo.extra },
  ].filter(Boolean) as { icon: any; label: string }[];

  const videoEmbed = page.videoUrl
    ? page.videoUrl.replace("watch?v=", "embed/").replace("youtu.be/", "www.youtube.com/embed/")
    : null;

  const titleSizeMap: Record<string, string> = {
    sm: "text-3xl md:text-4xl",
    md: "text-4xl md:text-5xl",
    lg: "text-4xl md:text-5xl lg:text-6xl",
    xl: "text-5xl md:text-6xl lg:text-7xl",
  };
  const titleSizeClass = titleSizeMap[page.theme?.titleSize || "lg"];
  const titleColor = page.theme?.titleColor || text;
  const highlightColor = page.theme?.highlightColor || primary;

  return (
    <div style={{ background: bg, color: text }} className="min-h-screen">
      {/* Header */}
      <header
        className="sticky top-0 z-40 backdrop-blur"
        style={{ background: `${bg}cc`, borderBottom: `1px solid ${border}` }}
      >
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {(page.theme?.logoUrl || mentor.brandLogoUrl) ? (
              <img
                src={(page.theme?.logoUrl || mentor.brandLogoUrl)}
                alt={mentor.brandName || ""}
                className="h-12 md:h-14 w-auto object-contain"
                style={{ filter: `drop-shadow(0 0 12px ${primary}55)` }}
              />
            ) : (
              <div className="font-display font-black text-xl md:text-2xl truncate" style={{ color: text }}>
                {mentor.brandName || page.title || "Mentoria"}
              </div>
            )}
          </div>
          <Cta size="default" />
        </div>
      </header>

      {page.countdown?.enabled && page.countdown?.endsAt && (
        <CountdownBar
          endsAt={page.countdown.endsAt}
          label={page.countdown.label}
          primary={primary}
          accent={accent}
          hideWhenExpired={page.countdown.hideWhenExpired}
        />
      )}

      {/* HERO — texto à esquerda, vídeo/imagem à direita */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(60% 60% at 85% 30%, ${primary}22 0%, ${primary}0a 40%, transparent 75%)` }}
        />
        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-24 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            {(page.theme?.logoUrl || mentor.brandLogoUrl) && (
              <img src={(page.theme?.logoUrl || mentor.brandLogoUrl)} alt="" className="h-10 w-auto object-contain mb-8 opacity-95" />
            )}
            <h1
              className={`font-display font-black leading-[1.05] tracking-tight mb-6 ${titleSizeClass}`}
              style={{ color: titleColor }}
              dangerouslySetInnerHTML={{
                __html: (page.headline || page.title).replace(
                  /(Inteligência Artificial|IA|prática|multiplique|multiplicar|acelerar|transformar|dominar)/gi,
                  (m) => `<span style="color:${highlightColor}">${m}</span>`
                ),
              }}
            />
            {page.subheadline && (
              <p className="text-base md:text-lg mb-4 leading-relaxed" style={{ color: muted }}>
                {page.subheadline}
              </p>
            )}
            {page.description && (
              <p className="text-base md:text-lg mb-8 leading-relaxed whitespace-pre-line" style={{ color: muted }}>
                {page.description}
              </p>
            )}
            <Cta />
            {page.guaranteeText && (
              <div className="mt-5 flex items-center gap-2 text-sm" style={{ color: muted }}>
                <ShieldCheck className="h-4 w-4" style={{ color: primary }} /> {page.guaranteeText}
              </div>
            )}
          </div>

          <div className="relative">
            {page.videoUrl ? (
              <VideoPlayer src={page.videoUrl} primary={primary} poster={page.heroImageUrl} />
            ) : page.heroImageUrl ? (
              <div
                className="rounded-2xl overflow-hidden aspect-video"
                style={{ boxShadow: `0 40px 100px -20px ${primary}66` }}
              >
                <img src={page.heroImageUrl} alt={page.title} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div
                className="aspect-video rounded-2xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${primary}22, transparent)`, boxShadow: `0 40px 100px -20px ${primary}55` }}
              >
                <PlayCircle className="h-20 w-20" style={{ color: primary, opacity: 0.6 }} />
              </div>
            )}
            <div className="mt-4 flex items-center gap-2 text-sm" style={{ color: muted }}>
              <PlayCircle className="h-4 w-4" style={{ color: primary }} />
              <span>Assista ao vídeo e entenda como funciona.</span>
            </div>
          </div>
        </div>

        {/* Barra de informações do evento */}
        {infoItems.length > 0 && (
          <div className="max-w-6xl mx-auto px-6 pb-10">
            <div
              className="rounded-2xl p-5 md:p-6 grid gap-4"
              style={{
                background: surface,
                border: `1px solid ${border}`,
                gridTemplateColumns: `repeat(${Math.min(infoItems.length, 4)}, minmax(0,1fr))`,
              }}
            >
              {infoItems.map((it, i) => (
                <div key={i} className={`flex items-center gap-3 ${i > 0 ? "md:pl-4 md:border-l" : ""}`} style={i > 0 ? { borderColor: border } : {}}>
                  <div className="h-11 w-11 shrink-0 rounded-full flex items-center justify-center" style={{ background: `${primary}1a`, color: primary }}>
                    <it.icon className="h-5 w-5" />
                  </div>
                  <div className="font-semibold text-sm md:text-base leading-tight" style={{ color: text }}>{it.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {page.urgencyText && (
          <div className="max-w-6xl mx-auto px-6 pb-10">
            <div className="flex items-center gap-2 text-sm md:text-base" style={{ color: text }}>
              <AlertCircle className="h-5 w-5" style={{ color: primary }} />
              <span className="font-semibold" style={{ color: primary }}>Aviso importante:</span>
              <span style={{ color: muted }}>{page.urgencyText}</span>
            </div>
          </div>
        )}
      </section>

      {/* PRA VOCÊ / NÃO É PRA VOCÊ — lado a lado */}
      {((page.forWho?.length || 0) > 0 || (page.notForWho?.length || 0) > 0) && (
        <section className="py-16 md:py-20" style={{ borderTop: `1px solid ${border}` }}>
          <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-6">
            {(page.forWho?.length || 0) > 0 && (
              <div className="rounded-2xl p-8" style={{ background: surface, border: `1px solid ${border}` }}>
                <div className="text-sm uppercase tracking-widest mb-2" style={{ color: soft }}>Esse evento</div>
                <h2 className="font-display text-2xl md:text-3xl font-bold mb-6" style={{ color: text }}>
                  <span style={{ color: primary }}>Foi feito pra você se…</span>
                </h2>
                <ul className="space-y-4">
                  {page.forWho!.map((it, i) => (
                    <li key={i} className="flex gap-3">
                      <CheckCircle2 className="h-5 w-5 shrink-0 mt-1" style={{ color: primary }} />
                      <span style={{ color: muted }}>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(page.notForWho?.length || 0) > 0 && (
              <div className="rounded-2xl p-8" style={{ background: surface, border: `1px solid ${border}` }}>
                <div className="text-sm uppercase tracking-widest mb-2" style={{ color: soft }}>Esse evento</div>
                <h2 className="font-display text-2xl md:text-3xl font-bold mb-6" style={{ color: text }}>
                  <span style={{ color: soft }}>Não é pra você se…</span>
                </h2>
                <ul className="space-y-4">
                  {page.notForWho!.map((it, i) => (
                    <li key={i} className="flex gap-3">
                      <XCircle className="h-5 w-5 shrink-0 mt-1" style={{ color: "#ef4444" }} />
                      <span style={{ color: muted }}>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Manifesto / frase de impacto */}
      {page.description && (
        <section className="py-16 md:py-20" style={{ background: surface, borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}` }}>
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold leading-tight" style={{ color: text }}>
              Não é sobre <span style={{ color: primary }}>aprender</span>.
              <br />É sobre <span style={{ color: primary }}>colocar em prática</span> dentro do seu negócio.
            </h2>
          </div>
        </section>
      )}

      {/* SHOWCASE — seções alternadas imagem + texto (storytelling) */}
      {(page.showcase?.length || 0) > 0 && (
        <div className="space-y-16 md:space-y-24 py-10">
          {page.showcase!.map((s, i) => {
            const imgRight = (s.side || (i % 2 === 0 ? "left" : "right")) !== "left";
            const titleSizeMap = {
              sm: "text-2xl md:text-3xl",
              md: "text-3xl md:text-4xl",
              lg: "text-4xl md:text-6xl",
              xl: "text-5xl md:text-7xl",
            } as const;
            const textSizeMap = {
              sm: "text-sm md:text-base",
              md: "text-base md:text-lg",
              lg: "text-lg md:text-xl",
              xl: "text-xl md:text-2xl",
            } as const;
            const titleCls = titleSizeMap[s.titleSize || "lg"];
            const textCls = textSizeMap[s.textSize || "md"];
            const titleC = s.titleColor || text;
            const textC = s.textColor || muted;

            const textBlock = (
              <div className="max-w-xl">
                {s.eyebrow && (
                  <div className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ color: primary }}>
                    {s.eyebrow}
                  </div>
                )}
                {s.title && (
                  <h3 className={`font-display ${titleCls} font-bold leading-tight mb-5`} style={{ color: titleC }}>
                    {s.title}
                  </h3>
                )}
                {s.text && (
                  <p className={`${textCls} leading-relaxed whitespace-pre-line mb-4`} style={{ color: textC }}>
                    {s.text}
                  </p>
                )}
                {(s.bullets?.length || 0) > 0 && (
                  <ul className="space-y-3 mt-4">
                    {s.bullets!.map((b, j) => (
                      <li key={j} className="flex gap-3">
                        <CheckCircle2 className="h-5 w-5 shrink-0 mt-1" style={{ color: primary }} />
                        <span style={{ color: textC }}>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );

            return (
              <section
                key={i}
                className="relative w-full overflow-hidden md:min-h-[620px] md:flex md:items-center"
              >
                {/* MOBILE: imagem no topo em bloco separado (visível) */}
                {s.imageUrl && (
                  <div className="md:hidden w-full">
                    <img
                      src={s.imageUrl}
                      alt={s.title || ""}
                      className="w-full aspect-[4/3] object-cover"
                      style={{ boxShadow: `0 20px 60px -20px ${primary}66` }}
                    />
                  </div>
                )}
                {/* DESKTOP: Imagem de fundo full-bleed */}
                {s.imageUrl && (
                  <img
                    src={s.imageUrl}
                    alt={s.title || ""}
                    className="hidden md:block absolute inset-0 w-full h-full object-cover"
                    style={{ objectPosition: imgRight ? "right center" : "left center" }}
                  />
                )}
                {/* DESKTOP: Gradiente escuro do lado do texto -> transparente do lado da imagem */}
                <div
                  className="hidden md:block absolute inset-0 pointer-events-none"
                  style={{
                    background: imgRight
                      ? `linear-gradient(to right, ${bg} 0%, ${bg}f2 30%, ${bg}99 55%, transparent 85%)`
                      : `linear-gradient(to left, ${bg} 0%, ${bg}f2 30%, ${bg}99 55%, transparent 85%)`,
                  }}
                />
                {/* DESKTOP: Glow sutil na cor da marca */}
                <div
                  className="hidden md:block absolute inset-0 pointer-events-none"
                  style={{
                    background: `radial-gradient(50% 60% at ${imgRight ? "20%" : "80%"} 50%, ${primary}22 0%, transparent 70%)`,
                  }}
                />
                {/* Conteúdo de texto sobreposto */}
                <div className="relative w-full max-w-6xl mx-auto px-6 md:px-12 lg:px-20 py-10 md:py-24">
                  <div className={`max-w-xl ${imgRight ? "" : "md:ml-auto"}`}>
                    {textBlock}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* PILARES — features numeradas 01, 02, 03… */}
      {(page.features?.length || 0) > 0 && (
        <section className="py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <div className="text-sm uppercase tracking-widest mb-2" style={{ color: soft }}>Programa</div>
              <h2 className="font-display text-3xl md:text-4xl font-bold" style={{ color: text }}>
                O que você vai aplicar
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {page.features.map((f, i) => {
                const Icon = ICONS[f.icon || "sparkles"] || Sparkles;
                return (
                  <div
                    key={i}
                    className="rounded-2xl p-8 relative overflow-hidden transition-transform hover:-translate-y-1"
                    style={{ background: cardBg, border: `1px solid ${border}`, boxShadow: `0 10px 30px -12px ${primary}22` }}
                  >
                    <div
                      className="absolute -top-4 -right-4 font-display font-black opacity-10 leading-none select-none"
                      style={{ color: primary, fontSize: 140 }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="relative">
                      <div
                        className="h-14 w-14 rounded-2xl flex items-center justify-center mb-5"
                        style={{ background: `${primary}1a`, color: primary, boxShadow: `0 8px 24px -8px ${primary}66` }}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="text-xs uppercase tracking-widest mb-2" style={{ color: primary }}>
                        Pilar {String(i + 1).padStart(2, "0")}
                      </div>
                      <h3 className="font-display text-xl md:text-2xl font-bold mb-3" style={{ color: text }}>{f.title}</h3>
                      {f.text && <p className="text-sm md:text-base leading-relaxed" style={{ color: muted }}>{f.text}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* AGENDA / Metodologia */}
      {(page.agenda?.length || 0) > 0 && (
        <section className="py-16 md:py-20" style={{ background: surface, borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}` }}>
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-10">
              <h2 className="font-display text-3xl md:text-4xl font-bold" style={{ color: text }}>
                Você não vai apenas assistir. <span style={{ color: primary }}>Você vai fazer.</span>
              </h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {page.agenda!.map((a, i) => (
                <div key={i} className="rounded-xl p-6 text-center" style={{ background: cardBg, border: `1px solid ${border}` }}>
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: primary }}>{a.time || `Etapa ${i + 1}`}</div>
                  <div className="font-bold mb-2" style={{ color: text }}>{a.title}</div>
                  {a.text && <div className="text-sm leading-relaxed" style={{ color: muted }}>{a.text}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* GALERIA — grid de imagens (edições anteriores, bastidores) */}
      {(page.gallery?.length || 0) > 0 && (
        <section className="py-16 md:py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-10">
              <div className="text-xs uppercase tracking-widest mb-2" style={{ color: soft }}>Bastidores</div>
              <h2 className="font-display text-3xl md:text-4xl font-bold" style={{ color: text }}>
                Como é <span style={{ color: primary }}>por dentro</span>
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {page.gallery!.map((url, i) => (
                <div
                  key={i}
                  className={`overflow-hidden rounded-2xl ${i % 5 === 0 ? "col-span-2 row-span-2 aspect-square md:aspect-auto" : "aspect-square"}`}
                  style={{ border: `1px solid ${border}`, boxShadow: `0 20px 40px -20px ${primary}44` }}
                >
                  <img src={url} alt="" className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SOBRE — quem conduz */}
      {(() => {
        const about = page.about;
        if (!about) return null;
        const people = about.people && about.people.length > 0
          ? about.people
          : (about.name || about.bio || about.role || about.photoUrl)
            ? [{ name: about.name, role: about.role, bio: about.bio, photoUrl: about.photoUrl }]
            : [];
        if (people.length === 0) return null;
        const sectionTitle = about.sectionTitle || (people.length > 1 ? "Quem vai conduzir" : "Quem vai conduzir essa imersão");

        if (people.length === 1) {
          const p = people[0];
          return (
            <section className="py-16 md:py-24">
              <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[280px_1fr] gap-10 items-center">
                {p.photoUrl ? (
                  <img src={p.photoUrl} alt={p.name || ""} className="w-full aspect-square object-cover rounded-2xl" style={{ boxShadow: `0 40px 80px -20px ${primary}55` }} />
                ) : (
                  <div className="w-full aspect-square rounded-2xl flex items-center justify-center" style={{ background: surface }}>
                    <Users className="h-16 w-16" style={{ color: primary }} />
                  </div>
                )}
                <div>
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: soft }}>{sectionTitle}</div>
                  <h2 className="font-display text-3xl md:text-4xl font-bold mb-1" style={{ color: text }}>{p.name || mentor.brandName}</h2>
                  {p.role && <div className="text-lg mb-4" style={{ color: accent }}>{p.role}</div>}
                  {p.bio && <p className="text-base leading-relaxed whitespace-pre-line" style={{ color: muted }}>{p.bio}</p>}
                </div>
              </div>
            </section>
          );
        }

        return (
          <section className="py-16 md:py-24">
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: soft }}>{sectionTitle}</div>
              </div>
              <div className={`grid grid-cols-1 md:grid-cols-${Math.min(people.length, 3)} gap-10 md:gap-8`}>
                {people.map((p, i) => (
                  <div key={i} className="relative text-center">
                    {/* neon glow atrás do bloco */}
                    <div
                      className="absolute -inset-6 -z-10 rounded-[2rem] pointer-events-none"
                      style={{
                        background: `radial-gradient(60% 55% at 50% 30%, ${primary}33 0%, transparent 70%), radial-gradient(50% 60% at 50% 90%, ${accent}22 0%, transparent 75%)`,
                        filter: 'blur(8px)',
                      }}
                    />
                    {p.photoUrl ? (
                      <div className="relative mb-6">
                        <img
                          src={p.photoUrl}
                          alt={p.name || ""}
                          className="w-full aspect-[4/5] object-cover rounded-2xl"
                          style={{ boxShadow: `0 30px 60px -20px ${primary}66, 0 0 0 1px ${primary}22` }}
                        />
                      </div>
                    ) : (
                      <div className="w-full aspect-[4/5] rounded-2xl flex items-center justify-center mb-6" style={{ background: `${primary}18`, boxShadow: `0 30px 60px -20px ${primary}55` }}>
                        <Users className="h-14 w-14" style={{ color: primary }} />
                      </div>
                    )}
                    {p.name && <div className="font-display text-2xl font-bold" style={{ color: text }}>{p.name}</div>}
                    {p.role && <div className="text-sm mb-3 mt-1 uppercase tracking-wider" style={{ color: accent }}>{p.role}</div>}
                    {p.bio && <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: muted }}>{p.bio}</p>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })()}

      {/* INVESTIMENTO — card grande com todos os detalhes */}
      <section className="py-16 md:py-24 relative overflow-hidden" style={{ background: surface, borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}` }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(60% 60% at 50% 50%, ${primary}22 0%, transparent 70%)` }}
        />
        <div className="relative max-w-4xl mx-auto px-6">
          <div className="text-center mb-10">
            <div
              className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3 px-3 py-1 rounded-full"
              style={{ color: primary, background: `${primary}1f`, border: `1px solid ${primary}55` }}
            >
              Garanta seu acesso
            </div>
            <h2 className="font-display text-3xl md:text-5xl font-bold" style={{ color: text }}>{page.title}</h2>
            {page.subheadline && (
              <p className="mt-3 text-base md:text-lg" style={{ color: muted }}>{page.subheadline}</p>
            )}
          </div>
          <div
            className="rounded-3xl p-8 md:p-12 relative"
            style={{
              background: `linear-gradient(135deg, ${primary}2e, ${accent}14)`,
              border: `2px solid ${primary}`,
              boxShadow: `0 0 0 6px ${primary}18, 0 40px 100px -20px ${primary}88, inset 0 1px 0 ${primary}55`,
            }}
          >
            {infoItems.length > 0 && (
              <div className="grid md:grid-cols-2 gap-3 mb-8">
                {infoItems.map((it, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <it.icon className="h-5 w-5 shrink-0" style={{ color: primary }} />
                    <span className="font-semibold" style={{ color: text }}>{it.label}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="text-center border-t pt-8" style={{ borderColor: `${primary}55` }}>
              <div
                className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-4 px-3 py-1 rounded-full"
                style={{ color: text, background: primary, boxShadow: `0 0 24px ${primary}99` }}
              >
                Investimento
              </div>
              <div className="flex items-baseline justify-center gap-3 flex-wrap mb-2">
                {page.originalPriceCents ? (
                  <span className="line-through text-xl md:text-2xl font-semibold" style={{ color: muted }}>{money(page.originalPriceCents)}</span>
                ) : null}
                <span
                  className="font-display text-6xl md:text-7xl font-black leading-none"
                  style={{
                    color: text,
                    textShadow: `0 0 30px ${primary}cc, 0 0 60px ${primary}66`,
                  }}
                >
                  {money(page.priceCents)}
                </span>
              </div>
              {page.originalPriceCents && page.originalPriceCents > page.priceCents ? (
                <div className="inline-block mt-1 mb-3 px-3 py-1 rounded-full text-xs font-bold" style={{ background: `${primary}`, color: text }}>
                  Economize {money(page.originalPriceCents - page.priceCents)}
                </div>
              ) : null}
              {page.maxInstallments > 1 && (
                <div className="text-base font-medium mb-6" style={{ color: text }}>
                  à vista ou em até <span className="font-bold" style={{ color: primary }}>{installmentText(page)}</span>
                </div>
              )}

              {(page.badges?.length || 0) > 0 && (
                <div className="grid md:grid-cols-2 gap-3 my-8 text-left max-w-xl mx-auto">
                  {page.badges.map((b, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm" style={{ color: muted }}>
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: primary }} />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              )}

              <Cta />
              {page.guaranteeText && (
                <div className="mt-5 text-sm flex items-center justify-center gap-2" style={{ color: muted }}>
                  <ShieldCheck className="h-4 w-4" style={{ color: primary }} /> {page.guaranteeText}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      {(page.faqs?.length || 0) > 0 && (
        <section className="py-16 md:py-24">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-10" style={{ color: text }}>Perguntas frequentes</h2>
            <Accordion type="single" collapsible className="w-full">
              {page.faqs.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`} style={{ borderColor: border }}>
                  <AccordionTrigger className="text-left font-semibold" style={{ color: text }}>{f.q}</AccordionTrigger>
                  <AccordionContent className="whitespace-pre-line leading-relaxed" style={{ color: muted }}>{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      )}

      {/* CTA FINAL */}
      <section className="py-20 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: `radial-gradient(70% 60% at 50% 40%, ${primary}22 0%, transparent 70%)` }}
        />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-6 leading-tight" style={{ color: text }}>
            Reserve sua vaga e comece a <span style={{ color: primary }}>colocar em prática</span>.
          </h2>
          <p className="mb-8 text-base md:text-lg" style={{ color: muted }}>
            {page.eventInfo?.date && `${page.eventInfo.date} · `}
            {page.eventInfo?.location || "Vagas limitadas"}
          </p>
          <Cta />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10" style={{ borderTop: `1px solid ${border}` }}>
        <div className="max-w-6xl mx-auto px-6 text-center text-sm" style={{ color: soft }}>
          © {new Date().getFullYear()} {mentor.brandName || "Mentoria"} · Todos os direitos reservados
        </div>
      </footer>

      <CheckoutDialog open={checkoutOpen} onClose={() => setCheckoutOpen(false)} mentorSlug={mentorSlug} pageSlug={pageSlug} page={page} />
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

  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<{
    valid: boolean; code?: string; discountCents?: number; finalCents?: number; message?: string;
  } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const finalCents = coupon?.valid ? (coupon.finalCents ?? page.priceCents) : page.priceCents;

  // Cálculo de parcelamento com juros (Tabela Price). Rate=0 => sem juros.
  // Se `installmentDisplayCents` estiver definido, derivamos a taxa mensal
  // implícita a partir do valor exibido para maxInstallments, e usamos essa
  // mesma taxa para as parcelas menores. 1x sempre à vista (sem juros).
  const explicitRate = Number(page.installmentInterestRate || 0) / 100;
  const deriveRateFromDisplay = () => {
    const N = page.maxInstallments;
    const pmt = page.installmentDisplayCents || 0;
    if (!pmt || N <= 1 || finalCents <= 0) return 0;
    // se pmt*N <= pv, não há juros
    if (pmt * N <= finalCents) return 0;
    // Bisseção para achar i em (0, 5)
    let lo = 0, hi = 5;
    for (let k = 0; k < 80; k++) {
      const mid = (lo + hi) / 2;
      const calc = finalCents * (mid * Math.pow(1 + mid, N)) / (Math.pow(1 + mid, N) - 1);
      if (calc > pmt) hi = mid; else lo = mid;
    }
    return (lo + hi) / 2;
  };
  const interestRate = page.installmentDisplayCents && page.installmentDisplayCents > 0
    ? deriveRateFromDisplay()
    : explicitRate;
  const computeInstallment = (n: number) => {
    if (n <= 1 || interestRate <= 0) {
      return { perInstallment: Math.round(finalCents / n), total: finalCents, hasInterest: false };
    }
    const pv = finalCents;
    const pmt = pv * (interestRate * Math.pow(1 + interestRate, n)) / (Math.pow(1 + interestRate, n) - 1);
    const perInstallment = Math.round(pmt);
    return { perInstallment, total: perInstallment * n, hasInterest: true };
  };
  const currentInstallment = computeInstallment(installments);
  const displayTotal = method === "CREDIT_CARD" && installments > 1
    ? currentInstallment.total
    : finalCents;

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    if (!email) { toast.error("Informe o e-mail antes de aplicar o cupom"); return; }
    setValidatingCoupon(true);
    try {
      const r = await fetch(
        `${API_BASE}/public/sales-pages/${mentorSlug}/${pageSlug}/validate-coupon`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: couponCode.trim(), email }),
        },
      );
      const data = await r.json();
      setCoupon(data);
      if (data.valid) toast.success(`Cupom aplicado! -${money(data.discountCents || 0)}`);
      else toast.error(data.message || "Cupom inválido");
    } catch (e: any) {
      toast.error("Erro ao validar cupom");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const removeCoupon = () => { setCoupon(null); setCouponCode(""); };

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
      if (coupon?.valid && couponCode) body.couponCode = couponCode.trim();
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
          <DialogTitle>{step === "success" ? "Compra confirmada" : `Finalizar compra — ${money(displayTotal)}`}</DialogTitle>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-4">
            <Tabs value={method} onValueChange={(v: any) => setMethod(v)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="PIX"><QrCode className="h-4 w-4 mr-2" />PIX <span className="ml-1 text-[10px] opacity-70">sem juros</span></TabsTrigger>
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
                        {Array.from({ length: page.maxInstallments }, (_, i) => i + 1).map((n) => {
                          const inst = computeInstallment(n);
                          if (n === 1) {
                            return <option key={n} value={n}>À vista — {money(inst.perInstallment)} (sem juros)</option>;
                          }
                          return (
                            <option key={n} value={n}>
                              {n}x de {money(inst.perInstallment)}
                              {inst.hasInterest ? ` — total ${money(inst.total)} (com juros)` : " (sem juros)"}
                            </option>
                          );
                        })}
                      </select>
                      {installments > 1 && currentInstallment.hasInterest && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Juros de {(interestRate * 100).toFixed(2).replace(".", ",")}% a.m. repassados pela Asaas. Total: {money(currentInstallment.total)}.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Cupom */}
            <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
              <Label className="flex items-center gap-2 text-sm">
                <Ticket className="h-4 w-4" /> Cupom de desconto
              </Label>
              {coupon?.valid ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-600 text-sm">
                    <Check className="h-4 w-4" />
                    <span className="font-mono font-semibold">{coupon.code}</span>
                    <span className="text-muted-foreground">-{money(coupon.discountCents || 0)}</span>
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
                    type="button" variant="outline"
                    onClick={applyCoupon}
                    disabled={validatingCoupon || !couponCode.trim()}
                  >
                    {validatingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
                  </Button>
                </div>
              )}
            </div>

            {/* Resumo */}
            <div className="rounded-lg border p-3 space-y-1 text-sm bg-background/40">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{money(page.priceCents)}</span>
              </div>
              {coupon?.valid && (
                <div className="flex justify-between text-emerald-600">
                  <span>Desconto ({coupon.code})</span>
                  <span>-{money(coupon.discountCents || 0)}</span>
                </div>
              )}
              {method === "CREDIT_CARD" && installments > 1 && currentInstallment.hasInterest && (
                <div className="flex justify-between text-amber-600">
                  <span>Juros ({installments}x)</span>
                  <span>+{money(currentInstallment.total - finalCents)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-1 border-t">
                <span>Total</span>
                <span>{money(displayTotal)}</span>
              </div>
              {method === "PIX" && (
                <div className="text-xs text-emerald-600 pt-1">✓ PIX à vista — sem juros</div>
              )}
              {method === "CREDIT_CARD" && installments === 1 && (
                <div className="text-xs text-emerald-600 pt-1">✓ Cartão à vista — sem juros</div>
              )}
            </div>

            <Button onClick={submit} disabled={loading} className="w-full bg-primary hover:opacity-90">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {method === "PIX" ? "Gerar PIX" : `Pagar ${money(displayTotal)}`}
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