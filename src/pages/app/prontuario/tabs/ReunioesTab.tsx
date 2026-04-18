// Aba: Reuniões — agenda nova reunião vinculada ao lead
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { ProntuarioPayload, relativeDate } from "../types";

export function ReunioesTab({ data, onChanged }: { data: ProntuarioPayload; onChanged?: () => void }) {
  const nav = useNavigate();
  const { meetings, lead } = data;

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    scheduledAt: "",
    durationMin: 60,
    platform: "meet" as "meet" | "zoom" | "teams" | "presencial" | "other",
    meetingUrl: "",
    agenda: "",
  });

  function reset() {
    setForm({ title: "", scheduledAt: "", durationMin: 60, platform: "meet", meetingUrl: "", agenda: "" });
  }

  async function create() {
    if (!form.title.trim() || !form.scheduledAt) {
      toast.error("Título e data são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      await api("/meetings", {
        method: "POST",
        body: {
          leadId: lead.id,
          title: form.title.trim(),
          scheduledAt: form.scheduledAt,
          durationMin: Number(form.durationMin) || 60,
          platform: form.platform,
          meetingUrl: form.meetingUrl || undefined,
          agenda: form.agenda || undefined,
          status: "scheduled",
        },
      });
      toast.success("Reunião agendada");
      setOpen(false);
      reset();
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {meetings.length} reunião{meetings.length === 1 ? "" : "s"}
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-primary"><Plus className="h-4 w-4 mr-1" />Agendar reunião</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova reunião</DialogTitle>
              <DialogDescription>A reunião será vinculada a {lead.name}.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Título *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Sessão de diagnóstico" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Data e hora *</Label>
                  <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Duração (min)</Label>
                  <Input type="number" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Plataforma</Label>
                  <Select value={form.platform} onValueChange={(v: any) => setForm({ ...form, platform: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meet">Google Meet</SelectItem>
                      <SelectItem value="zoom">Zoom</SelectItem>
                      <SelectItem value="teams">Teams</SelectItem>
                      <SelectItem value="presencial">Presencial</SelectItem>
                      <SelectItem value="other">Outra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Link (opcional)</Label>
                  <Input value={form.meetingUrl} onChange={(e) => setForm({ ...form, meetingUrl: e.target.value })} placeholder="https://..." />
                </div>
              </div>
              <div>
                <Label className="text-xs">Pauta</Label>
                <Textarea rows={3} value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={create} disabled={saving} className="bg-gradient-primary">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Agendar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {meetings.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground text-sm">Nenhuma reunião agendada.</Card>
      ) : (
        meetings.map((m) => (
          <Card
            key={m.id}
            className="p-4 cursor-pointer hover:border-primary/40 transition"
            onClick={() => nav(`/app/meetings/${m.id}`)}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-semibold">{m.title}</div>
                <div className="text-xs text-muted-foreground">
                  {relativeDate(m.scheduledAt)} · {m.platform}
                </div>
              </div>
              <Badge variant="outline" className="capitalize">{m.status}</Badge>
            </div>
            {m.aiSummary && <p className="text-sm mt-2 text-muted-foreground">{m.aiSummary}</p>}
          </Card>
        ))
      )}
    </div>
  );
}
