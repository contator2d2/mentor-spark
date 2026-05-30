import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, KeyRound, CheckCircle2, AlertCircle, ExternalLink, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface GoogleCreds {
  configured: boolean;
  clientId: string;
  clientIdMasked: string | null;
  hasSecret: boolean;
  redirectUri: string;
}

interface UazapiCreds {
  configured: boolean;
  adminUrl: string;
  hasToken: boolean;
}

export default function AdminCredentials() {
  const [google, setGoogle] = useState<GoogleCreds | null>(null);
  const [uazapi, setUazapi] = useState<UazapiCreds | null>(null);
  const [form, setForm] = useState({ clientId: "", clientSecret: "", redirectUri: "" });
  const [uazForm, setUazForm] = useState({ adminUrl: "", adminToken: "" });
  const [saving, setSaving] = useState(false);
  const [savingUaz, setSavingUaz] = useState(false);

  async function load() {
    try {
      const [g, u] = await Promise.all([
        api<GoogleCreds>("/admin/app-settings/google"),
        api<UazapiCreds>("/admin/app-settings/uazapi"),
      ]);
      setGoogle(g);
      setUazapi(u);
      const isLocalDev = /^(localhost|127\.0\.0\.1)/.test(window.location.hostname);
      const suggestedRedirect = isLocalDev
        ? `http://localhost:3001/api/integrations/google/callback`
        : `${window.location.origin}/api/integrations/google/callback`;
      setForm({ clientId: g.clientId, clientSecret: "", redirectUri: g.redirectUri || suggestedRedirect });
      setUazForm({ adminUrl: u.adminUrl || "https://api.uazapi.com", adminToken: "" });
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    try {
      await api("/admin/app-settings/google", {
        method: "POST",
        body: {
          clientId: form.clientId.trim(),
          clientSecret: form.clientSecret.trim(),
          redirectUri: (form.redirectUri || suggestedRedirect).trim(),
        },
      });
      toast.success("Credenciais salvas");
      setForm((f) => ({ ...f, clientSecret: "" }));
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveUazapi() {
    setSavingUaz(true);
    try {
      await api("/admin/app-settings/uazapi", { method: "POST", body: uazForm });
      toast.success("uazapi configurado");
      setUazForm((f) => ({ ...f, adminToken: "" }));
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingUaz(false);
    }
  }

  if (!google || !uazapi) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;

  // Em produção, o backend responde no mesmo domínio atrás de /api.
  // Em dev local, o NestJS roda em :3001 com prefixo /api.
  const isLocalDev = /^(localhost|127\.0\.0\.1)/.test(window.location.hostname);
  const suggestedRedirect = isLocalDev
    ? `http://localhost:3001/api/integrations/google/callback`
    : `${window.location.origin}/api/integrations/google/callback`;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <KeyRound className="h-6 w-6 text-accent" />
        <div>
          <h1 className="font-display text-3xl font-bold">Credenciais de Integrações</h1>
          <p className="text-muted-foreground">Configure as chaves globais usadas por todos os mentores.</p>
        </div>
      </div>

      {/* Google */}
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

         <div className="space-y-4">
           <div>
             <Label>Redirect URI Base (cole no Google Cloud)</Label>
             <Input
               value={form.redirectUri}
               onChange={(e) => setForm({ ...form, redirectUri: e.target.value })}
               placeholder={suggestedRedirect}
               className="font-mono text-xs"
             />
             {form.redirectUri && (
               <button
                 type="button"
                 onClick={() => setForm({ ...form, redirectUri: "" })}
                 className="text-xs text-primary mt-1 hover:underline"
               >
                 Limpar (usar detecção automática por domínio)
               </button>
             )}
           </div>

           <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm">
             <p className="font-semibold text-blue-400">🌐 Importante para Domínios Customizados:</p>
             <p className="text-muted-foreground mt-1">
               Para que o login do Google funcione em domínios como <b>app.alemdolucro.org</b>, você deve adicionar o URI de redirecionamento de cada domínio no console do Google Cloud:
             </p>
             <code className="block bg-black/30 p-2 mt-2 rounded font-mono text-[10px] break-all">
               https://app.alemdolucro.org/api/integrations/google/callback
             </code>
             <p className="text-xs text-muted-foreground mt-2 italic">
               * Substitua o domínio pelo domínio real do mentor. O Google exige que cada domínio que inicia o OAuth esteja na lista de URIs permitidos.
             </p>
           </div>
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

      {/* uazapi */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-emerald-400" />
              WhatsApp (uazapi)
              {uazapi.configured ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />Configurado
                </Badge>
              ) : (
                <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Não configurado</Badge>
              )}
            </h2>
            <p className="text-sm text-muted-foreground">
              Token admin global. Cada mentor cria sua própria instância automaticamente.
            </p>
          </div>
          <a
            href="https://docs.uazapi.com" target="_blank" rel="noreferrer"
            className="text-sm text-primary inline-flex items-center gap-1 hover:underline"
          >
            docs.uazapi.com <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div>
          <Label>URL base do uazapi</Label>
          <Input
            value={uazForm.adminUrl}
            onChange={(e) => setUazForm({ ...uazForm, adminUrl: e.target.value })}
            placeholder="https://api.uazapi.com"
            className="font-mono text-xs"
          />
        </div>

        <div>
          <Label>Admin Token {uazapi.hasToken && <span className="text-xs text-muted-foreground">(deixe em branco para manter o atual)</span>}</Label>
          <Input
            type="password"
            value={uazForm.adminToken}
            onChange={(e) => setUazForm({ ...uazForm, adminToken: e.target.value })}
            placeholder={uazapi.hasToken ? "••••••••••" : "uazapi-admin-token"}
          />
        </div>

        <Button onClick={saveUazapi} disabled={savingUaz || !uazForm.adminUrl}>
          {savingUaz && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Salvar uazapi
        </Button>
      </div>

      <div className="bg-card/50 border border-dashed border-border rounded-xl p-6">
        <h3 className="font-semibold mb-2">Outras integrações</h3>
        <p className="text-sm text-muted-foreground">
          • <b>OpenAI / Whisper:</b> configurado em <a href="/app/admin/ai-providers" className="text-primary hover:underline">Provedores de IA</a><br/>
          • <b>Stripe:</b> via variável de ambiente STRIPE_SECRET_KEY no backend
        </p>
      </div>
    </div>
  );
}
