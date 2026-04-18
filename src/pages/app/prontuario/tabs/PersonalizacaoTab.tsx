// Aba: Personalização — config global do prontuário do mentor (não pertence a um lead específico)
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Settings, Save, Wand2, Plus, X } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Config {
  id?: string;
  menteeLabel: string;
  prontuarioLabel: string;
  stageLabels?: Record<string, string>;
  painCategories?: string[];
  objectiveCategories?: string[];
  metricTemplates?: Array<{ name: string; unit?: string; category?: string }>;
  scoreWeights?: { execution?: number; engagement?: number; tests?: number };
  prontuarioPromptAddon?: string;
  insightTone: string;
  language: string;
}

const STAGES = [
  { key: "initial",     label: "Inicial" },
  { key: "diagnosis",   label: "Em diagnóstico" },
  { key: "structuring", label: "Em estruturação" },
  { key: "execution",   label: "Em execução" },
  { key: "evolution",   label: "Em evolução" },
  { key: "at_risk",     label: "Em risco" },
  { key: "paused",      label: "Pausado" },
  { key: "completed",   label: "Concluído" },
];

export function PersonalizacaoTab() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Inputs auxiliares
  const [newPainCat, setNewPainCat] = useState("");
  const [newObjCat, setNewObjCat] = useState("");

  useEffect(() => {
    api<Config>("/prontuario/config/me")
      .then(setCfg)
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  function update<K extends keyof Config>(k: K, v: Config[K]) {
    setCfg(prev => prev ? { ...prev, [k]: v } : prev);
  }

  function setStageLabel(stage: string, label: string) {
    if (!cfg) return;
    const next = { ...(cfg.stageLabels || {}) };
    if (label.trim()) next[stage] = label;
    else delete next[stage];
    update("stageLabels", next);
  }

  function addPainCat() {
    if (!cfg || !newPainCat.trim()) return;
    update("painCategories", [...(cfg.painCategories || []), newPainCat.trim()]);
    setNewPainCat("");
  }
  function removePainCat(i: number) {
    if (!cfg) return;
    update("painCategories", (cfg.painCategories || []).filter((_, idx) => idx !== i));
  }
  function addObjCat() {
    if (!cfg || !newObjCat.trim()) return;
    update("objectiveCategories", [...(cfg.objectiveCategories || []), newObjCat.trim()]);
    setNewObjCat("");
  }
  function removeObjCat(i: number) {
    if (!cfg) return;
    update("objectiveCategories", (cfg.objectiveCategories || []).filter((_, idx) => idx !== i));
  }

  async function save() {
    if (!cfg) return;
    setSaving(true);
    try {
      const updated = await api<Config>("/prontuario/config/me", { method: "POST", body: cfg });
      setCfg(updated);
      toast.success("Personalização salva");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  if (loading || !cfg) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card className="p-5 bg-gradient-to-br from-card via-card to-primary/5 border-primary/20">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-display text-lg font-semibold">Personalização do prontuário</h3>
            <p className="text-sm text-muted-foreground">
              Estas configurações se aplicam a TODOS os seus mentorados.
            </p>
          </div>
        </div>
      </Card>

      {/* Terminologia */}
      <Card className="p-5 space-y-3">
        <h4 className="font-display font-semibold">Terminologia</h4>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label>Como você chama seu mentorado?</Label>
            <Input value={cfg.menteeLabel} onChange={(e) => update("menteeLabel", e.target.value)} placeholder="Mentorado, Cliente, Aluno..." />
          </div>
          <div>
            <Label>Nome do prontuário</Label>
            <Input value={cfg.prontuarioLabel} onChange={(e) => update("prontuarioLabel", e.target.value)} placeholder="Prontuário, Painel, Ficha..." />
          </div>
          <div>
            <Label>Idioma</Label>
            <Select value={cfg.language} onValueChange={(v) => update("language", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pt-BR">Português (BR)</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tom dos insights</Label>
            <Select value={cfg.insightTone} onValueChange={(v) => update("insightTone", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="consultivo">Consultivo</SelectItem>
                <SelectItem value="direto">Direto</SelectItem>
                <SelectItem value="didatico">Didático</SelectItem>
                <SelectItem value="provocativo">Provocativo</SelectItem>
                <SelectItem value="acolhedor">Acolhedor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Estágios */}
      <Card className="p-5 space-y-3">
        <h4 className="font-display font-semibold">Estágios customizados</h4>
        <p className="text-xs text-muted-foreground">Renomeie os estágios para a linguagem do seu nicho. Em branco = padrão.</p>
        <div className="grid md:grid-cols-2 gap-3">
          {STAGES.map(s => (
            <div key={s.key}>
              <Label className="text-xs">{s.label} <span className="text-muted-foreground">({s.key})</span></Label>
              <Input
                value={cfg.stageLabels?.[s.key] || ""}
                onChange={(e) => setStageLabel(s.key, e.target.value)}
                placeholder={s.label}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Categorias */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5 space-y-3">
          <h4 className="font-display font-semibold">Categorias de dores</h4>
          <div className="flex gap-2">
            <Input value={newPainCat} onChange={(e) => setNewPainCat(e.target.value)} placeholder="ex: financeiro" />
            <Button onClick={addPainCat} variant="outline" size="icon"><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(cfg.painCategories || []).map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted/40 border border-border/40">
                {c}
                <button onClick={() => removePainCat(i)} className="hover:text-rose-400"><X className="h-3 w-3" /></button>
              </span>
            ))}
            {!cfg.painCategories?.length && <span className="text-xs text-muted-foreground">Nenhuma categoria customizada.</span>}
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <h4 className="font-display font-semibold">Categorias de objetivos</h4>
          <div className="flex gap-2">
            <Input value={newObjCat} onChange={(e) => setNewObjCat(e.target.value)} placeholder="ex: liderança" />
            <Button onClick={addObjCat} variant="outline" size="icon"><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(cfg.objectiveCategories || []).map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted/40 border border-border/40">
                {c}
                <button onClick={() => removeObjCat(i)} className="hover:text-rose-400"><X className="h-3 w-3" /></button>
              </span>
            ))}
            {!cfg.objectiveCategories?.length && <span className="text-xs text-muted-foreground">Nenhuma categoria customizada.</span>}
          </div>
        </Card>
      </div>

      {/* Pesos do score */}
      <Card className="p-5 space-y-3">
        <h4 className="font-display font-semibold">Pesos do score geral</h4>
        <p className="text-xs text-muted-foreground">Soma idealmente igual a 1. Padrão: execução 0.4, engajamento 0.3, testes 0.3.</p>
        <div className="grid grid-cols-3 gap-3">
          {(["execution", "engagement", "tests"] as const).map(k => (
            <div key={k}>
              <Label className="text-xs capitalize">{k}</Label>
              <Input
                type="number" step="0.05" min="0" max="1"
                value={cfg.scoreWeights?.[k] ?? (k === "execution" ? 0.4 : 0.3)}
                onChange={(e) => update("scoreWeights", {
                  ...(cfg.scoreWeights || {}),
                  [k]: Number(e.target.value),
                })}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Prompt complementar */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary" />
          <h4 className="font-display font-semibold">Prompt complementar da IA</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          Diretrizes específicas que serão somadas ao seu prompt base apenas dentro do prontuário.
        </p>
        <Textarea
          rows={5}
          placeholder="Ex: Sempre destaque rituais semanais e finalize com 1 desafio prático..."
          value={cfg.prontuarioPromptAddon || ""}
          onChange={(e) => update("prontuarioPromptAddon", e.target.value)}
        />
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="bg-gradient-primary hover:opacity-90">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar personalização
        </Button>
      </div>
    </div>
  );
}
