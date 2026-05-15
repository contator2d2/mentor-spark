import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronLeft, Save } from "lucide-react";
import { toast } from "sonner";

const DEMAND_TYPES = [
  "Post para Instagram",
  "Carrossel",
  "Vídeo / Reels",
  "Landing Page",
  "Anúncio (Creative)",
  "Copywriting",
  "Apresentação PDF",
  "E-mail Marketing",
  "Outros",
];

export default function DemandCreatePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: "",
    type: "",
    description: "",
    objective: "",
    priority: "medium",
    desiredDeadline: "",
    agencyId: "",
  });

  useEffect(() => {
    api("/team").then(data => {
      // Filtra administradores ou membros que podem atuar como agência
      // No sistema atual, usamos os membros da equipe
      setAgencies(data);
    }).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.type) return toast.error("Preencha os campos obrigatórios");
    
    setLoading(true);
    try {
      await api("/demands", { method: "POST", body: form });
      toast.success("Demanda criada com sucesso!");
      navigate("/app/demands");
    } catch (e) {
      toast.error("Erro ao criar demanda");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/demands")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="font-display text-3xl font-bold tracking-tight">Nova Demanda</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informações Gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título da Demanda *</Label>
              <Input 
                id="title" 
                placeholder="Ex: Campanha de Lançamento - Maio/2024" 
                value={form.title}
                onChange={e => setForm({...form, title: e.target.value})}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Material *</Label>
                <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEMAND_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição / Contexto</Label>
              <Textarea 
                placeholder="Descreva o que precisa ser feito..." 
                rows={4}
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Objetivo Principal</Label>
              <Input 
                placeholder="Ex: Gerar 50 novos leads para o curso" 
                value={form.objective}
                onChange={e => setForm({...form, objective: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prazo Desejado</Label>
                <Input 
                  type="date" 
                  value={form.desiredDeadline}
                  onChange={e => setForm({...form, desiredDeadline: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Atribuir Responsável / Agência</Label>
                <Select value={form.agencyId} onValueChange={v => setForm({...form, agencyId: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione alguém" />
                  </SelectTrigger>
                  <SelectContent>
                    {agencies.map(a => <SelectItem key={a.id} value={a.userId}>{a.name} ({a.role})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="ghost" onClick={() => navigate("/app/demands")}>Cancelar</Button>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Criar Demanda
          </Button>
        </div>
      </form>
    </div>
  );
}
