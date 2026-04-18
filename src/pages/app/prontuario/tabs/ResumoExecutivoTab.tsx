// Aba: Resumo Executivo — leitura rápida e edição estratégica
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { MentoredRecord, MentoredStage, STAGE_META } from "../types";

interface Props {
  record: MentoredRecord;
  onUpdated: (rec: MentoredRecord) => void;
}

const FIELDS: Array<{ key: keyof MentoredRecord; label: string; placeholder: string; rows?: number }> = [
  { key: "mainObjective",  label: "Principal objetivo atual",     placeholder: "O que esse mentorado quer alcançar agora?", rows: 2 },
  { key: "mainPain",       label: "Principal dor",                 placeholder: "Qual é a dor central declarada?", rows: 2 },
  { key: "mainBottleneck", label: "Principal gargalo",             placeholder: "O que está travando a evolução?", rows: 2 },
  { key: "currentFocus",   label: "Foco atual do acompanhamento",  placeholder: "Onde o mentor está atuando agora?", rows: 2 },
  { key: "hypotheses",     label: "Hipóteses estratégicas",        placeholder: "O que você ainda precisa validar?", rows: 3 },
  { key: "priorities",     label: "Prioridades atuais",            placeholder: "Top 3 prioridades para os próximos 30 dias", rows: 3 },
];

export function ResumoExecutivoTab({ record, onUpdated }: Props) {
  const [form, setForm] = useState<Partial<MentoredRecord>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      mainObjective: record.mainObjective ?? "",
      mainPain: record.mainPain ?? "",
      mainBottleneck: record.mainBottleneck ?? "",
      currentFocus: record.currentFocus ?? "",
      hypotheses: record.hypotheses ?? "",
      priorities: record.priorities ?? "",
      mentorSummary: record.mentorSummary ?? "",
      currentStage: record.currentStage,
    });
  }, [record.id]);

  function set<K extends keyof MentoredRecord>(key: K, value: MentoredRecord[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const updated = await api<MentoredRecord>(`/prontuario/${record.id}`, {
        method: "PATCH",
        body: form,
      });
      onUpdated(updated);
      toast.success("Resumo salvo");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-semibold">Estágio do prontuário</h3>
            <p className="text-xs text-muted-foreground">Define em que ponto da jornada esse mentorado está.</p>
          </div>
          <Select
            value={form.currentStage ?? record.currentStage}
            onValueChange={(v) => set("currentStage", v as MentoredStage)}
          >
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(STAGE_META).map(([k, m]) => (
                <SelectItem key={k} value={k}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {record.currentSummary && (
        <Card className="p-5 border-l-2 border-primary bg-muted/20">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-2">
            <Sparkles className="h-3 w-3" />Resumo gerado por IA
          </div>
          <p className="text-sm whitespace-pre-wrap">{record.currentSummary}</p>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {FIELDS.map((f) => (
          <Card key={String(f.key)} className="p-4 space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">{f.label}</Label>
            <Textarea
              rows={f.rows || 2}
              placeholder={f.placeholder}
              value={(form[f.key] as string) ?? ""}
              onChange={(e) => set(f.key, e.target.value as any)}
              className="resize-none"
            />
          </Card>
        ))}
      </div>

      <Card className="p-4 space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Resumo escrito pelo mentor
        </Label>
        <Textarea
          rows={6}
          placeholder="Visão consolidada do mentor sobre o caso atual."
          value={(form.mentorSummary as string) ?? ""}
          onChange={(e) => set("mentorSummary", e.target.value)}
          className="resize-none"
        />
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="bg-gradient-primary hover:opacity-90">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar resumo
        </Button>
      </div>
    </div>
  );
}
