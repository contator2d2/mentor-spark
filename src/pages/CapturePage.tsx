// Página pública de captação de leads (/c/:slug)
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useBranding } from "@/contexts/BrandingContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function CapturePage() {
  const { slug } = useParams();
  const { setBrand } = useBranding();
  const [mentor, setMentor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", revenue: "" });

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
    setSubmitting(true);
    try {
      await api(`/public/mentor/${slug}/lead`, {
        method: "POST",
        auth: false,
        body: { ...form, revenue: form.revenue ? Number(form.revenue) : undefined, source: "capture-page" },
      });
      setDone(true);
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!mentor) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Página não disponível.</div>;

  if (done)
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-6">
        <div className="bg-card border border-border rounded-xl p-10 max-w-md text-center shadow-elegant">
          <CheckCircle2 className="h-14 w-14 text-success mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-2">Tudo certo!</h2>
          <p className="text-muted-foreground">Enviamos seu acesso à plataforma por email. Verifique sua caixa de entrada (e o spam).</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-elegant">
        <div className="text-center mb-6">
          {mentor.brandLogoUrl && <img src={mentor.brandLogoUrl} alt={mentor.brandName} className="h-14 mx-auto mb-3" />}
          <h1 className="font-display text-2xl font-bold">{mentor.brandName}</h1>
          <p className="text-sm text-muted-foreground mt-1">Conte sobre você para começar sua jornada.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label>Nome completo *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-2"><Label>Email *</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="space-y-2"><Label>WhatsApp</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="space-y-2"><Label>Empresa</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
          <div className="space-y-2"><Label>Faturamento mensal (R$)</Label><Input type="number" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} /></div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar e receber acesso
          </Button>
        </form>
      </div>
    </div>
  );
}
