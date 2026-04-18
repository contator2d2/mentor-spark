// Cadastro manual completo de lead — /app/leads/novo
// Wizard multi-etapas: Pessoal → Endereço → Empresa (opcional) → Perfil → Revisão
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Check, Loader2, User, MapPin, Building2, Sparkles, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

const steps = [
  { id: 0, label: "Pessoal", icon: User },
  { id: 1, label: "Endereço", icon: MapPin },
  { id: 2, label: "Empresa", icon: Building2 },
  { id: 3, label: "Perfil", icon: Sparkles },
  { id: 4, label: "Revisão", icon: ClipboardCheck },
];

export default function LeadCreatePage() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    name: "", email: "", phone: "", cpf: "", rg: "", birthDate: "",
    addressZip: "", addressStreet: "", addressNumber: "", addressComplement: "",
    addressNeighborhood: "", addressCity: "", addressState: "",
    hasCompany: false, isPartner: false, partnerRole: "", partnerShare: "",
    company: "", companyLegalName: "", companyCnpj: "",
    companyAddressZip: "", companyAddressStreet: "", companyAddressNumber: "",
    companyAddressCity: "", companyAddressState: "",
    segment: "", employees: "", challenges: "", goals: "", revenue: "",
    sendInvite: false,
    createCompanyEntity: false,
  });

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  function next() {
    if (step === 0 && (!form.name || !form.email)) {
      toast.error("Nome e email são obrigatórios");
      return;
    }
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }
  function back() { setStep((s) => Math.max(s - 1, 0)); }

  async function submit() {
    setSaving(true);
    try {
      // 1) Cria company (se for sócio + criar entidade)
      let companyId: string | undefined;
      if (form.isPartner && form.createCompanyEntity && form.companyLegalName) {
        const c = await api<any>("/companies", {
          method: "POST",
          body: {
            legalName: form.companyLegalName,
            tradeName: form.company || undefined,
            cnpj: form.companyCnpj || undefined,
            addressZip: form.companyAddressZip,
            addressStreet: form.companyAddressStreet,
            addressNumber: form.companyAddressNumber,
            addressCity: form.companyAddressCity,
            addressState: form.companyAddressState,
            segment: form.segment,
            employees: form.employees ? Number(form.employees) : undefined,
            revenue: form.revenue ? Number(form.revenue) : undefined,
          },
        });
        companyId = c.id;
      }

      // 2) Cria o lead manual
      const payload: any = { ...form };
      delete payload.hasCompany;
      delete payload.createCompanyEntity;
      payload.companyId = companyId;
      payload.employees = payload.employees ? Number(payload.employees) : undefined;
      payload.revenue = payload.revenue ? Number(payload.revenue) : undefined;
      payload.partnerShare = payload.partnerShare ? Number(payload.partnerShare) : undefined;

      const lead = await api<any>("/leads/manual", { method: "POST", body: payload });
      toast.success("Cadastro criado com sucesso!");
      nav(`/app/leads/${lead.id}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Button variant="ghost" onClick={() => nav("/app/leads")}>
        <ArrowLeft className="h-4 w-4 mr-2" />Voltar ao funil
      </Button>

      <div>
        <h1 className="font-display text-3xl font-bold">Cadastro completo</h1>
        <p className="text-muted-foreground mt-1">Preencha os dados do mentorado. Sem necessidade de enviar link de onboarding.</p>
      </div>

      {/* Stepper */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const active = i === step;
            const done = i < step;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <button
                  onClick={() => setStep(i)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                    active ? "bg-primary text-primary-foreground" : done ? "text-emerald-400" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{s.label}</span>
                </button>
                {i < steps.length - 1 && <div className={`flex-1 h-px mx-2 ${done ? "bg-emerald-400/40" : "bg-border/40"}`} />}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        {step === 0 && (
          <>
            <h2 className="font-semibold text-lg">Dados pessoais</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Nome completo *"><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
              <Field label="Email *"><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
              <Field label="Telefone"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
              <Field label="CPF"><Input value={form.cpf} onChange={(e) => set("cpf", e.target.value)} /></Field>
              <Field label="RG"><Input value={form.rg} onChange={(e) => set("rg", e.target.value)} /></Field>
              <Field label="Nascimento"><Input type="date" value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} /></Field>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="font-semibold text-lg">Endereço residencial</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="CEP"><Input value={form.addressZip} onChange={(e) => set("addressZip", e.target.value)} /></Field>
              <Field label="Rua" className="md:col-span-2"><Input value={form.addressStreet} onChange={(e) => set("addressStreet", e.target.value)} /></Field>
              <Field label="Número"><Input value={form.addressNumber} onChange={(e) => set("addressNumber", e.target.value)} /></Field>
              <Field label="Complemento" className="md:col-span-2"><Input value={form.addressComplement} onChange={(e) => set("addressComplement", e.target.value)} /></Field>
              <Field label="Bairro"><Input value={form.addressNeighborhood} onChange={(e) => set("addressNeighborhood", e.target.value)} /></Field>
              <Field label="Cidade"><Input value={form.addressCity} onChange={(e) => set("addressCity", e.target.value)} /></Field>
              <Field label="UF"><Input value={form.addressState} onChange={(e) => set("addressState", e.target.value)} /></Field>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-semibold text-lg">Empresa</h2>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/40">
              <div>
                <div className="text-sm font-medium">É sócio de uma empresa?</div>
                <div className="text-xs text-muted-foreground">Se sim, criamos um prontuário separado para a entidade.</div>
              </div>
              <Switch checked={form.isPartner} onCheckedChange={(v) => { set("isPartner", v); set("createCompanyEntity", v); }} />
            </div>

            {form.isPartner && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Cargo na empresa"><Input value={form.partnerRole} onChange={(e) => set("partnerRole", e.target.value)} placeholder="Ex: CEO, CFO, Sócio-diretor" /></Field>
                  <Field label="% Participação"><Input type="number" value={form.partnerShare} onChange={(e) => set("partnerShare", e.target.value)} /></Field>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/40">
                  <div>
                    <div className="text-sm font-medium">Criar prontuário da empresa agora</div>
                    <div className="text-xs text-muted-foreground">Recomendado para depois adicionar outros sócios.</div>
                  </div>
                  <Switch checked={form.createCompanyEntity} onCheckedChange={(v) => set("createCompanyEntity", v)} />
                </div>
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <Field label="Nome fantasia"><Input value={form.company} onChange={(e) => set("company", e.target.value)} /></Field>
              <Field label="Razão social"><Input value={form.companyLegalName} onChange={(e) => set("companyLegalName", e.target.value)} /></Field>
              <Field label="CNPJ"><Input value={form.companyCnpj} onChange={(e) => set("companyCnpj", e.target.value)} /></Field>
              <Field label="Faturamento mensal (R$)"><Input type="number" value={form.revenue} onChange={(e) => set("revenue", e.target.value)} /></Field>
              <Field label="CEP da empresa"><Input value={form.companyAddressZip} onChange={(e) => set("companyAddressZip", e.target.value)} /></Field>
              <Field label="Rua"><Input value={form.companyAddressStreet} onChange={(e) => set("companyAddressStreet", e.target.value)} /></Field>
              <Field label="Número"><Input value={form.companyAddressNumber} onChange={(e) => set("companyAddressNumber", e.target.value)} /></Field>
              <Field label="Cidade"><Input value={form.companyAddressCity} onChange={(e) => set("companyAddressCity", e.target.value)} /></Field>
              <Field label="UF"><Input value={form.companyAddressState} onChange={(e) => set("companyAddressState", e.target.value)} /></Field>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="font-semibold text-lg">Perfil de negócio</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Segmento"><Input value={form.segment} onChange={(e) => set("segment", e.target.value)} placeholder="Ex: Saúde, Tech, Varejo" /></Field>
              <Field label="Nº de funcionários"><Input type="number" value={form.employees} onChange={(e) => set("employees", e.target.value)} /></Field>
            </div>
            <Field label="Principais desafios"><Textarea rows={3} value={form.challenges} onChange={(e) => set("challenges", e.target.value)} /></Field>
            <Field label="Objetivos com a mentoria"><Textarea rows={3} value={form.goals} onChange={(e) => set("goals", e.target.value)} /></Field>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="font-semibold text-lg">Revisão e confirmação</h2>
            <div className="space-y-3">
              <Section title="Pessoal">
                <Item k="Nome" v={form.name} /><Item k="Email" v={form.email} /><Item k="Telefone" v={form.phone} />
                <Item k="CPF" v={form.cpf} /><Item k="Nascimento" v={form.birthDate} />
              </Section>
              {form.isPartner && (
                <Section title="Sócio">
                  <Item k="Cargo" v={form.partnerRole} /><Item k="Participação" v={form.partnerShare ? `${form.partnerShare}%` : ""} />
                  <Item k="Empresa" v={form.companyLegalName || form.company} />
                  <Item k="Criar entidade" v={form.createCompanyEntity ? "Sim" : "Não"} />
                </Section>
              )}
              {form.segment && (
                <Section title="Negócio">
                  <Item k="Segmento" v={form.segment} /><Item k="Funcionários" v={form.employees} />
                  <Item k="Faturamento" v={form.revenue ? `R$ ${form.revenue}` : ""} />
                </Section>
              )}
            </div>

            <div className="flex items-center justify-between p-4 mt-6 bg-primary/5 rounded-lg border border-primary/20">
              <div>
                <div className="text-sm font-medium">Enviar convite por email</div>
                <div className="text-xs text-muted-foreground">Cria login + envia senha temporária para o mentorado acessar.</div>
              </div>
              <Switch checked={form.sendInvite} onCheckedChange={(v) => set("sendInvite", v)} />
            </div>
          </>
        )}
      </Card>

      <div className="flex justify-between gap-2">
        <Button variant="outline" onClick={back} disabled={step === 0}>
          <ArrowLeft className="h-4 w-4 mr-2" />Voltar
        </Button>
        {step < steps.length - 1 ? (
          <Button onClick={next} className="bg-gradient-primary">
            Avançar<ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={saving} className="bg-emerald-500/90 hover:bg-emerald-500 text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
            Concluir cadastro
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }: any) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
function Section({ title, children }: any) {
  return (
    <div className="border border-border/40 rounded-lg p-3 bg-muted/20">
      <Badge variant="outline" className="mb-2">{title}</Badge>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-1 text-sm">{children}</div>
    </div>
  );
}
function Item({ k, v }: { k: string; v?: string | number }) {
  if (!v) return null;
  return <div className="text-sm"><span className="text-muted-foreground">{k}:</span> <b>{v}</b></div>;
}
