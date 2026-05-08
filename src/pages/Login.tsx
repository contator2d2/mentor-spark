import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useBranding } from "@/contexts/BrandingContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Login() {
  const { brand } = useBranding();
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Bem-vindo, ${u.name}`);
      if (u.mustChangePassword) {
        nav("/trocar-senha");
      } else if (u.role === "prospect" || u.role === "mentorado") {
        nav("/me");
      } else {
        nav("/app");
      }
    } catch (e: any) {
      toast.error(e.message || "Falha ao entrar");
    } finally {
      setLoading(false);
    }
  }

   return (
     <div className="min-h-screen grid md:grid-cols-2 bg-background">
       <div className="hidden md:flex bg-sidebar text-sidebar-foreground p-12 flex-col justify-between relative overflow-hidden">
         <div className="absolute inset-0 bg-grid opacity-20" />
          <Link to="/" className="font-display text-2xl font-bold relative z-10">
            {brand?.brandName || "MentorFlow"}
          </Link>
         <div className="relative z-10">
           <h1 className="font-display text-4xl font-bold leading-tight mb-4">Volte para o seu espaço de mentoria.</h1>
           <p className="text-sidebar-foreground/70">Continue de onde parou. Seus mentorados aguardam.</p>
         </div>
          <div className="text-sm text-sidebar-foreground/50 relative z-10">© {new Date().getFullYear()} {brand?.brandName || "MentorFlow"}</div>
       </div>
 
       <div className="flex items-center justify-center p-6 bg-background">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
          <div>
            <h2 className="font-display text-2xl font-bold">Entrar</h2>
            <p className="text-sm text-muted-foreground mt-1">Use suas credenciais de mentor ou mentorado.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Entrar
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            É mentor e ainda não tem conta?{" "}
            <Link to="/signup" className="text-primary font-medium hover:underline">
              Solicitar acesso
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
