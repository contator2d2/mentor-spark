import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useBranding } from "./BrandingContext";

type Theme = "light" | "dark";
interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { brand } = useBranding();
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    
    // Prioridade 1: Configuração do Mentor (Whitelabel)
    if (brand?.brandTheme && brand.brandTheme !== "system") {
      return brand.brandTheme as Theme;
    }

    const saved = localStorage.getItem("mf-theme") as Theme | null;
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  // Atualiza tema se o mentor mudar a configuração global
  useEffect(() => {
    if (brand?.brandTheme && brand.brandTheme !== "system") {
      setThemeState(brand.brandTheme as Theme);
    }
  }, [brand?.brandTheme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    
    // Se o tema for escuro, podemos aplicar classes de destaque
    root.classList.add(theme);
    root.style.colorScheme = theme;
    localStorage.setItem("mf-theme", theme);
  }, [theme]);

  return (
    <Ctx.Provider value={{ theme, setTheme: setThemeState, toggle: () => setThemeState(t => t === "dark" ? "light" : "dark") }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTheme must be used within ThemeProvider");
  return c;
}
