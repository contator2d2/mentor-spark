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
      // Limpa tokens antigos antes de tentar novo login para evitar conflitos de cache
      localStorage.removeItem("mentorflow_token");
      
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

   const logoUrl = brand?.brandLogoUrl || brand?.brandDarkLogoUrl;
   const bannerUrl = brand?.brandBannerUrl || brand?.brandDarkBannerUrl;

   return (
     <div className="min-h-screen grid md:grid-cols-2 bg-background">
       <div className="hidden md:flex bg-sidebar text-sidebar-foreground p-12 flex-col justify-between relative overflow-hidden">
         {bannerUrl ? (
           <div 
             className="absolute inset-0 bg-cover bg-center z-0" 
             style={{ backgroundImage: `url(${bannerUrl})` }}
           >
             <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
           </div>
         ) : (
           <div className="absolute inset-0 bg-grid opacity-20 z-0" />
         )}
         
         <div className="relative z-10 flex flex-col justify-between h-full">
           <Link to="/" className="flex items-center gap-2">
             {logoUrl ? (
               <img src={logoUrl} alt={brand?.brandName} className="h-10 w-auto" />
             ) : (
               <span className="font-display text-2xl font-bold">{brand?.brandName || "Mentor Glee-go"}</span>
             )}
           </Link>
           
           <div>
             <h1 className="font-display text-4xl font-bold leading-tight mb-4 drop-shadow-md">
               {brand?.brandName ? `Bem-vindo ao ${brand.brandName}` : "Volte para o seu espaço de mentoria."}
             </h1>
             <p className="text-sidebar-foreground/90 font-medium drop-shadow-sm">
               Acesse sua área exclusiva para acompanhar sua jornada de evolução.
             </p>
           </div>
           
           <div className="text-sm text-sidebar-foreground/70 drop-shadow-sm">
             © {new Date().getFullYear()} {brand?.brandName || "Mentor Glee-go"}
           </div>
         </div>
       </div>
 
       <div className="flex items-center justify-center p-6 bg-background">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
          <div className="flex flex-col items-center md:items-start space-y-4 mb-6">
            {logoUrl && (
              <img src={logoUrl} alt={brand?.brandName} className="h-16 w-auto md:hidden mb-4" />
            )}
            <div>
              <h2 className="font-display text-2xl font-bold">Entrar</h2>
              <p className="text-sm text-muted-foreground mt-1">Use suas credenciais de mentor ou mentorado.</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full py-6 text-lg font-semibold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            Acessar Sistema
          </Button>
          <p className="text-sm text-center text-muted-foreground pt-4">
            Ainda não tem acesso? Entre em contato com seu mentor.
          </p>
        </form>
      </div>
    </div>
  );
}
