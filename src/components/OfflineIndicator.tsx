import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** Banner discreto que aparece quando o dispositivo perde conexão. */
export function OfflineIndicator() {
  const [offline, setOffline] = useState(typeof navigator !== "undefined" && !navigator.onLine);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  if (!offline) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-[60] bg-amber-500 text-amber-950 text-xs font-medium py-1 px-3 flex items-center justify-center gap-2 shadow-md">
      <WifiOff className="h-3.5 w-3.5" />
      Você está offline — algumas ações ficam pausadas até reconectar.
    </div>
  );
}
