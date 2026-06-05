import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Lock, Play, Clock, ChevronRight } from "lucide-react";
import { useBranding } from "@/contexts/BrandingContext";
import { useTheme } from "@/contexts/ThemeContext";

export default function MentoradoTrailsNetflix() {
  const navigate = useNavigate();
  const { brand } = useBranding();
  const { theme } = useTheme();
  const [trails, setTrails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<any[]>("/trails")
      .then(setTrails)
      .catch(() => setTrails([]))
      .finally(() => setLoading(false));
  }, []);

  const categories = [
    { title: "Minhas Aulas", items: trails.filter(t => !t.locked) },
    { title: "Bloqueios & Cadeados", items: trails.filter(t => t.locked) },
    { title: "Explorar Trilhas", items: trails }
  ];

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
          <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-2 drop-shadow-lg">Sua Próxima Aula</h1>
          <p className="text-sm md:text-base text-white/80 max-w-lg mb-6 drop-shadow-md">Acesse suas trilhas e acelere sua evolução com conteúdos exclusivos preparados pelo seu mentor.</p>
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
                onClick={() => !t.locked && navigate(`/me/trails/${t.id}`)}
                className="relative flex-none w-[280px] md:w-[320px] aspect-video rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:z-10 shadow-lg border border-border bg-card group"
              >
                {t.coverUrl ? (
                  <img src={t.coverUrl} className="w-full h-full object-cover" alt={t.title} />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <GraduationCap className="h-12 w-12 text-primary/40" />
                  </div>
                )}
                
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                   <h3 className="text-white font-bold text-sm">{t.title}</h3>
                   <p className="text-white/70 text-[10px] line-clamp-2 mt-1">{t.description}</p>
                   <div className="mt-3 flex items-center justify-between">
                      <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-black">
                        {t.locked ? <Lock className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
                      </div>
                      {!t.locked && <Badge variant="secondary" className="bg-primary text-white text-[9px]">Acessar</Badge>}
                   </div>
                </div>

                {t.locked && (
                  <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] flex items-center justify-center">
                    <div className="h-10 w-10 rounded-full bg-background/90 border border-primary/40 flex items-center justify-center">
                      <Lock className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                )}
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
    </div>
  );
}
