import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// PWA: registra service worker em produção
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      // Solicita permissão e tenta inscrever push
      try {
        if ("PushManager" in window && Notification.permission === "default") {
          // Não pede automaticamente — esperamos o usuário clicar em "Ativar notificações"
        }
        // Expõe globalmente para o componente de prompt
        (window as any).__swReg = reg;
      } catch {}
    }).catch((err) => console.warn("SW registration failed:", err));
  });
}
