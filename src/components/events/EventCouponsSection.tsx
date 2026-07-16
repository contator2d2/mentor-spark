import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Trash2, Ticket, Percent, DollarSign, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Coupon {
  id: string;
  code: string;
  description?: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  maxUses?: number | null;
  usedCount: number;
  startsAt?: string | null;
  endsAt?: string | null;
  applicableTierIds?: string[] | null;
  oneUsePerPerson: boolean;
  isActive: boolean;
}

interface Tier {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
}

const emptyForm: Partial<Coupon> = {
  code: "",
  description: "",
  discountType: "percent",
  discountValue: 10,
  maxUses: null,
  startsAt: null,
  endsAt: null,
  applicableTierIds: [],
  oneUsePerPerson: true,
  isActive: true,
};

export default function EventCouponsSection({ eventId }: { eventId: string }) {
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState<Partial<Coupon>>(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [cs, ts] = await Promise.all([
        api(`/event-payments/events/${eventId}/coupons`),
        api(`/event-payments/events/${eventId}/tiers`),
      ]);
      setCoupons(cs || []);
      setTiers(ts || []);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao carregar cupons");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [eventId]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(c: Coupon) {
    setEditing(c);
    setForm({
      ...c,
      startsAt: c.startsAt ? c.startsAt.slice(0, 16) : null,
      endsAt: c.endsAt ? c.endsAt.slice(0, 16) : null,
      applicableTierIds: c.applicableTierIds || [],
    });
    setOpen(true);
  }

  async function save() {
    if (!form.code?.trim()) return toast.error("Informe o código");
    if (!form.discountValue || form.discountValue <= 0) return toast.error("Valor de desconto inválido");
    setSaving(true);
    try {
      const payload: any = {
        code: form.code!.trim().toUpperCase(),
        description: form.description || null,
        discountType: form.discountType,
        discountValue:
          form.discountType === "fixed"
            ? Math.round(Number(form.discountValue) * 100) // reais → centavos
            : Number(form.discountValue),
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        startsAt: form.startsAt ? new Date(form.startsAt as string).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt as string).toISOString() : null,
        applicableTierIds: form.applicableTierIds?.length ? form.applicableTierIds : null,
        oneUsePerPerson: !!form.oneUsePerPerson,
        isActive: form.isActive !== false,
      };
      // se editando e discountType === fixed, o valor no form já está em reais convertidos
      // (openEdit trouxe em centavos → converto aqui)
      if (editing && editing.discountType === "fixed" && form.discountValue === editing.discountValue) {
        payload.discountValue = editing.discountValue;
      }
      if (editing) {
        await api(`/event-payments/coupons/${editing.id}`, { method: "PUT", body: payload });
        toast.success("Cupom atualizado");
      } else {
        await api(`/event-payments/events/${eventId}/coupons`, { method: "POST", body: payload });
        toast.success("Cupom criado");
      }
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: Coupon) {
    if (!confirm(`Excluir cupom ${c.code}?`)) return;
    try {
      await api(`/event-payments/coupons/${c.id}`, { method: "DELETE" });
      toast.success("Cupom excluído");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Erro");
    }
  }

  function formatDiscount(c: Coupon) {
    return c.discountType === "percent"
      ? `${c.discountValue}%`
      : `R$ ${(c.discountValue / 100).toFixed(2)}`;
  }

  function toggleTier(id: string) {
    const cur = new Set(form.applicableTierIds || []);
    cur.has(id) ? cur.delete(id) : cur.add(id);
    setForm({ ...form, applicableTierIds: Array.from(cur) });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg flex items-center gap-2">
            <Ticket className="h-4 w-4 text-primary" /> Cupons de desconto
          </h3>
          <p className="text-sm text-muted-foreground">
            Gere códigos promocionais aplicáveis no checkout público.
          </p>
        </div>
        <Button onClick={openNew} className="bg-gradient-primary hover:opacity-90">
          <Plus className="h-4 w-4 mr-1" /> Novo cupom
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : coupons.length === 0 ? (
        <Card className="glass-card"><CardContent className="p-8 text-center text-muted-foreground text-sm">
          Nenhum cupom criado ainda.
        </CardContent></Card>
      ) : (
        <Card className="glass-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Desconto</TableHead>
                  <TableHead>Usos</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-semibold">{c.code}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {c.discountType === "percent" ? <Percent className="h-3 w-3" /> : <DollarSign className="h-3 w-3" />}
                        {formatDiscount(c)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.endsAt ? `até ${new Date(c.endsAt).toLocaleDateString("pt-BR")}` : "sem validade"}
                    </TableCell>
                    <TableCell>
                      {c.isActive ? (
                        <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">Ativo</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(c)}>
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar cupom" : "Novo cupom"}</DialogTitle>
            <DialogDescription>
              O código é validado no checkout público antes de gerar a cobrança.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Código *</Label>
              <Input
                value={form.code || ""}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="EX: BLACK50"
                className="font-mono uppercase"
              />
            </div>
            <div>
              <Label>Descrição interna</Label>
              <Textarea
                rows={2}
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Campanha de lançamento"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select
                  value={form.discountType}
                  onValueChange={(v: "percent" | "fixed") => setForm({ ...form, discountType: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentual (%)</SelectItem>
                    <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{form.discountType === "percent" ? "Percentual" : "Valor em R$"}</Label>
                <Input
                  type="number"
                  min={form.discountType === "percent" ? 1 : 0.01}
                  max={form.discountType === "percent" ? 100 : undefined}
                  step={form.discountType === "percent" ? 1 : 0.01}
                  value={
                    editing && form.discountType === "fixed" && form.discountValue === editing.discountValue
                      ? (editing.discountValue / 100).toFixed(2)
                      : (form.discountValue ?? "")
                  }
                  onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Início</Label>
                <Input
                  type="datetime-local"
                  value={(form.startsAt as string) || ""}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value || null })}
                />
              </div>
              <div>
                <Label>Fim</Label>
                <Input
                  type="datetime-local"
                  value={(form.endsAt as string) || ""}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value || null })}
                />
              </div>
            </div>
            <div>
              <Label>Limite total de usos</Label>
              <Input
                type="number"
                min={1}
                placeholder="Ilimitado"
                value={form.maxUses ?? ""}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            {tiers.length > 0 && (
              <div>
                <Label>Lotes aplicáveis</Label>
                <div className="text-xs text-muted-foreground mb-2">
                  Deixe todos desmarcados para aplicar a qualquer lote.
                </div>
                <div className="flex flex-wrap gap-2">
                  {tiers.map((t) => {
                    const active = form.applicableTierIds?.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTier(t.id)}
                        className={`text-xs px-2 py-1 rounded-full border transition ${
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/30 border-border/50 hover:bg-muted/50"
                        }`}
                      >
                        {t.name} · R$ {(t.priceCents / 100).toFixed(2)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg border border-border/40 p-3">
              <div>
                <div className="text-sm font-medium">1 uso por email</div>
                <div className="text-xs text-muted-foreground">Impede que o mesmo participante use várias vezes</div>
              </div>
              <Switch
                checked={!!form.oneUsePerPerson}
                onCheckedChange={(v) => setForm({ ...form, oneUsePerPerson: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/40 p-3">
              <div>
                <div className="text-sm font-medium">Ativo</div>
                <div className="text-xs text-muted-foreground">Cupons inativos não podem ser aplicados</div>
              </div>
              <Switch
                checked={form.isActive !== false}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-gradient-primary hover:opacity-90">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}