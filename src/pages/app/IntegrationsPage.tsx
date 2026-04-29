import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
   MessageCircle, Loader2, CheckCircle2, AlertCircle, Send, Lock, Calendar, Link2, Unlink,
   QrCode, RefreshCw, Trash2, Smartphone, Plus,
} from "lucide-react";
import { toast } from "sonner";
import PaymentProvidersSection from "@/components/payments/PaymentProvidersSection";

 interface WhatsappInstance {
   id: string;
   name: string;
   status: 'connected' | 'disconnected' | 'provisioned';
   phoneNumber: string | null;
   isDefault: boolean;
 }
 
 interface WhatsappState {
   allowed: boolean;
   adminConfigured: boolean;
   instances: WhatsappInstance[];
   maxInstances: number;
   provisioned: boolean; // para compatibilidade legada se necessário
   status: string;      // para compatibilidade legada se necessário
   phoneNumber: string | null; // para compatibilidade legada se necessário
 }

interface GoogleState {
  credsConfigured: boolean;
  connected: boolean;
  hasRefreshToken: boolean;
}

export default function IntegrationsPage() {
   const [data, setData] = useState<WhatsappState | null>(null);
   const [instances, setInstances] = useState<WhatsappInstance[]>([]);
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
       setInstances(d.instances || []);
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

   async function connectWhatsapp(name?: string) {
     setBusy(true);
     try {
       const r = await api<{ ok: boolean; error?: string; instanceId?: string }>("/integrations/whatsapp/provision", { 
         method: "POST",
         body: { name: name || `Conexão ${instances.length + 1}` }
       });
       if (!r.ok) { toast.error(r.error || "Falha ao criar instância"); return; }
       await load();
       if (r.instanceId) await fetchQr(r.instanceId);
       else await fetchQr();
     } catch (e: any) { toast.error(e.message); }
     finally { setBusy(false); }
   }

   const [activeInstanceId, setActiveInstanceId] = useState<string | null>(null);

   async function fetchQr(instanceId?: string) {
     setLoadingQr(true);
     setQr(null);
     if (instanceId) setActiveInstanceId(instanceId);
     try {
       const path = instanceId ? `/integrations/whatsapp/${instanceId}/qrcode` : "/integrations/whatsapp/qrcode";
       const r = await api<{ ok: boolean; qrcode?: string; connected?: boolean; error?: string }>(path);
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

   async function disconnectWhatsapp(instanceId?: string) {
     if (!confirm("Remover esta conexão de WhatsApp?")) return;
     setBusy(true);
     try {
       const path = instanceId ? `/integrations/whatsapp/${instanceId}` : "/integrations/whatsapp";
       await api(path, { method: "DELETE" });
       toast.success("Conexão removida");
       setQr(null);
       setActiveInstanceId(null);
       load();
     } catch (e: any) { toast.error(e.message); }
     finally { setBusy(false); }
   }

   async function setDefaultInstance(instanceId: string) {
     try {
       await api(`/integrations/whatsapp/${instanceId}/default`, { method: "PATCH" });
       toast.success("Conexão padrão atualizada");
       load();
     } catch (e: any) { toast.error(e.message); }
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
               WhatsApp Multi-Conexão
             </h2>
             <p className="text-sm text-muted-foreground">
               Gerencie múltiplas contas do WhatsApp para seus disparos e automações.
             </p>
           </div>
           <div className="flex flex-col items-end gap-2">
             {!data.allowed ? (
               <Badge variant="destructive"><Lock className="h-3 w-3 mr-1" />Não incluído</Badge>
             ) : (
               <Badge variant="secondary">Plano: {instances.length}/{data.maxInstances || 1} conexões</Badge>
             )}
           </div>
         </div>

         {qr && (
           <div className="bg-muted/30 border rounded-xl p-6 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
              <div className="bg-white p-4 rounded-xl shadow-lg">
                <img src={qr} alt="QR Code" className="w-48 h-48" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">Escaneie para conectar</p>
                <p className="text-xs text-muted-foreground">O sistema detectará a conexão automaticamente.</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => fetchQr(activeInstanceId || undefined)} disabled={loadingQr}>
                  {loadingQr ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />} Atualizar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setQr(null)}>Fechar</Button>
              </div>
           </div>
         )}

         {!data.allowed ? (
           <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm text-center">
             Seu plano atual não inclui integração com WhatsApp. Entre em contato para upgrade.
           </div>
         ) : !data.adminConfigured ? (
           <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-sm">
             <p className="font-semibold text-amber-400 text-center">⚠️ Aguardando configuração do sistema</p>
           </div>
         ) : (
           <div className="space-y-4">
             <div className="grid gap-3">
               {instances.length === 0 ? (
                 <div className="text-center py-8 border border-dashed rounded-xl bg-muted/20">
                    <p className="text-sm text-muted-foreground">Nenhuma conexão ativa.</p>
                    <Button onClick={() => connectWhatsapp()} className="mt-4" disabled={busy}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                      Criar Primeira Conexão
                    </Button>
                 </div>
               ) : (
                 <>
                   {instances.map((inst) => (
                     <div key={inst.id} className="flex items-center justify-between p-4 border rounded-xl bg-card hover:border-primary/40 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${inst.status === 'connected' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                            <Smartphone className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{inst.name}</span>
                              {inst.isDefault && <Badge className="text-[10px] bg-emerald-600">Padrao</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {inst.status === 'connected' ? `Conectado: +${inst.phoneNumber}` : inst.status === 'provisioned' ? 'Aguardando QR' : 'Desconectado'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {inst.status !== 'connected' && (
                            <Button size="sm" variant="outline" onClick={() => fetchQr(inst.id)} disabled={loadingQr}>
                              <QrCode className="h-4 w-4 mr-1" /> Conectar
                            </Button>
                          )}
                          {!inst.isDefault && inst.status === 'connected' && (
                            <Button size="sm" variant="ghost" onClick={() => setDefaultInstance(inst.id)}>Definir Padrão</Button>
                          )}
                          <Button size="icon" variant="ghost" className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => disconnectWhatsapp(inst.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                     </div>
                   ))}
                   {instances.length < (data.maxInstances || 1) && (
                     <Button variant="outline" className="border-dashed" onClick={() => connectWhatsapp()} disabled={busy}>
                       <Plus className="h-4 w-4 mr-2" /> Adicionar nova conexão
                     </Button>
                   )}
                 </>
               )}
             </div>

             {instances.some(i => i.status === 'connected') && (
                <div className="border-t pt-4 mt-2">
                  <Label className="text-xs mb-2 block">Enviar teste da conexão padrão</Label>
                  <div className="flex gap-2">
                    <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="5511999999999" className="max-w-[200px]" />
                    <Button onClick={sendTest} size="sm" variant="secondary"><Send className="h-4 w-4 mr-2" />Testar</Button>
                  </div>
                </div>
             )}
           </div>
         )}
      </div>

      {/* PAGAMENTOS DE EVENTOS */}
      <PaymentProvidersSection />
    </div>
  );
}
