// Aba: Diagnóstico e Testes — envia testes ao mentorado e lista respostas
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sparkles, Flame, Snowflake, Cloud, Send, Loader2, ClipboardList, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { ProntuarioPayload, relativeDate } from "../types";

function tempBadge(t?: string) {
  if (t === "hot")  return <Badge className="bg-orange-600 hover:bg-orange-600"><Flame className="h-3 w-3 mr-1" />Quente</Badge>;
  if (t === "warm") return <Badge className="bg-amber-500 hover:bg-amber-500"><Cloud className="h-3 w-3 mr-1" />Morno</Badge>;
  if (t === "cold") return <Badge className="bg-sky-600 hover:bg-sky-600"><Snowflake className="h-3 w-3 mr-1" />Frio</Badge>;
  return null;
}

export function TestesTab({ data, onChanged }: { data: ProntuarioPayload; onChanged?: () => void }) {
  const { tests, lead } = data;

  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [tplId, setTplId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingAssigns, setLoadingAssigns] = useState(false);

  async function loadAssignments() {
    setLoadingAssigns(true);
    try {
      const list = await api<any[]>(`/test-assignments/lead/${lead.id}`);
      setAssignments(list);
    } catch { /* ignore */ }
    finally { setLoadingAssigns(false); }
  }

  useEffect(() => { loadAssignments(); }, [lead.id]);

  async function openDialog() {
    setOpen(true);
    if (templates.length === 0) {
      try {
        const list = await api<any[]>("/tests/templates");
        setTemplates(list);
        if (list.length > 0) setTplId(list[0].id);
      } catch (e: any) { toast.error(e.message); }
    }
  }

  async function send() {
    if (!tplId) { toast.error("Selecione um teste"); return; }
    setSaving(true);
    try {
      await api("/test-assignments", {
        method: "POST",
        body: { templateId: tplId, leadId: lead.id, dueDate: dueDate || undefined },
      });
      toast.success("Teste enviado ao mentorado");
      setOpen(false);
      setDueDate("");
      loadAssignments();
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeAssignment(id: string) {
    if (!confirm("Remover este envio?")) return;
    try {
      await api(`/test-assignments/${id}`, { method: "DELETE" });
      loadAssignments();
    } catch (e: any) { toast.error(e.message); }
  }

  const pending = assignments.filter((a) => a.status !== "completed");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {tests.length} resposta{tests.length === 1 ? "" : "s"} · {pending.length} pendente{pending.length === 1 ? "" : "s"}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-primary" onClick={openDialog}>
              <Send className="h-4 w-4 mr-1" />Enviar teste
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Enviar teste ao mentorado</DialogTitle>
              <DialogDescription>{lead.name} responderá no painel /me.</DialogDescription>
            </DialogHeader>
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum teste criado. Vá em <b>Testes</b> no menu para montar um.
              </p>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Teste</Label>
                  <Select value={tplId} onValueChange={setTplId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Prazo (opcional)</Label>
                  <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={send} disabled={saving || !tplId} className="bg-gradient-primary">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Enviar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pendentes */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Pendentes</div>
          {pending.map((a) => (
            <Card key={a.id} className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <ClipboardList className="h-4 w-4 text-amber-400" />
                <span>Teste enviado em {relativeDate(a.createdAt)}</span>
                {a.dueDate && <span className="text-xs text-muted-foreground">· prazo {relativeDate(a.dueDate)}</span>}
              </div>
              <Button size="icon" variant="ghost" onClick={() => removeAssignment(a.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Respondidos */}
      {tests.length === 0 && pending.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground text-sm">
          Nenhum teste enviado. Use o botão acima para enviar o primeiro.
        </Card>
      ) : tests.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Respondidos</div>
          {tests.map((t) => (
            <Card key={t.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{t.template?.title || "Teste"}</div>
                  <div className="text-xs text-muted-foreground">{relativeDate(t.createdAt)}</div>
                </div>
                <div className="flex gap-2 items-center">
                  <Badge variant="outline">{Math.round(Number(t.scorePct))}%</Badge>
                  {tempBadge(t.classification)}
                </div>
              </div>
              {t.aiAnalysis && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap border-l-2 border-primary">
                  <div className="flex items-center gap-1 text-xs font-semibold text-primary mb-1">
                    <Sparkles className="h-3 w-3" />Análise IA
                  </div>
                  {t.aiAnalysis}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {loadingAssigns && <div className="text-xs text-muted-foreground text-center">Carregando…</div>}
    </div>
  );
}
