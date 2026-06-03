 import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
 import { api } from "@/lib/api";

export interface TenantBrand {
  id?: string;
  slug?: string;
  brandName?: string;
  brandLogoUrl?: string;
  brandBannerUrl?: string;
  brandMobileBannerUrl?: string;
  brandPrimaryColor?: string; // hex (#1e3a8a) ou HSL "222 47% 18%"
  brandAccentColor?: string;
}

interface BrandingContextValue {
  brand: TenantBrand | null;
  setBrand: (b: TenantBrand | null) => void;
   refreshFromHost: (forceHost?: string) => Promise<void>;
  loading: boolean;
}

const BrandingContext = createContext<BrandingContextValue | null>(null);

const DEFAULT_BRAND: TenantBrand = { brandName: "Mentor Glee-go", slug: "" };

/** Converte hex -> "h s% l%" para CSS variable */
function hexToHslVar(hex: string): string | null {
  const m = hex.replace("#", "").match(/^([0-9a-f]{6}|[0-9a-f]{3})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hh = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hh = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hh = (b - r) / d + 2; break;
      case b: hh = (r - g) / d + 4; break;
    }
    hh /= 6;
  }
  return `${Math.round(hh * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function normalizeColor(c?: string): string | null {
  if (!c) return null;
  if (c.startsWith("#")) return hexToHslVar(c);
  // já está em "h s% l%"
  if (/^\d+\s+\d+%\s+\d+%/.test(c)) return c;
  return null;
}

function applyBrandToCss(brand: TenantBrand | null) {
  const root = document.documentElement;
  const primary = normalizeColor(brand?.brandPrimaryColor || undefined);
  const accent = normalizeColor(brand?.brandAccentColor || undefined);
  if (primary) {
    root.style.setProperty("--primary", primary);
    root.style.setProperty("--ring", primary);
    root.style.setProperty("--sidebar-background", primary);
  } else {
    root.style.removeProperty("--primary");
    root.style.removeProperty("--ring");
    root.style.removeProperty("--sidebar-background");
  }
  if (accent) {
    root.style.setProperty("--accent", accent);
    root.style.setProperty("--sidebar-primary", accent);
  } else {
    root.style.removeProperty("--accent");
    root.style.removeProperty("--sidebar-primary");
  }
  if (brand?.brandName) document.title = brand.brandName;
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [brand, setBrandState] = useState<TenantBrand | null>(null);
  const [loading, setLoading] = useState(true);

  const setBrand = useCallback(
    (b: TenantBrand | null) => {
      // Se b for null, tentamos manter o slug atual se ele veio do host
      // para não perder o branding white-label no logout
      const merged = b ? { ...DEFAULT_BRAND, ...b } : DEFAULT_BRAND;
      setBrandState(merged);
      applyBrandToCss(merged);
    },
    []
  );

   const refreshFromHost = useCallback(async (forceHost?: string) => {
     setLoading(true);
     try {
       const host = (forceHost || window.location.hostname).toLowerCase();
       
       // Tenta primeiro o host exato
       let data = await api<TenantBrand | null>(
         `/public/tenant-by-host?host=${encodeURIComponent(host)}`,
         { auth: false }
       );

       // Se não encontrou e tem prefixo comum, tenta sem o prefixo
       if (!data && (host.startsWith('app.') || host.startsWith('portal.'))) {
         const fallbackHost = host.replace(/^(app|portal)\./, '');
         data = await api<TenantBrand | null>(
           `/public/tenant-by-host?host=${encodeURIComponent(fallbackHost)}`,
           { auth: false }
         );
       }

       if (data && (data.brandName || data.slug)) {
         setBrand(data);
       } else {
         // Se chegamos aqui e não temos dados, garantimos que o brand resete para o default
         // mas mantemos o loading false para o app prosseguir
         setBrand(null);
       }
     } catch (err) {
       console.error("Erro ao carregar branding do host:", err);
       setBrand(null);
     } finally {
       setLoading(false);
     }
   }, [setBrand]);

  // Bootstrap: tenta resolver tenant por host antes de qualquer login
  useEffect(() => {
    refreshFromHost();
  }, [refreshFromHost]);

  return (
    <BrandingContext.Provider value={{ brand: brand || DEFAULT_BRAND, setBrand, refreshFromHost, loading }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error("useBranding must be inside BrandingProvider");
  return ctx;
}
