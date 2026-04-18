import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Props { open: boolean; onClose: () => void; eventId?: string; }

export default function StartQuizDialog({ open, onClose, eventId }: Props) {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [timeLimit, setTimeLimit] = useState(20);
  const [creating, setCreating] = useState(false);

  useEffect(() => { if (open) api<any[]>("/tests").then(setTemplates).catch(() => {}); }, [open]);

  async function create() {
    if (!templateId) return toast.error("Escolha um teste");
    setCreating(true);
    try {
      const s = await api<any>("/quiz/sessions", { method: "POST", body: { templateId, eventId, questionTimeLimit: timeLimit } });
      toast.success(`Sala criada! PIN ${s.pin}`);
      navigate(`/app/quiz/host/${s.id}`);
    } catch (e: any) { toast.error(e.message); } finally { setCreating(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" />Iniciar Quiz PVP</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Teste base (apenas múltipla escolha)</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Tempo por pergunta (segundos)</Label>
            <Input type="number" min={5} max={120} value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} />
          </div>
          <p className="text-xs text-muted-foreground">A opção com maior pontuação em cada pergunta será considerada correta. Pontuação Kahoot-style: 500-1000 pts por velocidade.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={create} disabled={creating} className="bg-gradient-primary">
            {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Criar sala
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
