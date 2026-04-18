import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Plus, FileText, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Tpl { id: string; name: string; body: string; isActive: boolean; }

const PLACEHOLDERS = "{{nome}} {{cpf}} {{rg}} {{endereco}} {{cidade}} {{estado}} {{cep}} {{empresa}} {{cnpj}} {{empresa_endereco}} {{segmento}} {{faturamento}} {{mentor_nome}} {{mentor_marca}} {{plano_nome}} {{valor_plano}} {{data_hoje}}";

const SAMPLE = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MENTORIA

CONTRATANTE: {{nome}}, CPF {{cpf}}, residente em {{endereco}}, {{cidade}}/{{estado}}, CEP {{cep}}, doravante denominado MENTORADO.

CONTRATADA: {{mentor_marca}}, representada por {{mentor_nome}}, doravante denominada MENTORA.

OBJETO: Prestação de serviços de mentoria empresarial referente ao plano {{plano_nome}} no valor mensal de {{valor_plano}}.

EMPRESA DO MENTORADO: {{empresa}} (CNPJ {{cnpj}}), localizada em {{empresa_endereco}}, segmento {{segmento}}.

VIGÊNCIA: 12 (doze) meses a partir de {{data_hoje}}.

Por estarem assim justos e contratados, firmam o presente instrumento.`;

export default function ContractTemplatesPage() {
  const [items, setItems] = useState<Tpl[] | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tpl | null>(null);
  const [form, setForm] = useState({ name: "", body: SAMPLE, isActive: true });
  const [saving, setSaving] = useState(false);

  async function load() {
    try { setItems(await api<Tpl[]>("/contracts/templates")); }
    catch (e: any) { toast.error(e.message); }
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm({ name: "", body: SAMPLE, isActive: true }); setOpen(true); }
  function openEdit(t: Tpl) { setEditing(t); setForm({ name: t.name, body: t.body, isActive: t.isActive }); setOpen(true); }

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
            <p className="text-muted-foreground mt-2 max-w-lg">Use placeholders como {`{{nome}}`}, {`{{cnpj}}`} — eles são substituídos automaticamente ao gerar o PDF.</p>
          </div>
          <Button onClick={openNew} className="bg-gradient-primary hover:opacity-90 shadow-glow"><Plus className="mr-2 h-4 w-4" />Novo template</Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="glass-card border-dashed"><CardContent className="py-16 text-center text-muted-foreground">Nenhum template. Crie o primeiro!</CardContent></Card>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-card border-border/60 max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display">{editing ? "Editar template" : "Novo template"}</DialogTitle>
            <DialogDescription className="text-xs">Placeholders disponíveis: <code className="text-primary">{PLACEHOLDERS}</code></DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Corpo do contrato *</Label><Textarea rows={16} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="font-mono text-xs" /></div>
          </div>
          <DialogFooter>
            <Button onClick={save} disabled={saving || !form.name || !form.body} className="bg-gradient-primary hover:opacity-90">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
