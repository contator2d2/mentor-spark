// Página pública de captação de leads (/c/:slug)
// Lead define a própria senha no auto-cadastro.
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useBranding } from "@/contexts/BrandingContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Eye, EyeOff } from "lucide-react";

export default function CapturePage() {
  const { slug } = useParams();
  const { setBrand } = useBranding();
  const [mentor, setMentor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
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

  useEffect(() => {
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
      .catch(() => toast.error("Mentor não encontrado"))
      .finally(() => setLoading(false));
  }, [slug, setBrand]);

  async function submit(e: React.FormEvent) {
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
      // Busca testes ativos — se houver, redireciona pro primeiro com leadId
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

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  if (!mentor)
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Página não disponível.</div>;

  if (done)
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-6">
        <div className="bg-card border border-border rounded-xl p-10 max-w-md text-center shadow-elegant">
          <CheckCircle2 className="h-14 w-14 text-success mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-2">Tudo certo!</h2>
          <p className="text-muted-foreground">
            Sua conta foi criada. Use o email e a <b>senha que você acabou de cadastrar</b> para entrar na plataforma.
          </p>
          <Button className="mt-6 w-full" onClick={() => (window.location.href = "/login")}>
            Ir para o login
          </Button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-elegant">
        <div className="text-center mb-6">
          {mentor.brandLogoUrl && <img src={mentor.brandLogoUrl} alt={mentor.brandName} className="h-14 mx-auto mb-3" />}
          <h1 className="font-display text-2xl font-bold">{mentor.brandName}</h1>
          <p className="text-sm text-muted-foreground mt-1">Conte sobre você e crie seu acesso à plataforma.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
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
          <div className="space-y-2">
            <Label>Empresa</Label>
            <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Faturamento mensal (R$)</Label>
            <Input type="number" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} />
          </div>

          <div className="border-t border-border pt-4 space-y-4">
            <div className="space-y-2">
              <Label>Crie sua senha * <span className="text-xs text-muted-foreground">(mín. 8 caracteres)</span></Label>
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
        </form>
      </div>
    </div>
  );
}
