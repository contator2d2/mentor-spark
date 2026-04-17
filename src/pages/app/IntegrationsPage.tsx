import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Loader2, CheckCircle2, AlertCircle, Send, Lock } from "lucide-react";
import { toast } from "sonner";

interface WhatsappState {
  allowed: boolean;
  configured: boolean;
  provider: string;
  baseUrl: string | null;
  instanceName: string | null;
  status: string;
  phoneNumber: string | null;
  connectedAt: string | null;
}

export default function IntegrationsPage() {
  const [data, setData] = useState<WhatsappState | null>(null);
  const [form, setForm] = useState({ baseUrl: "", token: "", instanceName: "" });
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [checking, setChecking] = useState(false);

  async function load() {
    try {
      const d = await api<WhatsappState>("/integrations/whatsapp");
      setData(d);
      setForm((f) => ({
        baseUrl: d.baseUrl || f.baseUrl || "https://api.uazapi.com",
        token: "",
        instanceName: d.instanceName || f.instanceName,
      }));
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await api<{ ok: boolean; error?: string }>("/integrations/whatsapp", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        toast.error(res.error || "Erro");
        return;
      }
      toast.success("Configuração salva");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function checkStatus() {
    setChecking(true);
    try {
      const r = await api<any>("/integrations/whatsapp/status");
      toast[r.connected ? "success" : "warning"](r.connected ? "Conectado!" : "Não conectado");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setChecking(false);
    }
  }

  async function sendTest() {
    if (!testTo) return;
    try {
      const r = await api<{ ok: boolean; error?: string }>("/integrations/whatsapp/test", {
        method: "POST",
        body: { to: testTo },
      });
      r.ok ? toast.success("Mensagem enviada") : toast.error(r.error || "Falha");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  if (!data) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageCircle className="h-6 w-6 text-accent" />
        <div>
          <h1 className="font-display text-3xl font-bold">Integrações</h1>
          <p className="text-muted-foreground">Conecte seu WhatsApp e envie mensagens automáticas.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              WhatsApp
              {data.status === "connected" ? (
                <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Conectado</Badge>
              ) : (
                <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />{data.status}</Badge>
              )}
            </h2>
            <p className="text-sm text-muted-foreground">Provedor: uazapi</p>
          </div>
          {!data.allowed && (
            <Badge variant="destructive">
              <Lock className="h-3 w-3 mr-1" />
              Não incluído no seu plano
            </Badge>
          )}
        </div>

        {!data.allowed && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm">
            Seu plano atual não inclui integração com WhatsApp. Solicite um upgrade ao administrador.
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label>URL base do uazapi</Label>
            <Input
              value={form.baseUrl}
              onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
              placeholder="https://api.uazapi.com"
              disabled={!data.allowed}
            />
          </div>
          <div>
            <Label>Nome da instância</Label>
            <Input
              value={form.instanceName}
              onChange={(e) => setForm({ ...form, instanceName: e.target.value })}
              placeholder="minha-instancia"
              disabled={!data.allowed}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Token (deixe em branco para manter o atual)</Label>
            <Input
              type="password"
              value={form.token}
              onChange={(e) => setForm({ ...form, token: e.target.value })}
              placeholder="••••••••••"
              disabled={!data.allowed}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={saving || !data.allowed}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar configuração
          </Button>
          <Button variant="outline" onClick={checkStatus} disabled={checking || !data.configured}>
            {checking && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Verificar status
          </Button>
        </div>

        {data.configured && data.allowed && (
          <div className="border-t border-border pt-4 space-y-2">
            <Label>Enviar teste</Label>
            <div className="flex gap-2">
              <Input
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="5511999999999"
              />
              <Button onClick={sendTest} variant="secondary">
                <Send className="h-4 w-4 mr-2" />
                Enviar
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Documentação:{" "}
        <a href="https://docs.uazapi.com" target="_blank" rel="noreferrer" className="underline">
          docs.uazapi.com
        </a>
      </div>
    </div>
  );
}
