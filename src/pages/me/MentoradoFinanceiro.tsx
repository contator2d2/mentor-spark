import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, DollarSign, CheckCircle2, Clock, AlertTriangle, XCircle,
  Copy, ExternalLink, FileText, Receipt,
} from "lucide-react";
import { toast } from "sonner";

interface MyCharge {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  paidAt?: string;
  status: "pending" | "paid" | "overdue" | "cancelled" | "refunded";
  method: "pix" | "boleto" | "credit_card" | "manual";
  invoiceUrl?: string;
  pixCopyPaste?: string;
  pixQrCode?: string;
  bankSlipUrl?: string;
  nfeUrl?: string;
  nfeNumber?: string;
  installmentNumber?: number;
  installmentTotal?: number;
}

const STATUS_META: Record<string, { label: string; cls: string; icon: any }> = {
  pending:   { label: "Pendente",  cls: "bg-amber-500/10 text-amber-400 border-amber-500/30", icon: Clock },
  paid:      { label: "Pago",      cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  overdue:   { label: "Atrasada",  cls: "bg-rose-500/10 text-rose-400 border-rose-500/30", icon: AlertTriangle },
  cancelled: { label: "Cancelada", cls: "bg-muted text-muted-foreground border-border", icon: XCircle },
  refunded:  { label: "Reembolso", cls: "bg-violet-500/10 text-violet-400 border-violet-500/30", icon: XCircle },
};

export default function MentoradoFinanceiro() {
  const [items, setItems] = useState<MyCharge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<MyCharge[]>("/me/financeiro")
      .then(setItems)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  const totals = items.reduce(
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
      <div>
        <h1 className="font-display text-2xl font-bold">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Suas cobranças, pagamentos e notas fiscais</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 bg-emerald-500/5 border-emerald-500/20">
          <div className="text-[10px] text-muted-foreground uppercase">Pago</div>
          <div className="font-display text-lg font-bold text-emerald-400">R$ {totals.paid.toFixed(2)}</div>
        </Card>
        <Card className="p-3 bg-amber-500/5 border-amber-500/20">
          <div className="text-[10px] text-muted-foreground uppercase">A pagar</div>
          <div className="font-display text-lg font-bold text-amber-400">R$ {totals.pending.toFixed(2)}</div>
        </Card>
        <Card className="p-3 bg-rose-500/5 border-rose-500/20">
          <div className="text-[10px] text-muted-foreground uppercase">Atrasado</div>
          <div className="font-display text-lg font-bold text-rose-400">R$ {totals.overdue.toFixed(2)}</div>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <DollarSign className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Nenhuma cobrança ainda.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((c) => {
            const status = STATUS_META[c.status];
            const StatusIcon = status.icon;
            return (
              <Card key={c.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{c.description}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Vence: {new Date(c.dueDate).toLocaleDateString("pt-BR")}
                      {c.paidAt && <> · Pago: {new Date(c.paidAt).toLocaleDateString("pt-BR")}</>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display text-lg font-bold">R$ {Number(c.amount).toFixed(2)}</div>
                    <Badge variant="outline" className={`${status.cls} text-[10px]`}>
                      <StatusIcon className="h-3 w-3 mr-1" />{status.label}
                    </Badge>
                  </div>
                </div>

                {c.installmentNumber && (
                  <div className="text-xs text-muted-foreground">
                    Parcela {c.installmentNumber} de {c.installmentTotal}
                  </div>
                )}

                {c.status === "pending" || c.status === "overdue" ? (
                  <div className="space-y-2">
                    {c.pixQrCode && (
                      <div className="flex justify-center bg-white p-3 rounded-lg">
                        <img src={`data:image/png;base64,${c.pixQrCode}`} alt="QR PIX" className="h-40 w-40" />
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {c.invoiceUrl && (
                        <Button size="sm" className="bg-gradient-primary hover:opacity-90" asChild>
                          <a href={c.invoiceUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4 mr-1" />Pagar agora
                          </a>
                        </Button>
                      )}
                      {c.pixCopyPaste && (
                        <Button size="sm" variant="outline"
                          onClick={() => { navigator.clipboard.writeText(c.pixCopyPaste!); toast.success("PIX copiado"); }}>
                          <Copy className="h-4 w-4 mr-1" />Copiar PIX
                        </Button>
                      )}
                      {c.bankSlipUrl && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={c.bankSlipUrl} target="_blank" rel="noreferrer">
                            <FileText className="h-4 w-4 mr-1" />Boleto
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ) : null}

                {c.nfeUrl && (
                  <Button size="sm" variant="outline" className="w-full" asChild>
                    <a href={c.nfeUrl} target="_blank" rel="noreferrer">
                      <Receipt className="h-4 w-4 mr-2" />
                      Baixar nota fiscal{c.nfeNumber ? ` ${c.nfeNumber}` : ""}
                    </a>
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
