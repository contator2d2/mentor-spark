import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { MaskedInput } from "@/components/MaskedInput";

const API = (import.meta as any).env?.VITE_API_URL || "/api";

async function publicApi<T = any>(path: string, opts: RequestInit & { body?: any } = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: opts.method || "GET",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Erro");
  return data as T;
}

export default function OnboardingPublicPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [mentor, setMentor] = useState<{ name?: string; brandLogoUrl?: string }>({});
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    publicApi(`/onboarding/public/${token}`)
      .then((d: any) => {
        setMentor(d.mentor || {});
        setForm(d.lead || {});
        setCompleted(!!d.completed);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function submit() {
    setSaving(true);
    try {
      await publicApi(`/onboarding/public/${token}`, { method: "POST", body: form });
      setCompleted(true);
      toast.success("Cadastro enviado!");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="glass-card border-border/60 max-w-md text-center">
          <CardContent className="p-8 space-y-3">
            <CheckCircle2 className="h-14 w-14 text-emerald-400 mx-auto" />
            <h1 className="font-display text-2xl">Cadastro recebido!</h1>
            <p className="text-muted-foreground text-sm">
              {mentor.name || "Seu mentor"} entrará em contato em breve com o contrato.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target ? e.target.value : e });

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          {mentor.brandLogoUrl && <img src={mentor.brandLogoUrl} alt="" className="h-14 w-14 mx-auto rounded-xl object-contain" />}
          <h1 className="font-display text-3xl">Cadastro completo · <span className="text-gradient">{mentor.name}</span></h1>
          <p className="text-muted-foreground text-sm">Preencha seus dados para gerarmos seu contrato.</p>
        </div>

        <Card className="glass-card border-border/60">
          <CardContent className="p-6 space-y-6">
            <Section title="Dados pessoais" icon={Sparkles}>
              <Field label="Nome completo *"><Input value={form.name || ""} onChange={set("name")} /></Field>
              <Field label="CPF"><MaskedInput mask="000.000.000-00" value={form.cpf || ""} onAccept={(v) => setForm({ ...form, cpf: v })} /></Field>
              <Field label="RG"><Input value={form.rg || ""} onChange={set("rg")} /></Field>
              <Field label="Nascimento"><Input type="date" value={form.birthDate || ""} onChange={set("birthDate")} /></Field>
              <Field label="WhatsApp"><MaskedInput mask="(00) 00000-0000" value={form.phone || ""} onAccept={(v) => setForm({ ...form, phone: v })} /></Field>
            </Section>

            <Section title="Endereço residencial">
              <Field label="CEP"><MaskedInput mask="00000-000" value={form.addressZip || ""} onAccept={(v) => setForm({ ...form, addressZip: v })} /></Field>
              <Field label="Rua" wide><Input value={form.addressStreet || ""} onChange={set("addressStreet")} /></Field>
              <Field label="Número"><Input value={form.addressNumber || ""} onChange={set("addressNumber")} /></Field>
              <Field label="Complemento"><Input value={form.addressComplement || ""} onChange={set("addressComplement")} /></Field>
              <Field label="Bairro"><Input value={form.addressNeighborhood || ""} onChange={set("addressNeighborhood")} /></Field>
              <Field label="Cidade"><Input value={form.addressCity || ""} onChange={set("addressCity")} /></Field>
              <Field label="UF"><Input maxLength={2} value={form.addressState || ""} onChange={set("addressState")} /></Field>
            </Section>

            <Section title="Empresa">
              <Field label="Razão social" wide><Input value={form.companyLegalName || ""} onChange={set("companyLegalName")} /></Field>
              <Field label="Nome fantasia"><Input value={form.company || ""} onChange={set("company")} /></Field>
              <Field label="CNPJ"><MaskedInput mask="00.000.000/0000-00" value={form.companyCnpj || ""} onAccept={(v) => setForm({ ...form, companyCnpj: v })} /></Field>
              <Field label="CEP empresa"><MaskedInput mask="00000-000" value={form.companyAddressZip || ""} onAccept={(v) => setForm({ ...form, companyAddressZip: v })} /></Field>
              <Field label="Endereço"><Input value={form.companyAddressStreet || ""} onChange={set("companyAddressStreet")} /></Field>
              <Field label="Número"><Input value={form.companyAddressNumber || ""} onChange={set("companyAddressNumber")} /></Field>
              <Field label="Cidade"><Input value={form.companyAddressCity || ""} onChange={set("companyAddressCity")} /></Field>
              <Field label="UF"><Input maxLength={2} value={form.companyAddressState || ""} onChange={set("companyAddressState")} /></Field>
            </Section>

            <Section title="Perfil de negócio">
              <Field label="Segmento"><Input value={form.segment || ""} onChange={set("segment")} /></Field>
              <Field label="Funcionários"><Input type="number" value={form.employees || ""} onChange={set("employees")} /></Field>
              <Field label="Faturamento mensal (R$)"><Input type="number" value={form.revenue || ""} onChange={set("revenue")} /></Field>
              <Field label="Principais desafios" wide><Textarea rows={3} value={form.challenges || ""} onChange={set("challenges")} /></Field>
              <Field label="Objetivos com a mentoria" wide><Textarea rows={3} value={form.goals || ""} onChange={set("goals")} /></Field>
            </Section>

            <Button onClick={submit} disabled={saving || !form.name} className="w-full bg-gradient-primary hover:opacity-90">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enviar cadastro
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon?: any; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground/90 border-b border-border/40 pb-2">
        {Icon && <Icon className="h-4 w-4 text-primary" />} {title}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}
function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`space-y-1.5 ${wide ? "md:col-span-2" : ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
