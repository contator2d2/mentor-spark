import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, setToken, getToken } from "@/lib/api";

export type Role = "super_admin" | "mentor" | "mentorado" | "prospect";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  slug?: string;
  brandName?: string;
  mentorId?: string;
}

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<SessionUser>;
  logout: () => void;
  signupMentor: (data: { name: string; email: string; password: string; brandName?: string }) => Promise<{ message: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      setLoading(false);
      return;
    }
    api<SessionUser>("/me")
      .then((u) =>
        setUser({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          slug: (u as any).slug,
          brandName: (u as any).brandName,
          mentorId: (u as any).mentorId,
        }),
      )
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await api<{ access_token: string; user: SessionUser }>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  }

  function logout() {
    setToken(null);
    setUser(null);
    window.location.href = "/login";
  }

  async function signupMentor(data: { name: string; email: string; password: string; brandName?: string }) {
    return api<{ message: string }>("/auth/signup-mentor", { method: "POST", body: data, auth: false });
  }

  return <AuthContext.Provider value={{ user, loading, login, logout, signupMentor }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
