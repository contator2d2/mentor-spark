import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, setToken, getToken } from "@/lib/api";
import { useBranding } from "./BrandingContext";

export type Role = "super_admin" | "mentor" | "mentorado" | "prospect";

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
  const { setBrand } = useBranding();

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

  async function refreshUser() {
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
      tenantBrand: u.tenantBrand,
    };
    setUser(sess);
    applyUserBrand(sess);
  }

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

  function logout() {
    setToken(null);
    setUser(null);
    setBrand(null);
    window.location.href = "/login";
  }

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
