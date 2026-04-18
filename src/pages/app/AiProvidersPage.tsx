import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Zap, Star, Pencil } from "lucide-react";
import { toast } from "sonner";

type ProviderType = "openai" | "gemini" | "anthropic" | "openai_compatible";

interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  apiKey: string;
  baseUrl?: string;
  model: string;
  enabled: boolean;
  isDefault: boolean;
  useForTranscription: boolean;
  transcriptionModel?: string;
  createdAt: string;
}

const TYPE_LABELS: Record<ProviderType, string> = {
  openai: "OpenAI",
  gemini: "Google Gemini",
  anthropic: "Anthropic Claude",
  openai_compatible: "OpenAI compatível (OpenRouter, Groq, etc.)",
};

const DEFAULT_MODELS: Record<ProviderType, string> = {
  openai: "gpt-4o-mini",
  gemini: "gemini-2.5-flash",
  anthropic: "claude-3-5-sonnet-20241022",
  openai_compatible: "openai/gpt-4o-mini",
};

const emptyForm: Partial<Provider> = {
  name: "",
  type: "openai",
  apiKey: "",
  baseUrl: "",
  model: "gpt-4o-mini",
  enabled: true,
  isDefault: false,
  useForTranscription: false,
  transcriptionModel: "whisper-1",
};

export default function AiProvidersPage() {
  const [items, setItems] = useState<Provider[] | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [form, setForm] = useState<Partial<Provider>>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  async function load() {
    const data = await api<Provider[]>("/admin/ai-providers");
    setItems(data);
  }
  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(p: Provider) {
    setEditing(p);
    setForm({ ...p, apiKey: "" }); // não pré-preenche a chave por segurança
    setOpen(true);
  }

  async function save() {
    if (!form.name || !form.model) {
      toast.error("Preencha nome e modelo");
      return;
    }
    if (!editing && !form.apiKey) {
      toast.error("Informe a API key");
      return;
    }
    setSaving(true);
    try {
      const body: any = { ...form };
      if (editing && !body.apiKey) delete body.apiKey; // mantém chave existente
      if (editing) {
        await api(`/admin/ai-providers/${editing.id}`, { method: "PATCH", body });
      } else {
        await api("/admin/ai-providers", { method: "POST", body });
      }
      toast.success("Salvo");
      setOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remover este provider?")) return;
    await api(`/admin/ai-providers/${id}`, { method: "DELETE" });
    toast.success("Removido");
    load();
  }

  async function setDefault(p: Provider) {
    await api(`/admin/ai-providers/${p.id}`, { method: "PATCH", body: { isDefault: true } });
    toast.success(`${p.name} é o provider padrão`);
    load();
  }

  async function test(p: Provider) {
    setTestingId(p.id);
    try {
      const r = await api<{ ok: boolean; reply?: string; error?: string }>(`/admin/ai-providers/${p.id}/test`, { method: "POST" });
      if (r.ok) toast.success(`OK: ${r.reply?.slice(0, 120)}`);
      else toast.error(`Falhou: ${r.error}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTestingId(null);
    }
  }

  if (!items) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Provedores de IA</h1>
          <p className="text-muted-foreground mt-1">
            Configure OpenAI, Gemini, Anthropic ou qualquer endpoint OpenAI-compatible. O provedor marcado como padrão é usado em toda a plataforma.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          Novo provider
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">Tipo</th>
              <th className="text-left p-3">Modelo</th>
              <th className="text-left p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  Nenhum provider cadastrado. Clique em "Novo provider" para começar.
                </td>
              </tr>
            )}
            {items.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3 font-medium flex items-center gap-2">
                  {p.isDefault && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
                  {p.name}
                </td>
                <td className="p-3 text-muted-foreground">{TYPE_LABELS[p.type]}</td>
                <td className="p-3 font-mono text-xs">{p.model}</td>
                <td className="p-3">
                  {p.enabled ? (
                    <Badge variant="default">Ativo</Badge>
                  ) : (
                    <Badge variant="secondary">Desativado</Badge>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => test(p)} disabled={testingId === p.id}>
                      {testingId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                    </Button>
                    {!p.isDefault && (
                      <Button size="sm" variant="outline" onClick={() => setDefault(p)}>
                        <Star className="h-3 w-3 mr-1" />
                        Padrão
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => remove(p.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar provider" : "Novo provider de IA"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="OpenAI Produção"
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(v: ProviderType) =>
                  setForm({ ...form, type: v, model: form.model || DEFAULT_MODELS[v] })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABELS) as ProviderType[]).map((k) => (
                    <SelectItem key={k} value={k}>{TYPE_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input
                placeholder={DEFAULT_MODELS[form.type as ProviderType]}
                value={form.model || ""}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>API Key {editing && <span className="text-xs text-muted-foreground">(deixe em branco para manter a atual)</span>}</Label>
              <Input
                type="password"
                placeholder="sk-..."
                value={form.apiKey || ""}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              />
            </div>
            {(form.type === "openai_compatible" || form.type === "openai" || form.type === "anthropic" || form.type === "gemini") && (
              <div className="space-y-2">
                <Label>Base URL <span className="text-xs text-muted-foreground">(opcional — só preencha para endpoints customizados)</span></Label>
                <Input
                  placeholder={
                    form.type === "openai" ? "https://api.openai.com/v1" :
                    form.type === "gemini" ? "https://generativelanguage.googleapis.com/v1beta" :
                    form.type === "anthropic" ? "https://api.anthropic.com/v1" :
                    "https://openrouter.ai/api/v1"
                  }
                  value={form.baseUrl || ""}
                  onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch checked={!!form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Definir como padrão global</Label>
              <Switch checked={!!form.isDefault} onCheckedChange={(v) => setForm({ ...form, isDefault: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
