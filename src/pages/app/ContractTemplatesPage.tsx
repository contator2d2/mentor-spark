import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, FileText, Trash2, Pencil, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useBranding } from "@/contexts/BrandingContext";

interface Tpl { id: string; name: string; body: string; isActive: boolean; }

const PLACEHOLDERS = "{{nome}} {{cpf}} {{rg}} {{endereco}} {{cidade}} {{estado}} {{cep}} {{empresa}} {{cnpj}} {{empresa_endereco}} {{segmento}} {{faturamento}} {{mentor_nome}} {{mentor_marca}} {{plano_nome}} {{valor_plano}} {{data_hoje}}";

const TEMPLATE_TYPES = [
  { value: "mentoria", label: "Mentoria Empresarial" },
  { value: "consultoria", label: "Consultoria" },
  { value: "coaching", label: "Coaching" },
  { value: "prestacao_servicos", label: "Prestação de Serviços" },
  { value: "nda", label: "NDA / Confidencialidade" },
  { value: "personalizado", label: "Personalizado" },
];

const SEGMENTS = ["Varejo", "E-commerce", "SaaS / Tech", "Indústria", "Saúde", "Educação", "Serviços", "Alimentação", "Construção", "Agronegócio", "Outro"];

export default function ContractTemplatesPage() {
  const { brand } = useBranding();
  const [items, setItems] = useState<Tpl[] | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tpl | null>(null);
  const [form, setForm] = useState({ name: "", body: "", isActive: true });
  const [saving, setSaving] = useState(false);

  // AI flow
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiForm, setAiForm] = useState({
    contractType: "mentoria",
    segment: "",
    objective: "",
    durationMonths: "12",
    priceMonthly: "",
    totalPrice: "",
    paymentCondition: "mensal" as "a_vista" | "parcelado" | "mensal",
    installments: "12",
    paymentMethods: ["pix", "cartao"] as string[],
    jurisdiction: "",
    extraClauses: "",
    tone: "formal" as "formal" | "acessivel",
  });

  function togglePaymentMethod(m: string) {
    setAiForm((f) => ({
      ...f,
      paymentMethods: f.paymentMethods.includes(m)
        ? f.paymentMethods.filter((x) => x !== m)
        : [...f.paymentMethods, m],
    }));
  }

  async function load() {
    try { setItems(await api<Tpl[]>("/contracts/templates")); }
    catch (e: any) { toast.error(e.message); }
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm({ name: "", body: "", isActive: true }); setOpen(true); }
  function openEdit(t: Tpl) { setEditing(t); setForm({ name: t.name, body: t.body, isActive: t.isActive }); setOpen(true); }
  function openAi() {
    setAiForm({ contractType: "mentoria", segment: "", objective: "", durationMonths: "12", priceMonthly: "", totalPrice: "", paymentCondition: "mensal", installments: "12", paymentMethods: ["pix", "cartao"], jurisdiction: "", extraClauses: "", tone: "formal" });
    setAiOpen(true);
  }

  async function generateWithAi() {
    if (!aiForm.objective || aiForm.objective.length < 10) {
      toast.error("Descreva o objetivo do contrato (mín. 10 caracteres)");
      return;
    }
    setAiLoading(true);
    try {
      const res = await api<{ name: string; body: string }>("/contracts/templates/ai-generate", {
        method: "POST",
        body: aiForm,
      });
      setEditing(null);
      setForm({ name: res.name, body: res.body, isActive: true });
      setAiOpen(false);
      setOpen(true);
      toast.success("Contrato gerado pela IA — revise e salve");
    } catch (e: any) {
      toast.error(e.message || "Falha ao gerar contrato");
    } finally {
      setAiLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      if (editing) await api(`/contracts/templates/${editing.id}`, { method: "PATCH", body: form });
      else await api("/contracts/templates", { method: "POST", body: form });
      toast.success("Salvo"); setOpen(false); load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }
  async function remove(id: string) {
    if (!confirm("Excluir template?")) return;
    await api(`/contracts/templates/${id}`, { method: "DELETE" }); load();
  }

  if (!items) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-hero border border-border/60 p-8 md:p-10">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <Badge variant="outline" className="mb-3 border-primary/40 bg-primary/10 text-primary"><FileText className="h-3 w-3 mr-1" /> Contratos</Badge>
            <h1 className="text-4xl md:text-5xl font-display tracking-tight">Templates de <span className="text-gradient">contrato</span></h1>
            <p className="text-muted-foreground mt-2 max-w-lg">
              Gere contratos com IA personalizados ao seu segmento e objetivo. Sua logo
              {brand?.brandLogoUrl ? " será" : " (configure em Branding) será"} usada no PDF gerado.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={openAi} className="bg-gradient-primary hover:opacity-90 shadow-glow">
              <Sparkles className="mr-2 h-4 w-4" />Gerar com IA
            </Button>
            <Button onClick={openNew} variant="outline"><Plus className="mr-2 h-4 w-4" />Em branco</Button>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="glass-card border-dashed"><CardContent className="py-16 text-center text-muted-foreground">
          Nenhum template ainda. Clique em <strong>Gerar com IA</strong> para criar seu primeiro contrato em segundos.
        </CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map((t) => (
            <Card key={t.id} className="glass-card border-border/60">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="font-display font-semibold">{t.name}</div>
                  {t.isActive ? <Badge>Ativo</Badge> : <Badge variant="outline">Inativo</Badge>}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">{t.body}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(t)}><Pencil className="h-3 w-3 mr-1" />Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(t.id)} className="text-rose-400"><Trash2 className="h-3 w-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* AI Dialog */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="glass-card border-border/60 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" /> Gerar contrato com IA
            </DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo. A IA gera um contrato completo e juridicamente estruturado, e você pode editar antes de salvar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Tipo de contrato *</Label>
                <Select value={aiForm.contractType} onValueChange={(v) => setAiForm({ ...aiForm, contractType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Segmento do mentorado</Label>
                <Select value={aiForm.segment} onValueChange={(v) => setAiForm({ ...aiForm, segment: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {SEGMENTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Objetivo / escopo do serviço *</Label>
              <Textarea
                rows={3}
                placeholder="Ex: Mentoria mensal para escalar vendas B2B de R$ 100k para R$ 500k em 12 meses, com 4 calls/mês + suporte WhatsApp."
                value={aiForm.objective}
                onChange={(e) => setAiForm({ ...aiForm, objective: e.target.value })}
              />
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label>Duração (meses)</Label>
                <Input type="number" value={aiForm.durationMonths} onChange={(e) => setAiForm({ ...aiForm, durationMonths: e.target.value })} />
              </div>
              <div>
                <Label>Valor mensal (R$)</Label>
                <Input placeholder="2500.00" value={aiForm.priceMonthly} onChange={(e) => setAiForm({ ...aiForm, priceMonthly: e.target.value })} />
              </div>
              <div>
                <Label>Tom</Label>
                <Select value={aiForm.tone} onValueChange={(v: any) => setAiForm({ ...aiForm, tone: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal">Formal jurídico</SelectItem>
                    <SelectItem value="acessivel">Acessível / claro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Forma de pagamento</Label>
                <Input value={aiForm.paymentTerms} onChange={(e) => setAiForm({ ...aiForm, paymentTerms: e.target.value })} />
              </div>
              <div>
                <Label>Foro / comarca</Label>
                <Input placeholder="Ex: São Paulo - SP" value={aiForm.jurisdiction} onChange={(e) => setAiForm({ ...aiForm, jurisdiction: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Cláusulas extras (opcional)</Label>
              <Textarea
                rows={2}
                placeholder="Ex: Cláusula de não-concorrência por 12 meses, multa rescisória de 30% do valor restante."
                value={aiForm.extraClauses}
                onChange={(e) => setAiForm({ ...aiForm, extraClauses: e.target.value })}
              />
            </div>
            {!brand?.brandLogoUrl && (
              <div className="text-xs p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200">
                ⚠️ Você ainda não enviou uma logo em <strong>Configurações → Branding</strong>. O PDF será gerado sem logo.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiOpen(false)}>Cancelar</Button>
            <Button onClick={generateWithAi} disabled={aiLoading} className="bg-gradient-primary hover:opacity-90">
              {aiLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Gerando...</> : <><Sparkles className="h-4 w-4 mr-2" />Gerar contrato</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-card border-border/60 max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display">{editing ? "Editar template" : "Revisar e salvar template"}</DialogTitle>
            <DialogDescription className="text-xs">
              Placeholders disponíveis: <code className="text-primary">{PLACEHOLDERS}</code>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <Label>Corpo do contrato *</Label>
              <Textarea rows={18} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="font-mono text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.name || !form.body} className="bg-gradient-primary hover:opacity-90">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
