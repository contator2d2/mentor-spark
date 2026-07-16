import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CreditCard, Loader2, Plus, Trash2, CheckCircle2, AlertCircle, Copy, Webhook, Pencil, PlayCircle } from "lucide-react";
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
  metadata?: { webhookToken?: string } | null;
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
  const { user } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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
      // Backend faz upsert por (mentorId, type) — não enviar apiKey vazia para não sobrescrever a existente
      const payload: any = { ...form };
      if (editingId && !payload.apiKey) delete payload.apiKey;
      await api("/event-payments/providers", { method: "POST", body: payload });
      toast.success("Provedor salvo");
      setOpen(false);
      setEditingId(null);
      setForm({ type: "asaas", label: "", apiKey: "", environment: "sandbox", manualInstructions: "", manualCheckoutUrl: "" });
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  function openEdit(p: Provider) {
    setEditingId(p.id);
    setForm({
      type: p.type,
      label: p.label || "",
      apiKey: "",
      environment: p.environment || "sandbox",
      manualInstructions: p.manualInstructions || "",
      manualCheckoutUrl: p.manualCheckoutUrl || "",
    });
    setOpen(true);
  }

  function openNew() {
    setEditingId(null);
    setForm({ type: "asaas", label: "", apiKey: "", environment: "sandbox", manualInstructions: "", manualCheckoutUrl: "" });
    setOpen(true);
  }

  async function remove(id: string) {
    if (!confirm("Remover este provedor?")) return;
    await api(`/event-payments/providers/${id}`, { method: "DELETE" });
    load();
  }

  function copy(text: string, label = "Copiado") {
    navigator.clipboard.writeText(text).then(() => toast.success(label));
  }

  // Sempre usar o domínio do tenant (customDomain do mentor) quando existir,
  // caindo para o host atual (útil enquanto o mentor ainda não configurou domínio).
  const tenantHost =
    (user as any)?.customDomain?.trim() ||
    window.location.host;
  const webhookUrl = `https://${tenantHost}/api/public/event-payments/webhook/asaas`;

  const [testingId, setTestingId] = useState<string | null>(null);
  async function testWebhook(p: Provider) {
    setTestingId(p.id);
    try {
      // 1. GET ping — Asaas usa isto ao validar a URL
      const pingRes = await fetch(webhookUrl, { method: "GET" });
      if (!pingRes.ok) throw new Error(`GET retornou ${pingRes.status}`);
      // 2. POST com token — simula o que o Asaas envia
      const postRes = await fetch(webhookUrl + "/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "asaas-access-token": p.metadata?.webhookToken || "",
        },
        body: JSON.stringify({ token: p.metadata?.webhookToken }),
      });
      if (!postRes.ok) throw new Error(`POST retornou ${postRes.status}`);
      toast.success("Webhook acessível ✓ — agora clique em 'Reativar' no painel Asaas.");
    } catch (e: any) {
      toast.error("Falha ao testar: " + e.message);
    } finally {
      setTestingId(null);
    }
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
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Adicionar provedor</Button>
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
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)} title="Editar">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(p.id)} title="Remover">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {p.type === "asaas" && p.metadata?.webhookToken && (
                <div className="mt-2 rounded-lg border border-border/60 bg-background/50 p-3 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-primary">
                    <Webhook className="h-3.5 w-3.5" /> Webhook do Asaas (obrigatório)
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Para que as vendas sejam confirmadas automaticamente, cadastre este webhook na sua conta Asaas em
                    <b> Configurações → Integrações → Notificações via webhook</b>.
                  </p>
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-0.5">URL do webhook</div>
                    <div className="flex gap-1">
                      <code className="flex-1 bg-muted/40 rounded px-2 py-1 break-all text-[11px]">{webhookUrl}</code>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(webhookUrl, "URL copiada")}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-0.5">Token de autenticação</div>
                    <div className="flex gap-1">
                      <code className="flex-1 bg-muted/40 rounded px-2 py-1 break-all text-[11px]">{p.metadata.webhookToken}</code>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(p.metadata!.webhookToken!, "Token copiado")}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground pl-1 pt-1">
                    <li>Abra o painel Asaas → <b>Configurações → Integrações → Webhooks</b>.</li>
                    <li>Clique em <b>Adicionar webhook</b>.</li>
                    <li>Cole a <b>URL</b> acima no campo "URL".</li>
                    <li>Cole o <b>Token</b> acima no campo "Token de autenticação".</li>
                    <li>Versão da API: <b>v3</b>. Envio: <b>Sequencial</b>.</li>
                    <li>Eventos: marque <b>PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_REFUNDED, PAYMENT_DELETED</b>.</li>
                    <li>Salve. Pronto — as inscrições serão confirmadas automaticamente ao receber o pagamento.</li>
                  </ol>
                  <div className="pt-2 border-t border-border/60 mt-2 space-y-2">
                    <Button size="sm" variant="secondary" className="w-full" onClick={() => testWebhook(p)} disabled={testingId === p.id}>
                      {testingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <PlayCircle className="h-3.5 w-3.5 mr-2" />}
                      Testar webhook
                    </Button>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      <b>Status "Interrompido" no Asaas?</b> Isso significa que houve alguma falha temporária de rede em um envio anterior.
                      Basta clicar em <b>"Reativar"</b> (ou <b>"Ativar sincronização"</b>) no painel do Asaas — a URL continua correta.
                      Se persistir, use o botão "Testar webhook" acima para confirmar que a URL responde.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditingId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Editar provedor" : "Novo provedor de pagamento"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Provedor</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })} disabled={!!editingId}>
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
                  <Label>API Key / Token {editingId && <span className="text-xs text-muted-foreground font-normal">(deixe em branco para manter a atual)</span>}</Label>
                  <Input type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder={editingId ? "•••••••• (mantém a atual)" : "Cole aqui"} />
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
