import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Sparkles, Send, BookMarked, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface PromptItem { id: string; title: string; body: string; category?: string; }

export default function AiAssistant() {
  const [config, setConfig] = useState<any>(null);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api("/ai/config").then(setConfig);
    api<PromptItem[]>("/prompts").then(setPrompts).catch(() => {});
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function saveConfig() {
    await api("/ai/config", { method: "PUT", body: config });
    toast.success("Configuração salva");
  }

  async function toggleEnabled(value: boolean) {
    const next = { ...config, aiEnabled: value };
    setConfig(next);
    try {
      await api("/ai/config", { method: "PUT", body: { aiEnabled: value } });
      toast.success(value ? "Assistente IA ativado" : "Assistente IA desativado");
    } catch (e: any) {
      toast.error(e.message);
      setConfig({ ...config, aiEnabled: !value });
    }
  }

  async function send(text?: string) {
    const msg = (text || input).trim();
    if (!msg) return;
    if (config?.aiEnabled === false) {
      toast.error("Ative o Assistente IA para conversar");
      return;
    }
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

  const aiOff = config.aiEnabled === false;

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Assistente IA</h1>
          <p className="text-muted-foreground mt-1">Personalize como sua IA pensa.</p>
        </div>

        <div className={`bg-card border rounded-xl p-5 flex items-center justify-between gap-4 transition-colors ${aiOff ? "border-destructive/40 bg-destructive/5" : "border-border"}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${aiOff ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
              {aiOff ? <PowerOff className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
            </div>
            <div>
              <div className="font-semibold">{aiOff ? "Assistente IA desativado" : "Assistente IA ativo"}</div>
              <div className="text-xs text-muted-foreground">
                {aiOff
                  ? "Nenhuma chamada de IA será feita (chat, análises, resumos de reunião)."
                  : "Chat, análise de testes e resumos de reunião usando IA."}
              </div>
            </div>
          </div>
          <Switch checked={!aiOff} onCheckedChange={toggleEnabled} />
        </div>

         <div className={`bg-card border border-border rounded-xl p-6 space-y-4 shadow-soft ${aiOff ? "opacity-60 pointer-events-none" : ""}`}>
           <div className="space-y-2">
             <Label>Prompt base (como você pensa)</Label>
             <Textarea rows={4} value={config.systemPrompt || ""} onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })} />
           </div>
           <div className="space-y-2">
             <Label>Sua Metodologia</Label>
             <Textarea 
               rows={6} 
               placeholder="Descreva seus princípios e método. A IA usará isso para responder como se fosse você."
               value={config.methodology || ""} 
               onChange={(e) => setConfig({ ...config, methodology: e.target.value })} 
             />
           </div>
           <div className="space-y-2">
             <Label>Estilo de resposta</Label>
             <Input value={config.responseStyle || ""} onChange={(e) => setConfig({ ...config, responseStyle: e.target.value })} />
           </div>
           <div className="space-y-2">
             <Label>Áreas de foco</Label>
             <Input value={config.focusAreas || ""} onChange={(e) => setConfig({ ...config, focusAreas: e.target.value })} />
           </div>
           <Button onClick={saveConfig}><Sparkles className="h-4 w-4 mr-2" />Salvar Metodologia</Button>
         </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-soft flex flex-col h-[600px]">
        <div className="px-5 py-4 border-b border-border font-semibold flex items-center justify-between">
          <span>Chat com sua IA</span>
          {aiOff && <span className="text-xs text-destructive font-normal">IA desativada</span>}
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center mt-10">
              {aiOff ? "Ative o Assistente IA acima para começar." : "Faça uma pergunta para começar."}
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`max-w-[85%] p-3 rounded-lg text-sm whitespace-pre-wrap ${m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}>
              {m.content}
            </div>
          ))}
          {sending && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          <div ref={endRef} />
        </div>
        <div className="p-3 border-t border-border flex gap-2">
          {prompts.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" title="Usar prompt salvo" disabled={aiOff}><BookMarked className="h-4 w-4" /></Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2 max-h-60 overflow-y-auto" align="start">
                {prompts.map((p) => (
                  <button
                    key={p.id}
                    className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors"
                    onClick={() => { setInput(p.body); }}
                  >
                    <div className="font-medium">{p.title}</div>
                    {p.category && <div className="text-[10px] text-muted-foreground">{p.category}</div>}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          )}
          <Input placeholder={aiOff ? "Ative a IA para conversar..." : "Pergunte algo..."} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} disabled={aiOff} />
          <Button onClick={() => send()} disabled={sending || aiOff}><Send className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
