import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, X, CheckCircle2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onCheckedIn: () => void;
}

export default function CheckinScanner({ open, onClose, onCheckedIn }: Props) {
  const [active, setActive] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [lastResult, setLastResult] = useState<{ ok: boolean; name?: string; msg: string } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const elemId = "qr-reader";

  useEffect(() => {
    if (!open) return;
    setActive(true);
    return () => { stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!active) return;
    const scanner = new Html5Qrcode(elemId);
    scannerRef.current = scanner;
    scanner
      .start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } },
        (text) => handleCode(text),
        () => {})
      .catch((e) => {
        toast.error("Não foi possível acessar a câmera: " + e.message);
        setActive(false);
      });
    return () => { stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function stop() {
    try {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => null).then(() => scannerRef.current?.clear());
      }
    } catch {}
    scannerRef.current = null;
  }

  let processing = false;
  async function handleCode(code: string) {
    if (processing) return;
    processing = true;
    try {
      const res = await api<any>(`/events/checkin/${code}`, { method: "POST" });
      setLastResult({ ok: true, name: res.registration?.name, msg: res.alreadyCheckedIn ? "Já fez check-in" : "Check-in OK!" });
      onCheckedIn();
      toast.success(`✓ ${res.registration?.name}`);
    } catch (e: any) {
      setLastResult({ ok: false, msg: e.message });
      toast.error(e.message);
    } finally {
      setTimeout(() => { processing = false; }, 1500);
    }
  }

  async function manual() {
    if (!manualCode.trim()) return;
    await handleCode(manualCode.trim().toUpperCase());
    setManualCode("");
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border/40">
        <div className="font-display text-lg flex items-center gap-2"><Camera className="h-5 w-5 text-primary" /> Scanner de check-in</div>
        <Button variant="ghost" size="icon" onClick={() => { stop(); onClose(); }}><X className="h-5 w-5" /></Button>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div id={elemId} className="max-w-md mx-auto rounded-2xl overflow-hidden bg-black aspect-square" />
        {lastResult && (
          <div className={`max-w-md mx-auto rounded-xl p-4 flex items-start gap-3 ${lastResult.ok ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-rose-500/10 border border-rose-500/30"}`}>
            {lastResult.ok ? <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" /> : <AlertCircle className="h-5 w-5 text-rose-500 mt-0.5" />}
            <div>
              {lastResult.name && <div className="font-semibold">{lastResult.name}</div>}
              <div className="text-sm">{lastResult.msg}</div>
            </div>
          </div>
        )}
        <div className="max-w-md mx-auto pt-4 border-t border-border/40">
          <div className="text-xs text-muted-foreground mb-2">Ou digite o código manualmente:</div>
          <div className="flex gap-2">
            <Input value={manualCode} onChange={(e) => setManualCode(e.target.value.toUpperCase())} placeholder="ABCDE12345" className="uppercase font-mono" />
            <Button onClick={manual} className="bg-gradient-primary hover:opacity-90">Validar</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
