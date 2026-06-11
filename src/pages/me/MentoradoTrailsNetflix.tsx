import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Lock, Play, Clock, ChevronRight, DollarSign } from "lucide-react";
import { useBranding } from "@/contexts/BrandingContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function MentoradoTrailsNetflix() {
  const navigate = useNavigate();
  const { brand } = useBranding();
  const { theme } = useTheme();
  const [trails, setTrails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessOpen, setAccessOpen] = useState<any>(null);
  const [accessMsg, setAccessMsg] = useState("");

  function load() {
    api<any[]>("/trails")
      .then(setTrails)
      .catch(() => setTrails([]))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function requestAccess(trail: any) {
    try {
      const r: any = await api(`/trail-access/trails/${trail.id}/request`, {
        method: "POST",
        body: { message: accessMsg },
      });
      if (r?.chargeId) {
        toast.success("Cobrança gerada! Verifique seu Financeiro.");
      } else {
        toast.success("Solicitação enviada ao mentor!");
      }
      setAccessOpen(null);
      setAccessMsg("");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function handleCardClick(t: any) {
    if (t.locked) {
      setAccessOpen(t);
    } else {
      navigate(`/me/trails/${t.id}`);
    }
  }

  useEffect(() => {
    // placeholder: keep effect parity
  }, []);

  const continueWatching = trails.filter((t) => !t.locked && (t.completedLessons || 0) > 0 && !t.allDone);
  const novidades = trails.filter((t) => !t.locked && (t.completedLessons || 0) === 0);
  const categories = [
    { title: "Continue assistindo", items: continueWatching },
    { title: "Novidades para você", items: novidades },
    { title: "Todos os cursos", items: trails },
  ].filter((c) => c.items.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Clock className="animate-spin h-6 w-6 text-primary" />
      </div>
    );
  }

  const desktopBanner =
    (theme === "dark"
      ? brand?.brandDarkBannerUrl || brand?.brandBannerUrl || brand?.brandMobileBannerUrl
      : brand?.brandBannerUrl || brand?.brandMobileBannerUrl || brand?.brandDarkBannerUrl) || null;
  const mobileBanner = brand?.brandMobileBannerUrl || desktopBanner;

  return (
    <div className="space-y-10 pb-10">
      {/* Banner de Destaque — sempre usa branding do mentor; sem banner = gradiente da marca */}
      <div className="relative w-full rounded-2xl overflow-hidden aspect-[16/9] md:aspect-[21/7] group shadow-2xl bg-gradient-to-br from-primary/40 via-primary/20 to-accent/30">
        {desktopBanner && (
          <picture>
            <source
              media="(max-width: 768px)"
              srcSet={mobileBanner || desktopBanner}
            />
            <img
              src={desktopBanner}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              alt={brand?.brandName || "Destaque"}
            />
          </picture>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        <div className="absolute bottom-0 left-0 p-6 md:p-12 w-full">
          <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-2 drop-shadow-lg">Área de Membros</h1>
          <p className="text-sm md:text-base text-white/80 max-w-lg mb-6 drop-shadow-md">Acesse seus cursos e acelere sua evolução com conteúdos exclusivos preparados pelo seu mentor.</p>
          <div className="flex gap-3">
            <button className="bg-white text-black px-6 py-2.5 rounded-md font-bold flex items-center gap-2 hover:bg-white/90 transition-colors shadow-lg">
              <Play className="h-4 w-4 fill-current" /> Assistir agora
            </button>
          </div>
        </div>
      </div>

      {/* Linhas de Categorias */}
      {categories.map((cat, idx) => (
        <section key={idx} className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-bold font-display flex items-center gap-2">
              {cat.title}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </h2>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 scroll-smooth">
            {cat.items.map((t) => (
              <div 
                key={t.id}
                onClick={() => handleCardClick(t)}
                className="relative flex-none w-[280px] md:w-[320px] aspect-video rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:z-10 shadow-lg border border-border bg-card group"
              >
                {t.coverUrl ? (
                  <img src={t.coverUrl} className={`w-full h-full object-cover ${t.locked ? "blur-[2px] scale-105" : ""}`} alt={t.title} />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <GraduationCap className="h-12 w-12 text-primary/40" />
                  </div>
                )}

                {/* Badge de cadeado fixa no topo */}
                {t.locked && (
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-background/90 backdrop-blur border border-primary/40 px-2 py-1 rounded-full shadow-md">
                    <Lock className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-semibold text-foreground uppercase tracking-wide">
                      {t.cta?.kind === "pay" ? "Pago" : "Bloqueado"}
                    </span>
                  </div>
                )}

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                   <h3 className="text-white font-bold text-sm">{t.title}</h3>
                   <p className="text-white/70 text-[10px] line-clamp-2 mt-1">{t.locked ? (t.accessMessage || t.upgradeCallout || "Solicite acesso ao mentor") : t.description}</p>
                   <div className="mt-3 flex items-center justify-between">
                      <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-black">
                        {t.locked ? <Lock className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
                      </div>
                      <Badge variant="secondary" className="bg-primary text-white text-[9px]">
                        {t.locked ? (t.cta?.kind === "pay" ? "Desbloquear" : "Solicitar") : "Acessar"}
                      </Badge>
                   </div>
                </div>
              </div>
            ))}
            {cat.items.length === 0 && (
              <div className="w-[300px] flex-none py-10 text-center text-muted-foreground text-sm border border-dashed rounded-lg">
                Nenhum item nesta categoria.
              </div>
            )}
          </div>
        </section>
      ))}

      {/* Modal de upgrade/solicitação */}
      <Dialog open={!!accessOpen} onOpenChange={(o) => { if (!o) { setAccessOpen(null); setAccessMsg(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              {accessOpen?.cta?.kind === "pay" ? "Desbloquear curso" : "Solicitar acesso"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="font-semibold">{accessOpen?.title}</div>
            <div className="text-sm text-muted-foreground">
              {accessOpen?.accessMessage || accessOpen?.upgradeCallout || "Este curso ainda não está liberado para você."}
            </div>
            {accessOpen?.cta?.kind === "pay" && (
              <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Será gerada uma cobrança PIX no valor de <strong>R$ {((accessOpen.priceCents || 0) / 100).toFixed(2).replace(".", ",")}</strong>.
              </div>
            )}
            {accessOpen?.cta?.kind === "wait" && (
              <div className="rounded-lg bg-muted p-3 text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" /> {accessOpen.cta.label}
              </div>
            )}
            {accessOpen?.cta?.kind !== "wait" && (
              <div>
                <label className="text-xs text-muted-foreground">Mensagem ao mentor (opcional)</label>
                <Textarea value={accessMsg} onChange={(e) => setAccessMsg(e.target.value)} placeholder="Por que você quer esse curso?" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAccessOpen(null)}>Cancelar</Button>
            {accessOpen?.cta?.kind !== "wait" && (
              <Button onClick={() => requestAccess(accessOpen)} disabled={!!accessOpen?.cta?.pendingRequestId}>
                {accessOpen?.cta?.pendingRequestId
                  ? "Solicitação já enviada"
                  : accessOpen?.cta?.kind === "pay"
                  ? "Gerar cobrança PIX"
                  : "Enviar solicitação"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
