import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, KeyRound, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface GoogleCreds {
  configured: boolean;
  clientId: string;
  clientIdMasked: string | null;
  hasSecret: boolean;
  redirectUri: string;
}

export default function AdminCredentials() {
  const [google, setGoogle] = useState<GoogleCreds | null>(null);
  const [form, setForm] = useState({ clientId: "", clientSecret: "", redirectUri: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const g = await api<GoogleCreds>("/admin/app-settings/google");
      setGoogle(g);
      setForm({ clientId: g.clientId, clientSecret: "", redirectUri: g.redirectUri });
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    try {
      await api("/admin/app-settings/google", { method: "POST", body: form });
      toast.success("Credenciais salvas");
      setForm((f) => ({ ...f, clientSecret: "" }));
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!google) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;

  const suggestedRedirect = `${window.location.origin.replace(/:\d+$/, ":3000").replace("5173", "3000")}/integrations/google/callback`;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <KeyRound className="h-6 w-6 text-accent" />
        <div>
          <h1 className="font-display text-3xl font-bold">Credenciais de Integrações</h1>
          <p className="text-muted-foreground">Configure as chaves OAuth globais usadas por todos os mentores.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              Google Calendar OAuth
              {google.configured ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />Configurado
                </Badge>
              ) : (
                <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Não configurado</Badge>
              )}
            </h2>
            <p className="text-sm text-muted-foreground">
              Cada mentor conecta a própria conta Google em Integrações.
            </p>
          </div>
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank" rel="noreferrer"
            className="text-sm text-primary inline-flex items-center gap-1 hover:underline"
          >
            Google Cloud Console <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="bg-muted/30 rounded-lg p-4 text-sm space-y-2">
          <p className="font-semibold">📋 Como obter:</p>
          <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
            <li>Acesse Google Cloud Console → APIs & Services → Credentials</li>
            <li>Crie um <b>OAuth 2.0 Client ID</b> tipo "Web application"</li>
            <li>Em <b>Authorized redirect URIs</b> adicione exatamente o URI abaixo</li>
            <li>Habilite a <b>Google Calendar API</b> em "Library"</li>
            <li>Cole o Client ID e Client Secret aqui</li>
          </ol>
        </div>

        <div>
          <Label>Redirect URI (cole no Google Cloud)</Label>
          <Input
            value={form.redirectUri || suggestedRedirect}
            onChange={(e) => setForm({ ...form, redirectUri: e.target.value })}
            placeholder={suggestedRedirect}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Em produção use a URL pública do backend, ex: https://api.seudominio.com/integrations/google/callback
          </p>
        </div>

        <div>
          <Label>Client ID</Label>
          <Input
            value={form.clientId}
            onChange={(e) => setForm({ ...form, clientId: e.target.value })}
            placeholder="xxxxxxxxx.apps.googleusercontent.com"
          />
        </div>

        <div>
          <Label>Client Secret {google.hasSecret && <span className="text-xs text-muted-foreground">(deixe em branco para manter o atual)</span>}</Label>
          <Input
            type="password"
            value={form.clientSecret}
            onChange={(e) => setForm({ ...form, clientSecret: e.target.value })}
            placeholder={google.hasSecret ? "••••••••••" : "GOCSPX-..."}
          />
        </div>

        <Button onClick={save} disabled={saving || !form.clientId}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Salvar credenciais
        </Button>
      </div>

      <div className="bg-card/50 border border-dashed border-border rounded-xl p-6">
        <h3 className="font-semibold mb-2">Outras integrações</h3>
        <p className="text-sm text-muted-foreground">
          • <b>OpenAI / Whisper:</b> configurado em <a href="/app/admin/ai-providers" className="text-primary hover:underline">Provedores de IA</a><br/>
          • <b>WhatsApp (uazapi):</b> cada mentor configura a própria instância em Integrações<br/>
          • <b>Stripe:</b> configurado via variável de ambiente STRIPE_SECRET_KEY no backend
        </p>
      </div>
    </div>
  );
}
