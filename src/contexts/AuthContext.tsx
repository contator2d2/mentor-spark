import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, setToken, getToken } from "@/lib/api";
import { useBranding } from "./BrandingContext";

 export type Role = "super_admin" | "mentor" | "mentorado" | "prospect" | "admin" | "editor" | "attendant";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  slug?: string;
  brandName?: string;
  brandLogoUrl?: string;
  brandPrimaryColor?: string;
  brandAccentColor?: string;
  onboardingCompleted?: boolean;
  mentorId?: string;
  mustChangePassword?: boolean;
  tenantBrand?: {
    brandName?: string;
    brandLogoUrl?: string;
    brandPrimaryColor?: string;
    brandAccentColor?: string;
    slug?: string;
  };
}

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<SessionUser>;
  logout: () => void;
  signupMentor: (data: { name: string; email: string; password: string; brandName?: string }) => Promise<{ access_token?: string; user?: SessionUser; message?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
   const { setBrand, refreshFromHost } = useBranding();

  function applyUserBrand(u: SessionUser) {
    // Mentor/Super Admin → branding próprio.
    // Mentorado/Prospect → tenantBrand do mentor dono.
    if (u.role === "mentorado" || u.role === "prospect") {
      if (u.tenantBrand) setBrand(u.tenantBrand);
    } else if (u.brandName || u.brandPrimaryColor) {
      setBrand({
        brandName: u.brandName,
        brandLogoUrl: u.brandLogoUrl,
        brandPrimaryColor: u.brandPrimaryColor,
        brandAccentColor: u.brandAccentColor,
        slug: u.slug,
      });
    }
  }

   const refreshUser = useCallback(async () => {
     try {
       const u = await api<any>("/me");
       const sess: SessionUser = {
         id: u.id,
         email: u.email,
         name: u.name,
         role: u.role,
         slug: u.slug,
         brandName: u.brandName,
         brandLogoUrl: u.brandLogoUrl,
         brandPrimaryColor: u.brandPrimaryColor,
         brandAccentColor: u.brandAccentColor,
         onboardingCompleted: u.onboardingCompleted,
         mentorId: u.mentorId,
         mustChangePassword: u.mustChangePassword,
         tenantBrand: u.tenantBrand,
       };
       setUser(sess);
 
       // Se o mentor tem um domínio customizado configurado, forçamos o refresh do branding
       // para garantir que as variáveis CSS e logos correspondam ao que está no banco,
       // mesmo se ele estiver acessando via domínio genérico.
       if ((sess.role === "mentor" || sess.role === "super_admin") && u.customDomain) {
         await refreshFromHost(u.customDomain);
       } else {
         applyUserBrand(sess);
       }
     } catch (err) {
       setToken(null);
       setUser(null);
     }
   }, [refreshFromHost]);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      setLoading(false);
      return;
    }
    refreshUser()
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email: string, password: string) {
    const res = await api<{ access_token: string; user: SessionUser }>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
    setToken(res.access_token);
    setUser(res.user);
    applyUserBrand(res.user);
    // Mentorado/Prospect: precisa buscar tenantBrand
    if (res.user.role === "mentorado" || res.user.role === "prospect") {
      await refreshUser();
    }
    return res.user;
  }

  const logout = () => {
    setToken(null);
    setUser(null);
    // Em vez de limpar, tentamos recarregar o branding baseado no host
    // para manter a marca do mentor no login white-label
    window.location.href = "/login";
  };

  async function signupMentor(data: { name: string; email: string; password: string; brandName?: string }) {
    const res = await api<{ access_token?: string; user?: SessionUser; message?: string }>("/auth/signup-mentor", {
      method: "POST",
      body: data,
      auth: false,
    });
    if (res.access_token && res.user) {
      setToken(res.access_token);
      setUser(res.user);
      applyUserBrand(res.user);
    }
    return res;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, signupMentor, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
