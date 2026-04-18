import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Plus, MoreVertical, Check, X, Send } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

interface Charge {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: string;
  method: string;
  invoiceUrl?: string;
  pixCopyPaste?: string;
  leadId: string;
}
interface Subscription {
  id: string;
  productName: string;
  amount: number;
  cycle: string;
  dayOfMonth: number;
  status: string;
  leadId: string;
}
interface Lead { id: string; name: string; email: string; phone?: string }

export default function MentorBillingPage() {
  const [tab, setTab] = useState("charges");
  const [charges, setCharges] = useState<Charge[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [creating, setCreating] = useState<"charge" | "sub" | null>(null);
  const [form, setForm] = useState<any>({});

  async function load() {
    try {
      const [c, s, l] = await Promise.all([
        api<Charge[]>("/mentor-billing/charges"),
        api<Subscription[]>("/mentor-billing/subscriptions"),
        api<Lead[]>("/leads"),
      ]);
      setCharges(c); setSubs(s); setLeads(Array.isArray(l) ? l : []);
    } catch (e: any) { toast.error(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function create() {
    try {
      const path = creating === "charge" ? "/mentor-billing/charges" : "/mentor-billing/subscriptions";
      await api(path, { method: "POST", body: form });
      toast.success("Criado!");
      setCreating(null); setForm({});
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function markPaid(id: string) {
    await api(`/mentor-billing/charges/${id}/paid`, { method: "PATCH" });
    load();
  }
  async function cancelCharge(id: string) {
    if (!confirm("Cancelar cobrança?")) return;
    await api(`/mentor-billing/charges/${id}`, { method: "DELETE" });
    load();
  }
  async function cancelSub(id: string) {
    if (!confirm("Cancelar assinatura?")) return;
    await api(`/mentor-billing/subscriptions/${id}`, { method: "DELETE" });
    load();
  }

  const totalRecebido = charges.filter(c => c.status === "paid").reduce((a,b) => a + Number(b.amount), 0);
  const totalPendente = charges.filter(c => c.status === "pending" || c.status === "overdue").reduce((a,b) => a + Number(b.amount), 0);
  const mrr = subs.filter(s => s.status === "active").reduce((a,b) => a + Number(b.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <DollarSign className="h-7 w-7 text-primary" /> Cobranças & Mensalidades
          </h1>
          <p className="text-muted-foreground">Cobre seus mentorados via Pix, boleto ou cartão (Asaas).</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setForm({ amount: 0, dueDate: new Date().toISOString().slice(0,10), method: "pix", createInAsaas: true }); setCreating("charge"); }}>
            <Plus className="h-4 w-4 mr-1" /> Nova cobrança
          </Button>
          <Button onClick={() => { setForm({ amount: 0, cycle: "monthly", dayOfMonth: 5, startDate: new Date().toISOString().slice(0,10), billingType: "PIX", createInAsaas: true }); setCreating("sub"); }}>
            <Plus className="h-4 w-4 mr-1" /> Nova assinatura
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">MRR ativo</div><div className="text-2xl font-bold">R$ {mrr.toFixed(2)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Recebido total</div><div className="text-2xl font-bold text-green-600">R$ {totalRecebido.toFixed(2)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Pendente / Atrasado</div><div className="text-2xl font-bold text-amber-600">R$ {totalPendente.toFixed(2)}</div></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="charges">Cobranças avulsas</TabsTrigger>
          <TabsTrigger value="subs">Assinaturas recorrentes</TabsTrigger>
        </TabsList>
        <TabsContent value="charges" className="space-y-3 mt-4">
          {charges.map(c => {
            const lead = leads.find(l => l.id === c.leadId);
            return (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-semibold">{c.description}</div>
                    <div className="text-sm text-muted-foreground">{lead?.name} · venc {new Date(c.dueDate).toLocaleDateString("pt-BR")}</div>
                    <div className="flex gap-1 mt-1">
                      <Badge variant={c.status === "paid" ? "default" : c.status === "overdue" ? "destructive" : "secondary"}>{c.status}</Badge>
                      <Badge variant="outline">{c.method}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xl font-bold">R$ {Number(c.amount).toFixed(2)}</div>
                    {c.status !== "paid" && c.status !== "cancelled" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => markPaid(c.id)}><Check className="h-3 w-3 mr-1" />Marcar pago</Button>
                        {c.invoiceUrl && <Button size="sm" variant="ghost" asChild><a href={c.invoiceUrl} target="_blank" rel="noreferrer">Link</a></Button>}
                        <Button size="icon" variant="ghost" onClick={() => cancelCharge(c.id)}><X className="h-3 w-3" /></Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
          {charges.length === 0 && <Card className="p-8 text-center text-muted-foreground">Nenhuma cobrança ainda.</Card>}
        </TabsContent>
        <TabsContent value="subs" className="space-y-3 mt-4">
          {subs.map(s => {
            const lead = leads.find(l => l.id === s.leadId);
            return (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-semibold">{s.productName}</div>
                    <div className="text-sm text-muted-foreground">{lead?.name} · {s.cycle} · vence dia {s.dayOfMonth}</div>
                    <Badge variant={s.status === "active" ? "default" : "secondary"} className="mt-1">{s.status}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xl font-bold">R$ {Number(s.amount).toFixed(2)}</div>
                    {s.status === "active" && <Button size="sm" variant="outline" onClick={() => cancelSub(s.id)}>Cancelar</Button>}
                  </div>
                </div>
              </Card>
            );
          })}
          {subs.length === 0 && <Card className="p-8 text-center text-muted-foreground">Nenhuma assinatura ativa.</Card>}
        </TabsContent>
      </Tabs>

      <Dialog open={!!creating} onOpenChange={(o) => !o && setCreating(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{creating === "charge" ? "Nova cobrança" : "Nova assinatura"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Mentorado</Label>
              <Select value={form.leadId} onValueChange={(v) => setForm({ ...form, leadId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{leads.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {creating === "charge" ? (
              <>
                <div><Label>Descrição</Label><Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Valor R$</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} /></div>
                  <div><Label>Vencimento</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
                </div>
                <div>
                  <Label>Método</Label>
                  <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="credit_card">Cartão</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div><Label>Produto</Label><Input value={form.productName || ""} onChange={(e) => setForm({ ...form, productName: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Valor R$</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} /></div>
                  <div><Label>Dia vencimento</Label><Input type="number" min={1} max={28} value={form.dayOfMonth} onChange={(e) => setForm({ ...form, dayOfMonth: +e.target.value })} /></div>
                </div>
                <div>
                  <Label>Ciclo</Label>
                  <Select value={form.cycle} onValueChange={(v) => setForm({ ...form, cycle: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="quarterly">Trimestral</SelectItem>
                      <SelectItem value="semiannual">Semestral</SelectItem>
                      <SelectItem value="annual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Início</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
              </>
            )}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded">
              <div>
                <Label>Cobrar via Asaas</Label>
                <p className="text-xs text-muted-foreground">Gera Pix/boleto e envia link no WhatsApp</p>
              </div>
              <Switch checked={form.createInAsaas} onCheckedChange={(v) => setForm({ ...form, createInAsaas: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(null)}>Cancelar</Button>
            <Button onClick={create}><Send className="h-4 w-4 mr-1" />Criar e enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
