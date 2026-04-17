import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Send } from "lucide-react";
import { toast } from "sonner";

export default function AiAssistant() {
  const [config, setConfig] = useState<any>(null);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api("/ai/config").then(setConfig);
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function saveConfig() {
    await api("/ai/config", { method: "PUT", body: config });
    toast.success("Configuração salva");
  }

  async function send() {
    if (!input.trim()) return;
    const msg = input;
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setInput("");
    setSending(true);
    try {
      const r = await api<{ reply: string }>("/ai/chat", { method: "POST", body: { message: msg } });
      setMessages((m) => [...m, { role: "assistant", content: r.reply }]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  }

  if (!config) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Assistente IA</h1>
          <p className="text-muted-foreground mt-1">Personalize como sua IA pensa.</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-soft">
          <div className="space-y-2"><Label>Prompt base (como você pensa)</Label><Textarea rows={4} value={config.systemPrompt || ""} onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })} /></div>
          <div className="space-y-2"><Label>Metodologia</Label><Textarea rows={3} value={config.methodology || ""} onChange={(e) => setConfig({ ...config, methodology: e.target.value })} /></div>
          <div className="space-y-2"><Label>Estilo de resposta</Label><Input value={config.responseStyle || ""} onChange={(e) => setConfig({ ...config, responseStyle: e.target.value })} /></div>
          <div className="space-y-2"><Label>Áreas de foco</Label><Input value={config.focusAreas || ""} onChange={(e) => setConfig({ ...config, focusAreas: e.target.value })} /></div>
          <Button onClick={saveConfig}><Sparkles className="h-4 w-4 mr-2" />Salvar</Button>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl shadow-soft flex flex-col h-[600px]">
        <div className="px-5 py-4 border-b border-border font-semibold">Chat com sua IA</div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {messages.length === 0 && <p className="text-sm text-muted-foreground text-center mt-10">Faça uma pergunta para começar.</p>}
          {messages.map((m, i) => (
            <div key={i} className={`max-w-[85%] p-3 rounded-lg text-sm whitespace-pre-wrap ${m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}>
              {m.content}
            </div>
          ))}
          {sending && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          <div ref={endRef} />
        </div>
        <div className="p-3 border-t border-border flex gap-2">
          <Input placeholder="Pergunte algo..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
          <Button onClick={send} disabled={sending}><Send className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
