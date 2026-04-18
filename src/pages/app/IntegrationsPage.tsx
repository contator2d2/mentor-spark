import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle, Loader2, CheckCircle2, AlertCircle, Send, Lock, Calendar, Link2, Unlink,
  QrCode, RefreshCw, Trash2, Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import PaymentProvidersSection from "@/components/payments/PaymentProvidersSection";

interface WhatsappState {
  allowed: boolean;
  adminConfigured: boolean;
  provisioned: boolean;
  provider: string;
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
  const [qr, setQr] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [params, setParams] = useSearchParams();

  async function load() {
    try {
      const [d, g] = await Promise.all([
        api<WhatsappState>("/integrations/whatsapp"),
        api<GoogleState>("/integrations/google/status"),
      ]);
      setData(d);
      setGoogle(g);
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  useEffect(() => { load(); }, []);

  // Polling de status enquanto QR aberto
  useEffect(() => {
    if (!qr) return;
    const t = setInterval(async () => {
      try {
        const r = await api<{ connected: boolean; phoneNumber?: string }>("/integrations/whatsapp/status");
        if (r.connected) {
          toast.success("WhatsApp conectado!");
          setQr(null);
          load();
        }
      } catch {}
    }, 4000);
    return () => clearInterval(t);
  }, [qr]);

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

  async function connectWhatsapp() {
    setBusy(true);
    try {
      const r = await api<{ ok: boolean; error?: string }>("/integrations/whatsapp/provision", { method: "POST" });
      if (!r.ok) { toast.error(r.error || "Falha ao criar instância"); return; }
      await load();
      await fetchQr();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  async function fetchQr() {
    setLoadingQr(true);
    setQr(null);
    try {
      const r = await api<{ ok: boolean; qrcode?: string; connected?: boolean; error?: string }>("/integrations/whatsapp/qrcode");
      if (!r.ok) { toast.error(r.error || "Não foi possível obter QR"); return; }
      if (r.connected) {
        toast.success("Já conectado");
        load();
        return;
      }
      if (r.qrcode) setQr(r.qrcode);
      else toast.warning("QR ainda não disponível, tente novamente em alguns segundos");
    } catch (e: any) { toast.error(e.message); }
    finally { setLoadingQr(false); }
  }

  async function disconnectWhatsapp() {
    if (!confirm("Desconectar WhatsApp? Você precisará escanear um novo QR Code.")) return;
    setBusy(true);
    try {
      await api("/integrations/whatsapp", { method: "DELETE" });
      toast.success("Desconectado");
      setQr(null);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
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

  const isConnected = data.status === "connected";

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
              O super admin ainda não cadastrou as credenciais Google OAuth.
            </p>
          </div>
        ) : google.connected ? (
          <Button variant="outline" onClick={googleDisconnect}>
            <Unlink className="h-4 w-4 mr-2" />Desconectar
          </Button>
        ) : (
          <Button onClick={googleConnect}>
            <Link2 className="h-4 w-4 mr-2" />Conectar minha conta Google
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
              {isConnected ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-600"><CheckCircle2 className="h-3 w-3 mr-1" />Conectado</Badge>
              ) : data.provisioned ? (
                <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Aguardando QR</Badge>
              ) : (
                <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Desconectado</Badge>
              )}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isConnected && data.phoneNumber
                ? <>Número conectado: <b className="text-foreground">+{data.phoneNumber}</b></>
                : "Conecte seu WhatsApp escaneando o QR Code com o celular."}
            </p>
          </div>
          {!data.allowed && (
            <Badge variant="destructive">
              <Lock className="h-3 w-3 mr-1" />
              Não incluído no seu plano
            </Badge>
          )}
        </div>

        {!data.allowed ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm">
            Seu plano atual não inclui integração com WhatsApp. Solicite um upgrade ao administrador.
          </div>
        ) : !data.adminConfigured ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-sm">
            <p className="font-semibold text-amber-400">⚠️ Aguardando configuração do administrador</p>
            <p className="text-muted-foreground mt-1">
              O super admin ainda não cadastrou as credenciais do uazapi.
            </p>
          </div>
        ) : (
          <>
            {/* Estado: nada provisionado */}
            {!data.provisioned && (
              <Button onClick={connectWhatsapp} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Smartphone className="h-4 w-4 mr-2" />}
                Conectar WhatsApp
              </Button>
            )}

            {/* Estado: provisionado mas não conectado — mostrar/atualizar QR */}
            {data.provisioned && !isConnected && (
              <div className="space-y-4">
                {qr ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="bg-white p-4 rounded-xl">
                      <img src={qr} alt="QR Code WhatsApp" className="w-64 h-64 object-contain" />
                    </div>
                    <p className="text-xs text-muted-foreground text-center max-w-sm">
                      Abra o WhatsApp no celular → ⋮ → Aparelhos conectados → Conectar aparelho
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={fetchQr} disabled={loadingQr}>
                        {loadingQr ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                        Atualizar QR
                      </Button>
                      <Button variant="outline" size="sm" onClick={disconnectWhatsapp} disabled={busy}>
                        <Trash2 className="h-3 w-3 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={fetchQr} disabled={loadingQr}>
                      {loadingQr ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <QrCode className="h-4 w-4 mr-2" />}
                      Mostrar QR Code
                    </Button>
                    <Button variant="outline" onClick={disconnectWhatsapp} disabled={busy}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remover instância
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Estado: conectado */}
            {isConnected && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={disconnectWhatsapp} disabled={busy}>
                    <Unlink className="h-4 w-4 mr-2" />
                    Desconectar e gerar novo QR
                  </Button>
                </div>
                <div className="border-t border-border pt-4 space-y-2">
                  <Label>Enviar teste</Label>
                  <div className="flex gap-2">
                    <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="5511999999999" />
                    <Button onClick={sendTest} variant="secondary"><Send className="h-4 w-4 mr-2" />Enviar</Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* PAGAMENTOS DE EVENTOS */}
      <PaymentProvidersSection />
    </div>
  );
}
