import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CreditCard, Loader2, Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Provider {
  id: string;
  type: "asaas" | "mercado_pago" | "stripe" | "manual";
  label?: string;
  environment: string;
  status: string;
  hasApiKey: boolean;
  manualInstructions?: string;
  manualCheckoutUrl?: string;
}

const PROVIDER_LABELS: Record<string, string> = {
  asaas: "Asaas",
  mercado_pago: "Mercado Pago",
  stripe: "Stripe",
  manual: "Pix manual / Link externo",
};

const PROVIDER_HELP: Record<string, string> = {
  asaas: "API Key da sua conta Asaas (Configurações → Integrações). Suporta Pix, boleto e cartão.",
  mercado_pago: "Access Token (TEST-... ou APP_USR-...) em mercadopago.com.br/developers.",
  stripe: "Secret Key (sk_test_... / sk_live_...) em dashboard.stripe.com/apikeys.",
  manual: "Sem cobrança automática — você cola um link externo (Hotmart, Sympla) ou Pix copia-cola.",
};

export default function PaymentProvidersSection() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    type: "asaas",
    label: "",
    apiKey: "",
    environment: "sandbox",
    manualInstructions: "",
    manualCheckoutUrl: "",
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const r = await api<Provider[]>("/event-payments/providers");
      setProviders(r);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    try {
      await api("/event-payments/providers", { method: "POST", body: form });
      toast.success("Provedor salvo");
      setOpen(false);
      setForm({ type: "asaas", label: "", apiKey: "", environment: "sandbox", manualInstructions: "", manualCheckoutUrl: "" });
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm("Remover este provedor?")) return;
    await api(`/event-payments/providers/${id}`, { method: "DELETE" });
    load();
  }

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-primary" />;

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-violet-400" />
            Pagamentos de eventos
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure provedores para cobrar inscrições. Cada evento escolhe qual usar.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Adicionar provedor</Button>
      </div>

      {providers.length === 0 ? (
        <div className="bg-muted/30 border border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
          Nenhum provedor configurado. Adicione Asaas, Mercado Pago, Stripe ou um link manual para vender ingressos.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {providers.map((p) => (
            <div key={p.id} className="bg-muted/20 border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {PROVIDER_LABELS[p.type]}
                    {p.status === "active" ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px]"><CheckCircle2 className="h-2.5 w-2.5 mr-1" />Ativo</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]"><AlertCircle className="h-2.5 w-2.5 mr-1" />{p.status}</Badge>
                    )}
                  </div>
                  {p.label && <div className="text-xs text-muted-foreground">{p.label}</div>}
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {p.type !== "manual" && <>Ambiente: <b>{p.environment}</b> • </>}
                    {p.type !== "manual" && (p.hasApiKey ? "Chave configurada ✓" : "Sem chave")}
                    {p.type === "manual" && (p.manualCheckoutUrl ? "Link configurado ✓" : "Sem link")}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(p.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo provedor de pagamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Provedor</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PROVIDER_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">{PROVIDER_HELP[form.type]}</p>
            </div>
            <div>
              <Label>Rótulo (opcional)</Label>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex: Conta principal" />
            </div>
            {form.type !== "manual" ? (
              <>
                <div>
                  <Label>API Key / Token</Label>
                  <Input type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="Cole aqui" />
                </div>
                <div>
                  <Label>Ambiente</Label>
                  <Select value={form.environment} onValueChange={(v) => setForm({ ...form, environment: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (teste)</SelectItem>
                      <SelectItem value="production">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label>Link externo de checkout</Label>
                  <Input value={form.manualCheckoutUrl} onChange={(e) => setForm({ ...form, manualCheckoutUrl: e.target.value })} placeholder="https://pay.hotmart.com/..." />
                </div>
                <div>
                  <Label>Instruções (Pix copia-cola, dados bancários)</Label>
                  <Textarea rows={4} value={form.manualInstructions} onChange={(e) => setForm({ ...form, manualInstructions: e.target.value })} />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
