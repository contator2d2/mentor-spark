import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBranding } from "@/contexts/BrandingContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export default function MentoradoLogin() {
  const { brand } = useBranding();
  const { login } = useAuth();
  const { theme } = useTheme();
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const logoUrl =
    theme === "dark"
      ? brand?.brandDarkLogoUrl || brand?.brandLogoUrl
      : brand?.brandLogoUrl || brand?.brandDarkLogoUrl;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      localStorage.removeItem("mentorflow_token");
      const u = await login(email, password);
      toast.success(`Bem-vindo, ${u.name}`);
      if (u.mustChangePassword) nav("/trocar-senha");
      else if (u.role === "prospect" || u.role === "mentorado") nav("/me");
      else nav("/app");
    } catch (err: any) {
      toast.error(err.message || "Falha ao entrar");
    } finally {
      setLoading(false);
    }
  }

  async function onForgot(e: React.FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await api("/auth/forgot-password", {
        method: "POST",
        body: { email: forgotEmail },
        auth: false,
      });
      toast.success(
        "Se o email existir, enviamos uma nova senha temporária por email e WhatsApp."
      );
      setForgotOpen(false);
      setForgotEmail("");
    } catch (err: any) {
      toast.error(err.message || "Não foi possível solicitar a redefinição");
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-background"
      style={{
        background:
          "radial-gradient(circle at 50% 0%, hsl(var(--primary) / 0.15), transparent 60%), hsl(var(--background))",
      }}
    >
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-8">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={brand?.brandName || "Logo"}
              className="h-24 w-auto mb-4 drop-shadow"
            />
          ) : (
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <span className="font-display text-3xl font-bold text-primary">
                {(brand?.brandName || "M").charAt(0)}
              </span>
            </div>
          )}
          <h1 className="font-display text-2xl md:text-3xl font-bold">
            {brand?.brandName || "Área do Mentorado"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Acesse sua área exclusiva de mentoria.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-card border rounded-2xl shadow-xl p-6 md:p-8 space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <div className="flex justify-end">
              <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Esqueci minha senha
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Recuperar senha</DialogTitle>
                    <DialogDescription>
                      Informe seu email cadastrado. Enviaremos uma nova senha
                      temporária por email e WhatsApp.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={onForgot} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">Email</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="seu@email.com"
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setForgotOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={forgotLoading}>
                        {forgotLoading && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Enviar nova senha
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full py-6 text-base font-semibold shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            Entrar
          </Button>

          <p className="text-xs text-center text-muted-foreground pt-2">
            Ainda não tem acesso? Entre em contato com seu mentor.
          </p>
        </form>

        <div className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} {brand?.brandName || "Mentoria"}
        </div>
      </div>
    </div>
  );
}