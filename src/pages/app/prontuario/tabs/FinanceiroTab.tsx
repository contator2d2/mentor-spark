import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, Plus, DollarSign, FileText, Bell, CheckCircle2, XCircle, Clock,
  AlertTriangle, Upload, Settings, Copy, ExternalLink, Receipt,
} from "lucide-react";
import { toast } from "sonner";

interface Charge {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  paidAt?: string;
  status: "pending" | "paid" | "overdue" | "cancelled" | "refunded";
  method: "pix" | "boleto" | "credit_card" | "manual";
  invoiceUrl?: string;
  pixCopyPaste?: string;
  bankSlipUrl?: string;
  nfeUrl?: string;
  nfeNumber?: string;
  installmentNumber?: number;
  installmentTotal?: number;
  reminderCount?: number;
}

interface BillingTemplate {
  key: string;
  label: string;
  body: string;
  isCustom: boolean;
}

const STATUS_META: Record<string, { label: string; cls: string; icon: any }> = {
  pending:   { label: "Pendente",  cls: "bg-amber-500/10 text-amber-400 border-amber-500/30", icon: Clock },
  paid:      { label: "Pago",      cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  overdue:   { label: "Atrasada",  cls: "bg-rose-500/10 text-rose-400 border-rose-500/30", icon: AlertTriangle },
  cancelled: { label: "Cancelada", cls: "bg-muted text-muted-foreground border-border", icon: XCircle },
  refunded:  { label: "Reembolso", cls: "bg-violet-500/10 text-violet-400 border-violet-500/30", icon: XCircle },
};

const METHOD_LABEL: Record<string, string> = {
  pix: "PIX",
  boleto: "Boleto",
  credit_card: "Cartão",
  manual: "Manual",
};

export function FinanceiroTab({ leadId }: { leadId: string }) {
  const [charges, setCharges] = useState<Charge[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const [nfOpen, setNfOpen] = useState<Charge | null>(null);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    description: "",
    amount: "",
    dueDate: new Date().toISOString().slice(0, 10),
    method: "pix" as "pix" | "boleto" | "credit_card" | "manual",
    createInAsaas: true,
    installments: 1,
  });

  async function load() {
    setLoading(true);
    try {
      const list = await api<Charge[]>(`/mentor-billing/charges?leadId=${leadId}`);
      setCharges(list);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [leadId]);

  async function createCharge() {
    if (!form.description || !form.amount) {
      toast.error("Preencha descrição e valor");
      return;
    }
    setCreating(true);
    try {
      await api("/mentor-billing/charges", {
        method: "POST",
        body: {
          leadId,
          description: form.description,
          amount: Number(form.amount),
          dueDate: form.dueDate,
          method: form.method,
          createInAsaas: form.method !== "manual" && form.createInAsaas,
          installments: form.installments,
        },
      });
      toast.success(form.installments > 1 ? `${form.installments} parcelas criadas` : "Cobrança criada");
      setCreateOpen(false);
      setForm({ ...form, description: "", amount: "" });
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function markPaid(c: Charge) {
    if (!confirm(`Marcar "${c.description}" como paga?`)) return;
    try {
      await api(`/mentor-billing/charges/${c.id}/paid`, { method: "PATCH" });
      toast.success("Marcada como paga");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function cancelCharge(c: Charge) {
    if (!confirm(`Cancelar "${c.description}"?`)) return;
    try {
      await api(`/mentor-billing/charges/${c.id}`, { method: "DELETE" });
      toast.success("Cancelada");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function sendReminder(c: Charge) {
    try {
      await api(`/mentor-billing/charges/${c.id}/remind`, { method: "POST" });
      toast.success("Lembrete enviado por WhatsApp");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  // Totais
  const totals = charges.reduce(
    (acc, c) => {
      const v = Number(c.amount);
      if (c.status === "paid") acc.paid += v;
      else if (c.status === "overdue") acc.overdue += v;
      else if (c.status === "pending") acc.pending += v;
      return acc;
    },
    { paid: 0, pending: 0, overdue: 0 },
  );

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 bg-emerald-500/5 border-emerald-500/20">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Recebido</div>
          <div className="font-display text-2xl font-bold text-emerald-400 mt-1">
            R$ {totals.paid.toFixed(2)}
          </div>
        </Card>
        <Card className="p-4 bg-amber-500/5 border-amber-500/20">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">A receber</div>
          <div className="font-display text-2xl font-bold text-amber-400 mt-1">
            R$ {totals.pending.toFixed(2)}
          </div>
        </Card>
        <Card className="p-4 bg-rose-500/5 border-rose-500/20">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Em atraso</div>
          <div className="font-display text-2xl font-bold text-rose-400 mt-1">
            R$ {totals.overdue.toFixed(2)}
          </div>
        </Card>
      </div>

      {/* Ações */}
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <h3 className="font-display text-lg">Cobranças do mentorado</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setTplOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />Mensagens
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-primary hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />Nova cobrança
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nova cobrança</DialogTitle>
                <DialogDescription>
                  Crie uma cobrança avulsa, parcelada ou via Asaas (PIX/boleto).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1.5">
                  <Label>Descrição *</Label>
                  <Input
                    placeholder="Ex: Mentoria Premium - Janeiro"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Valor (R$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Vencimento *</Label>
                    <Input
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Forma</Label>
                    <Select value={form.method} onValueChange={(v: any) => setForm({ ...form, method: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="boleto">Boleto</SelectItem>
                        <SelectItem value="credit_card">Cartão</SelectItem>
                        <SelectItem value="manual">Manual (sem gateway)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Parcelas</Label>
                    <Input
                      type="number"
                      min={1}
                      max={36}
                      value={form.installments}
                      onChange={(e) => setForm({ ...form, installments: Math.max(1, Number(e.target.value)) })}
                    />
                  </div>
                </div>
                {form.method !== "manual" && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.createInAsaas}
                      onChange={(e) => setForm({ ...form, createInAsaas: e.target.checked })}
                    />
                    Gerar link de pagamento automático no Asaas
                  </label>
                )}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={creating}>Cancelar</Button>
                <Button onClick={createCharge} disabled={creating} className="bg-gradient-primary hover:opacity-90">
                  {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Criar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : charges.length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <DollarSign className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhuma cobrança ainda. Clique em "Nova cobrança" para começar.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {charges.map((c) => {
            const status = STATUS_META[c.status];
            const StatusIcon = status.icon;
            return (
              <Card key={c.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex flex-wrap gap-3 items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{c.description}</span>
                      <Badge variant="outline" className={status.cls}>
                        <StatusIcon className="h-3 w-3 mr-1" />{status.label}
                      </Badge>
                      <Badge variant="outline">{METHOD_LABEL[c.method]}</Badge>
                      {c.installmentNumber && (
                        <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/30">
                          Parcela {c.installmentNumber}/{c.installmentTotal}
                        </Badge>
                      )}
                      {c.nfeUrl && (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                          <Receipt className="h-3 w-3 mr-1" />NF{c.nfeNumber ? ` ${c.nfeNumber}` : ""}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                      <span className="font-display text-base text-foreground">R$ {Number(c.amount).toFixed(2)}</span>
                      <span>Vence: {new Date(c.dueDate).toLocaleDateString("pt-BR")}</span>
                      {c.paidAt && <span>Pago: {new Date(c.paidAt).toLocaleDateString("pt-BR")}</span>}
                      {c.reminderCount && c.reminderCount > 0 && (
                        <span><Bell className="h-3 w-3 inline mr-1" />{c.reminderCount} lembrete(s)</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {c.invoiceUrl && (
                      <Button size="sm" variant="ghost" asChild>
                        <a href={c.invoiceUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-1" />Pagamento</a>
                      </Button>
                    )}
                    {c.pixCopyPaste && (
                      <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(c.pixCopyPaste!); toast.success("PIX copiado"); }}>
                        <Copy className="h-4 w-4 mr-1" />PIX
                      </Button>
                    )}
                    {c.nfeUrl ? (
                      <Button size="sm" variant="ghost" asChild>
                        <a href={c.nfeUrl} target="_blank" rel="noreferrer"><FileText className="h-4 w-4 mr-1" />NF</a>
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setNfOpen(c)}>
                        <Upload className="h-4 w-4 mr-1" />Anexar NF
                      </Button>
                    )}
                    {c.status !== "paid" && c.status !== "cancelled" && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => sendReminder(c)} title="Enviar lembrete WhatsApp">
                          <Bell className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => markPaid(c)} className="text-emerald-400" title="Marcar como paga">
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => cancelCharge(c)} className="text-rose-400" title="Cancelar">
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <UploadInvoiceDialog charge={nfOpen} onClose={() => setNfOpen(null)} onDone={load} />
      <TemplatesDialog open={tplOpen} onOpenChange={setTplOpen} />
    </div>
  );
}

// =================== Upload de Nota Fiscal ===================
function UploadInvoiceDialog({
  charge,
  onClose,
  onDone,
}: {
  charge: Charge | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [number, setNumber] = useState("");
  const [notify, setNotify] = useState(true);
  const [uploading, setUploading] = useState(false);

  async function submit() {
    if (!charge || !file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const upRes = await fetch(
        `${(import.meta as any).env.VITE_API_URL || ""}/uploads`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          body: fd,
        },
      );
      if (!upRes.ok) throw new Error("Falha no upload");
      const { url } = await upRes.json();

      await api(`/mentor-billing/charges/${charge.id}/invoice`, {
        method: "POST",
        body: { nfeUrl: url, nfeNumber: number || undefined, nfeFileName: file.name, notify },
      });
      toast.success(notify ? "NF anexada e mentorado notificado" : "NF anexada");
      onDone();
      onClose();
      setFile(null);
      setNumber("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={!!charge} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anexar nota fiscal</DialogTitle>
          <DialogDescription>
            Faça upload do PDF/XML. O mentorado poderá baixar pelo app dele.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Número da NF (opcional)</Label>
            <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Ex: 12345" />
          </div>
          <div className="space-y-1.5">
            <Label>Arquivo *</Label>
            <Input
              type="file"
              accept="application/pdf,application/xml,text/xml,.xml,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            Notificar mentorado por WhatsApp + app
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={uploading}>Cancelar</Button>
          <Button onClick={submit} disabled={!file || uploading} className="bg-gradient-primary hover:opacity-90">
            {uploading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =================== Templates de mensagens ===================
const VARS_HINT = `Variáveis disponíveis:
{{primeiro_nome}} {{nome}} {{descricao}} {{valor}} {{vencimento}}
{{dias_atraso}} {{link_pagamento}} {{pix_copia_cola}} {{nota_fiscal}} {{parcela}}`;

function TemplatesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [items, setItems] = useState<BillingTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api<BillingTemplate[]>("/mentor-billing/templates")
      .then(setItems)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [open]);

  async function save(t: BillingTemplate) {
    setSaving(t.key);
    try {
      await api("/mentor-billing/templates", { method: "POST", body: { key: t.key, body: t.body } });
      toast.success(`"${t.label}" salvo`);
      setItems((prev) => prev.map((x) => x.key === t.key ? { ...x, isCustom: true } : x));
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(null); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mensagens de cobrança</DialogTitle>
          <DialogDescription>
            Edite as mensagens enviadas automaticamente pelo WhatsApp em cada momento.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue={items[0]?.key} className="space-y-3">
            <TabsList className="flex-wrap h-auto">
              {items.map((t) => (
                <TabsTrigger key={t.key} value={t.key} className="text-xs">
                  {t.label}{t.isCustom && " ✓"}
                </TabsTrigger>
              ))}
            </TabsList>
            {items.map((t) => (
              <TabsContent key={t.key} value={t.key} className="space-y-3">
                <Textarea
                  value={t.body}
                  onChange={(e) => setItems((prev) => prev.map((x) => x.key === t.key ? { ...x, body: e.target.value } : x))}
                  rows={8}
                  className="font-mono text-sm"
                />
                <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap bg-muted/30 p-2 rounded">{VARS_HINT}</pre>
                <Button onClick={() => save(t)} disabled={saving === t.key} className="bg-gradient-primary hover:opacity-90">
                  {saving === t.key && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Salvar "{t.label}"
                </Button>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
