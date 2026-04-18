import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Loader2, CheckCircle2, AlertCircle, Send, Lock, Calendar, Link2, Unlink } from "lucide-react";
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

interface GoogleState {
  credsConfigured: boolean;
  connected: boolean;
  hasRefreshToken: boolean;
}

export default function IntegrationsPage() {
  const [data, setData] = useState<WhatsappState | null>(null);
  const [google, setGoogle] = useState<GoogleState | null>(null);
  const [form, setForm] = useState({ baseUrl: "", token: "", instanceName: "" });
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [checking, setChecking] = useState(false);
  const [params, setParams] = useSearchParams();

  async function load() {
    try {
      const [d, g] = await Promise.all([
        api<WhatsappState>("/integrations/whatsapp"),
        api<GoogleState>("/integrations/google/status"),
      ]);
      setData(d);
      setGoogle(g);
      setForm((f) => ({
        baseUrl: d.baseUrl || f.baseUrl || "https://api.uazapi.com",
        token: "",
        instanceName: d.instanceName || f.instanceName,
      }));
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  useEffect(() => { load(); }, []);

  // Detecta retorno do OAuth Google
  useEffect(() => {
    const g = params.get("google");
    if (g === "ok") {
      toast.success("Google Calendar conectado!");
      params.delete("google");
      setParams(params);
      load();
    } else if (g === "error") {
      toast.error("Falha ao conectar: " + (params.get("msg") || "erro desconhecido"));
      params.delete("google");
      params.delete("msg");
      setParams(params);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await api<{ ok: boolean; error?: string }>("/integrations/whatsapp", { method: "POST", body: form });
      if (!res.ok) { toast.error(res.error || "Erro"); return; }
      toast.success("Configuração salva");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function checkStatus() {
    setChecking(true);
    try {
      const r = await api<any>("/integrations/whatsapp/status");
      toast[r.connected ? "success" : "warning"](r.connected ? "Conectado!" : "Não conectado");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setChecking(false); }
  }

  async function sendTest() {
    if (!testTo) return;
    try {
      const r = await api<{ ok: boolean; error?: string }>("/integrations/whatsapp/test", { method: "POST", body: { to: testTo } });
      r.ok ? toast.success("Mensagem enviada") : toast.error(r.error || "Falha");
    } catch (e: any) { toast.error(e.message); }
  }

  async function googleConnect() {
    try {
      const r = await api<{ url: string }>("/integrations/google/connect", { method: "POST" });
      window.location.href = r.url;
    } catch (e: any) { toast.error(e.message); }
  }

  async function googleDisconnect() {
    if (!confirm("Desconectar sua conta Google?")) return;
    try {
      await api("/integrations/google", { method: "DELETE" });
      toast.success("Desconectado");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  if (!data || !google) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageCircle className="h-6 w-6 text-accent" />
        <div>
          <h1 className="font-display text-3xl font-bold">Integrações</h1>
          <p className="text-muted-foreground">Conecte WhatsApp, Google Calendar e mais.</p>
        </div>
      </div>

      {/* GOOGLE CALENDAR */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-400" />
              Google Calendar
              {google.connected ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-600"><CheckCircle2 className="h-3 w-3 mr-1" />Conectado</Badge>
              ) : (
                <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Não conectado</Badge>
              )}
            </h2>
            <p className="text-sm text-muted-foreground">
              Sincroniza reuniões agendadas no MentorFlow com seu Google Calendar.
            </p>
          </div>
        </div>

        {!google.credsConfigured ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-sm">
            <p className="font-semibold text-amber-400">⚠️ Aguardando configuração do administrador</p>
            <p className="text-muted-foreground mt-1">
              O super admin ainda não cadastrou as credenciais Google OAuth. Sem isso, esta integração fica indisponível para todos os mentores.
            </p>
          </div>
        ) : google.connected ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={googleDisconnect}>
              <Unlink className="h-4 w-4 mr-2" />
              Desconectar
            </Button>
          </div>
        ) : (
          <Button onClick={googleConnect}>
            <Link2 className="h-4 w-4 mr-2" />
            Conectar minha conta Google
          </Button>
        )}
      </div>

      {/* WHATSAPP */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-emerald-400" />
              WhatsApp
              {data.status === "connected" ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-600"><CheckCircle2 className="h-3 w-3 mr-1" />Conectado</Badge>
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
            <Input value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} placeholder="https://api.uazapi.com" disabled={!data.allowed} />
          </div>
          <div>
            <Label>Nome da instância</Label>
            <Input value={form.instanceName} onChange={(e) => setForm({ ...form, instanceName: e.target.value })} placeholder="minha-instancia" disabled={!data.allowed} />
          </div>
          <div className="md:col-span-2">
            <Label>Token (deixe em branco para manter o atual)</Label>
            <Input type="password" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} placeholder="••••••••••" disabled={!data.allowed} />
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
              <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="5511999999999" />
              <Button onClick={sendTest} variant="secondary"><Send className="h-4 w-4 mr-2" />Enviar</Button>
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Documentação uazapi:{" "}
        <a href="https://docs.uazapi.com" target="_blank" rel="noreferrer" className="underline">docs.uazapi.com</a>
      </div>
    </div>
  );
}
