// Página pública do mentor (/c/:slug) — Cadastro + Login white-label
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useBranding } from "@/contexts/BrandingContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Eye, EyeOff, LogIn, UserPlus } from "lucide-react";

 export default function CapturePage() {
   const { slug: slugParam } = useParams();
   const { brand, setBrand } = useBranding();
   
   // O slug pode vir da URL (:slug) ou do BrandingContext (detectado pelo host)
   const slug = slugParam || brand?.slug;
  const { login } = useAuth();
  const navigate = useNavigate();

  const [mentor, setMentor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
   const [tab, setTab] = useState<"signup" | "login">("login");
  const [done, setDone] = useState(false);

  // Cadastro
  const [submitting, setSubmitting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    revenue: "",
    password: "",
    confirm: "",
  });

  // Login
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });

   useEffect(() => {
     if (!slug) {
       // Se não tem slug nem no param nem no brand, pode estar carregando ou não ser um tenant
       if (brand?.brandName === "Mentor Glee-go") setLoading(false);
       return;
     }
 
     api(`/public/mentor/${slug}`, { auth: false })
       .then((m: any) => {
         setMentor(m);
         setBrand({
           brandName: m.brandName,
           brandLogoUrl: m.brandLogoUrl,
           brandPrimaryColor: m.brandPrimaryColor,
           brandAccentColor: m.brandAccentColor,
           slug: m.slug,
         });
       })
       .catch(() => {
         if (slugParam) toast.error("Mentor não encontrado");
       })
       .finally(() => setLoading(false));
   }, [slug, slugParam, setBrand, brand?.brandName]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) return toast.error("A senha precisa ter pelo menos 8 caracteres");
    if (form.password !== form.confirm) return toast.error("As senhas não conferem");
    setSubmitting(true);
    try {
      const r = await api<{ leadId: string }>(`/public/mentor/${slug}/lead`, {
        method: "POST",
        auth: false,
        body: {
          name: form.name,
          email: form.email,
          phone: form.phone,
          company: form.company,
          revenue: form.revenue ? Number(form.revenue) : undefined,
          password: form.password,
          source: "capture-page",
        },
      });
      // Se tem teste ativo → vai pro player
      try {
        const tests = await api<any[]>(`/public/mentor/${slug}/tests`, { auth: false });
        if (tests.length > 0) {
          window.location.href = `/c/${slug}/test/${tests[0].id}?lead=${r.leadId}`;
          return;
        }
      } catch {}
      setDone(true);
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const u = await login(loginForm.email, loginForm.password);
      toast.success(`Bem-vindo, ${u.name}`);
      if (u.mustChangePassword) navigate("/trocar-senha");
      else if (u.role === "prospect" || u.role === "mentorado") navigate("/me");
      else navigate("/app");
    } catch (e: any) {
      toast.error(e.message || "Falha ao entrar");
    } finally {
      setLoginLoading(false);
    }
  }

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  if (!mentor)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="h-16 w-16 mx-auto mb-6 rounded-2xl bg-muted flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold mb-2">Portal em carregamento...</h2>
        <p className="text-muted-foreground mb-6">
          Estamos localizando as configurações da sua mentoria. Se o erro persistir, verifique se o domínio está configurado corretamente no painel.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Tentar Novamente
          </Button>
          <Button onClick={() => navigate("/login")}>
            Acesso Mentor
          </Button>
        </div>
      </div>
    );

  if (done)
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-6">
        <div className="bg-card border border-border rounded-xl p-10 max-w-md text-center shadow-elegant">
          <CheckCircle2 className="h-14 w-14 text-success mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-2">Tudo certo!</h2>
          <p className="text-muted-foreground">
            Sua conta foi criada. Entre com seu email e a <b>senha que você acabou de cadastrar</b>.
          </p>
          <Button
            className="mt-6 w-full"
            onClick={() => {
              setLoginForm({ email: form.email, password: "" });
              setTab("login");
              setDone(false);
            }}
          >
            Ir para o login
          </Button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-elegant">
        {/* Marca do mentor */}
        <div className="text-center mb-6">
          {mentor.brandLogoUrl ? (
            <img
              src={mentor.brandLogoUrl}
              alt={mentor.brandName}
              className="h-16 mx-auto mb-3 object-contain"
            />
          ) : (
            <div className="h-16 w-16 mx-auto mb-3 rounded-2xl bg-gradient-primary flex items-center justify-center text-white font-display font-bold text-2xl shadow-elegant">
              {(mentor.brandName || "M").charAt(0).toUpperCase()}
            </div>
          )}
           <h1 className="font-display text-2xl font-bold">
             {mentor.brandName}
           </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tab === "signup"
              ? "Crie sua conta para começar a jornada."
              : "Entre para acessar seus conteúdos e mentorias."}
          </p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "signup" | "login")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="signup" className="gap-1.5">
              <UserPlus className="h-3.5 w-3.5" /> Cadastrar
            </TabsTrigger>
            <TabsTrigger value="login" className="gap-1.5">
              <LogIn className="h-3.5 w-3.5" /> Entrar
            </TabsTrigger>
          </TabsList>

          {/* === CADASTRO === */}
          <TabsContent value="signup" className="mt-0">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome completo *</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Empresa</Label>
                  <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Faturamento (R$)</Label>
                  <Input type="number" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} />
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-4">
                <div className="space-y-2">
                  <Label>
                    Crie sua senha *{" "}
                    <span className="text-xs text-muted-foreground">(mín. 8 caracteres)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPwd ? "text" : "password"}
                      required
                      minLength={8}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Confirme a senha *</Label>
                  <Input
                    type={showPwd ? "text" : "password"}
                    required
                    minLength={8}
                    value={form.confirm}
                    onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar conta e começar
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Já tem conta?{" "}
                <button
                  type="button"
                  onClick={() => setTab("login")}
                  className="text-primary font-medium hover:underline"
                >
                  Entrar
                </button>
              </p>
            </form>
          </TabsContent>

          {/* === LOGIN === */}
          <TabsContent value="login" className="mt-0">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  required
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input
                  type="password"
                  required
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                />
              </div>
               <Button type="submit" className="w-full" disabled={loginLoading}>
                 {loginLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 Entrar no Portal
               </Button>
 
               <div className="pt-4 border-t border-border mt-4">
                 <p className="text-xs text-center text-muted-foreground mb-4">
                   Ainda não tem conta?{" "}
                   <button
                     type="button"
                     onClick={() => setTab("signup")}
                     className="text-primary font-medium hover:underline"
                   >
                     Cadastre-se aqui
                   </button>
                 </p>
                 
                 <div className="bg-muted/50 p-3 rounded-lg text-center">
                   <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Acesso Administrativo</p>
                   <button
                     type="button"
                     onClick={() => navigate("/admin")}
                     className="text-xs text-primary hover:underline font-medium"
                   >
                     Acessar Painel do Mentor
                   </button>
                 </div>
               </div>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
