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
  anthropic: "claude-sonnet-4-5-20250929",
  openai_compatible: "openai/gpt-4o-mini",
};

// Modelos atualizados (2025) por provedor — usuário pode escolher ou digitar custom
const MODEL_OPTIONS: Record<ProviderType, { value: string; label: string }[]> = {
  openai: [
    { value: "gpt-5", label: "GPT-5 (mais inteligente)" },
    { value: "gpt-5-mini", label: "GPT-5 Mini (balanceado)" },
    { value: "gpt-5-nano", label: "GPT-5 Nano (rápido/barato)" },
    { value: "gpt-4.1", label: "GPT-4.1" },
    { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "o3", label: "o3 (raciocínio profundo)" },
    { value: "o4-mini", label: "o4-mini (raciocínio rápido)" },
  ],
  gemini: [
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro (top)" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (balanceado)" },
    { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (rápido)" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  ],
  anthropic: [
    { value: "claude-opus-4-5-20250929", label: "Claude Opus 4.5 (top)" },
    { value: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5 (recomendado)" },
    { value: "claude-3-7-sonnet-20250219", label: "Claude 3.7 Sonnet" },
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku (rápido)" },
  ],
  openai_compatible: [
    { value: "openai/gpt-4o-mini", label: "OpenRouter — GPT-4o Mini" },
    { value: "openai/gpt-5-mini", label: "OpenRouter — GPT-5 Mini" },
    { value: "anthropic/claude-sonnet-4.5", label: "OpenRouter — Claude Sonnet 4.5" },
    { value: "google/gemini-2.5-flash", label: "OpenRouter — Gemini 2.5 Flash" },
    { value: "meta-llama/llama-3.3-70b-instruct", label: "OpenRouter — Llama 3.3 70B" },
    { value: "deepseek/deepseek-chat", label: "OpenRouter — DeepSeek V3" },
    { value: "llama-3.3-70b-versatile", label: "Groq — Llama 3.3 70B" },
    { value: "mixtral-8x7b-32768", label: "Groq — Mixtral 8x7B" },
  ],
};

const TRANSCRIPTION_MODELS = [
  { value: "whisper-1", label: "whisper-1 (OpenAI)" },
  { value: "gpt-4o-transcribe", label: "gpt-4o-transcribe (OpenAI, melhor qualidade)" },
  { value: "gpt-4o-mini-transcribe", label: "gpt-4o-mini-transcribe (OpenAI, rápido)" },
  { value: "whisper-large-v3", label: "whisper-large-v3 (Groq, ultra rápido)" },
  { value: "whisper-large-v3-turbo", label: "whisper-large-v3-turbo (Groq)" },
];

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
                <td className="p-3 font-medium">
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.isDefault && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
                    {p.name}
                    {p.useForTranscription && (
                      <Badge variant="outline" className="text-xs">🎙️ Transcrição</Badge>
                    )}
                  </div>
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
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle>{editing ? "Editar provider" : "Novo provider de IA"}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input
                  placeholder="OpenAI Produção"
                  value={form.name || ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={form.type}
                  onValueChange={(v: ProviderType) =>
                    setForm({ ...form, type: v, model: DEFAULT_MODELS[v] })
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

              <div className="space-y-1.5 md:col-span-2">
                <Label>Modelo</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Select
                    value={
                      MODEL_OPTIONS[form.type as ProviderType]?.some((m) => m.value === form.model)
                        ? form.model
                        : "__custom__"
                    }
                    onValueChange={(v) => {
                      if (v !== "__custom__") setForm({ ...form, model: v });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Escolher modelo" /></SelectTrigger>
                    <SelectContent>
                      {MODEL_OPTIONS[form.type as ProviderType]?.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                      <SelectItem value="__custom__">✏️ Customizado (digitar abaixo)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder={DEFAULT_MODELS[form.type as ProviderType]}
                    value={form.model || ""}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>
                  API Key {editing && <span className="text-xs text-muted-foreground font-normal">(em branco = manter)</span>}
                </Label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={form.apiKey || ""}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Base URL <span className="text-xs text-muted-foreground font-normal">(opcional)</span></Label>
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

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <div>
                    <Label className="cursor-pointer">Ativo</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Disponível para uso</p>
                  </div>
                  <Switch checked={!!form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <div>
                    <Label className="cursor-pointer">Padrão global</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Chat, análise e resumos</p>
                  </div>
                  <Switch checked={!!form.isDefault} onCheckedChange={(v) => setForm({ ...form, isDefault: v })} />
                </div>
              </div>

              {(form.type === "openai" || form.type === "openai_compatible") && (
                <div className="md:col-span-2 space-y-3 pt-2">
                  <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                    <div className="pr-4">
                      <Label className="cursor-pointer">Usar para transcrição de áudio (Whisper)</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Necessário para transcrever reuniões. Só providers com endpoint <code>/audio/transcriptions</code> (OpenAI, Groq).
                      </p>
                    </div>
                    <Switch
                      checked={!!form.useForTranscription}
                      onCheckedChange={(v) => setForm({ ...form, useForTranscription: v })}
                    />
                  </div>

                  {form.useForTranscription && (
                    <div className="space-y-1.5">
                      <Label>Modelo de transcrição</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Select
                          value={
                            TRANSCRIPTION_MODELS.some((m) => m.value === form.transcriptionModel)
                              ? form.transcriptionModel
                              : "__custom__"
                          }
                          onValueChange={(v) => {
                            if (v !== "__custom__") setForm({ ...form, transcriptionModel: v });
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder="Escolher modelo" /></SelectTrigger>
                          <SelectContent>
                            {TRANSCRIPTION_MODELS.map((m) => (
                              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                            ))}
                            <SelectItem value="__custom__">✏️ Customizado</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="whisper-1"
                          value={form.transcriptionModel || ""}
                          onChange={(e) => setForm({ ...form, transcriptionModel: e.target.value })}
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border">
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
