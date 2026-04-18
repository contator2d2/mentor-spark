import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, Download, X } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/**
 * Banner discreto com dois CTAs:
 *   1) Instalar PWA (quando beforeinstallprompt dispara)
 *   2) Ativar notificações push (assina via VAPID)
 */
export function PwaPrompts() {
  const { user } = useAuth();
  const [installEvt, setInstallEvt] = useState<any>(null);
  const [pushAsked, setPushAsked] = useState(false);
  const [hidden, setHidden] = useState(() => sessionStorage.getItem("pwa-prompt-hidden") === "1");

  useEffect(() => {
    const onPrompt = (e: any) => { e.preventDefault(); setInstallEvt(e); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  useEffect(() => {
    if (!user) return;
    setPushAsked(localStorage.getItem("push-asked") === "1");
  }, [user]);

  async function install() {
    if (!installEvt) return;
    installEvt.prompt();
    const { outcome } = await installEvt.userChoice;
    if (outcome === "accepted") toast.success("App instalado!");
    setInstallEvt(null);
  }

  async function enablePush() {
    try {
      const reg: ServiceWorkerRegistration | undefined = (window as any).__swReg;
      if (!reg) { toast.error("Service worker indisponível."); return; }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { toast.error("Permissão negada."); return; }
      const { key } = await api<{ key: string }>("/push/vapid-public");
      if (!key) { toast.error("Chave VAPID não configurada."); return; }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      });
      const json = sub.toJSON() as any;
      await api("/push/subscribe", { method: "POST", body: { endpoint: json.endpoint, keys: json.keys, userAgent: navigator.userAgent } });
      localStorage.setItem("push-asked", "1");
      setPushAsked(true);
      toast.success("Notificações ativadas!");
    } catch (e: any) { toast.error(e.message || "Falha ao ativar push"); }
  }

  if (hidden || !user) return null;
  const showInstall = !!installEvt;
  const showPush = !pushAsked && "Notification" in window && Notification.permission === "default";
  if (!showInstall && !showPush) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-50 max-w-sm bg-card border border-border rounded-xl shadow-lg p-3 animate-fade-in">
      <button
        onClick={() => { sessionStorage.setItem("pwa-prompt-hidden", "1"); setHidden(true); }}
        className="absolute top-1.5 right-1.5 text-muted-foreground hover:text-foreground"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="text-sm font-semibold mb-2">Aproveite mais o MentorFlow</div>
      <div className="flex flex-col gap-2">
        {showInstall && (
          <Button size="sm" onClick={install}>
            <Download className="h-4 w-4 mr-1" /> Instalar app
          </Button>
        )}
        {showPush && (
          <Button size="sm" variant="outline" onClick={enablePush}>
            <Bell className="h-4 w-4 mr-1" /> Ativar notificações
          </Button>
        )}
      </div>
    </div>
  );
}
