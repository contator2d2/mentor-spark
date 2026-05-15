 import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { api, setToken, getToken } from "@/lib/api";
import { useBranding } from "./BrandingContext";

 export type Role = "super_admin" | "mentor" | "mentor_team" | "mentorado" | "prospect" | "admin" | "editor" | "attendant";

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
  parentMentorId?: string;
  teamRole?: "admin" | "editor" | "attendant" | string;
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
   staffMentor: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<SessionUser>;
  logout: () => void;
  signupMentor: (data: { name: string; email: string; password: string; brandName?: string }) => Promise<{ access_token?: string; user?: SessionUser; message?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

 export function AuthProvider({ children }: { children: ReactNode }) {
   const [user, setUser] = useState<SessionUser | null>(null);
   const [staffMentor, setStaffMentor] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
   const { setBrand, refreshFromHost } = useBranding();

  function applyUserBrand(u: SessionUser) {
    // Mentor/Super Admin → branding próprio.
    // Mentorado/Prospect/Equipe → tenantBrand do mentor dono.
    if (u.role === "mentorado" || u.role === "prospect" || u.role === "mentor_team") {
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
         parentMentorId: u.parentMentorId,
         teamRole: u.teamRole,
         mustChangePassword: u.mustChangePassword,
         tenantBrand: u.tenantBrand,
       };
        // Se o usuário for staff (admin/editor/attendant), buscamos o mentor dono
        if (sess.role === "mentor_team" && sess.mentorId) {
          try {
            const mentorData = await api<any>(`/public/mentor-by-id/${sess.mentorId}`, { auth: false });
            if (mentorData) {
              const mentorInfo = {
                id: mentorData.id,
                email: "", // não exposto publicamente por segurança
                name: mentorData.name,
                role: "mentor",
                slug: mentorData.slug,
                brandName: mentorData.brandName,
                brandLogoUrl: mentorData.brandLogoUrl,
                brandPrimaryColor: mentorData.brandPrimaryColor,
                brandAccentColor: mentorData.brandAccentColor,
                customDomain: mentorData.customDomain
              } as SessionUser;
              setStaffMentor(mentorInfo);
              
              // Membros de equipe devem usar o branding do mentor (tenant)
              setBrand({
                brandName: mentorInfo.brandName,
                brandLogoUrl: mentorInfo.brandLogoUrl,
                brandPrimaryColor: mentorInfo.brandPrimaryColor,
                brandAccentColor: mentorInfo.brandAccentColor,
                slug: mentorInfo.slug,
              });
            }
          } catch (e) {
            console.error("Erro ao buscar mentor do staff:", e);
          }
        } else {
          setStaffMentor(null);
        }

        setUser(sess);
 
       // Se o mentor tem um domínio customizado configurado, forçamos o refresh do branding
       // para garantir que as variáveis CSS e logos correspondam ao que está no banco,
       // mesmo se ele estiver acessando via domínio genérico.
       if ((sess.role === "mentor" || sess.role === "super_admin") && u.customDomain) {
         await refreshFromHost(u.customDomain);
       } else {
         applyUserBrand(sess);
       }
      } catch (err: any) {
        console.error("Auth refresh failed:", err);
        // Se for 401 ou 403, desloga. Caso contrário (ex: erro de rede/servidor), 
        // mantemos o estado atual ou apenas logamos o erro para evitar tela branca.
        // Se o erro for 403 (Forbidden) e o usuário estiver logado, 
        // pode ser apenas falta de permissão em um endpoint específico (como admin de outro mentor).
        // Não devemos deslogar o usuário imediatamente se ele já tem uma sessão,
        // apenas se for 401 (Não autorizado) ou se não houver usuário.
        const isUnauthorized = err.message?.includes("401") || 
                             err.message?.toLowerCase().includes("unauthorized") || 
                             err.message?.toLowerCase().includes("não autorizado");
        const isForbidden = err.message?.includes("403") ||
                          err.message?.toLowerCase().includes("forbidden") ||
                          err.message?.toLowerCase().includes("sem permissão");

        // IMPORTANTE: Se o erro for 403 e já temos um usuário carregado, NÃO deslogamos.
        // Isso acontece frequentemente quando um usuário tenta acessar recursos de outro mentor
        // (transição de abas ou links antigos) mas sua sessão em si é válida.
        // Apenas deslogamos se for 401 (token expirado) ou se não conseguimos carregar o usuário inicial.
        if (isUnauthorized || (isForbidden && !user)) {
          setToken(null);
          setUser(null);
          setStaffMentor(null);
        } else if (isForbidden && user) {
          console.warn("Acesso negado a um recurso, mas mantendo sessão ativa.");
        }
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
    <AuthContext.Provider value={{ user, staffMentor, loading, login, logout, signupMentor, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
