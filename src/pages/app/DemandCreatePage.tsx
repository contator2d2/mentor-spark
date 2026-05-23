import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, API_BASE, getToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronLeft, Save, Users, Check } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";


const DEPARTMENTS = [
  "Marketing",
  "Administrativo",
  "Financeiro",
  "Vendas",
  "Outros",
];

const DEMAND_TYPES = [
  "Post para Instagram",
  "Carrossel",
  "Vídeo / Reels",
  "Landing Page",
  "Anúncio (Creative)",
  "Copywriting",
  "Apresentação PDF",
  "E-mail Marketing",
  "Relatório de Vendas",
  "Planilha Financeira",
  "Contrato / Documento",
  "Outros",
];

export default function DemandCreatePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: "",
    department: "Marketing",
    type: "",
    description: "",
    objective: "",
    priority: "medium",
    desiredDeadline: "",
    responsibleIds: [] as string[],
    references: [] as { url: string; description?: string }[],
  });
 const [refUrl, setRefUrl] = useState("");
 const [refDesc, setRefDesc] = useState("");
 const [uploading, setUploading] = useState(false);
   async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
     const files = e.target.files;
     if (!files || files.length === 0) return;
     setUploading(true);
     try {
       const data = await Promise.all(Array.from(files).map(async (file) => {
         const formData = new FormData();
         formData.append("file", file);
         const token = getToken();
         const response = await fetch(`${API_BASE}/uploads`, {
           method: "POST",
           body: formData,
           headers: token ? { Authorization: `Bearer ${token}` } : undefined,
         });
         if (!response.ok) throw new Error("Upload failed");
         return response.json();
       }));
       const newRefs = data.map((f: any) => ({
         url: f.url?.startsWith("http") ? f.url : `${API_BASE.replace(/\/api$/, "")}${f.url}`,
         description: ""
       }));
       setForm(prev => ({ ...prev, references: [...prev.references, ...newRefs] }));
     } catch (e) {
       toast.error("Erro no upload");
     } finally {
       setUploading(false);
     }
   }

   function addReference() {
     if (!refUrl) return;
     setForm(prev => ({ ...prev, references: [...prev.references, { url: refUrl, description: refDesc }] }));
     setRefUrl("");
     setRefDesc("");
   }

             <div className="space-y-4 pt-4 border-t">
               <Label>Referências visuais e imagens</Label>
               <div className="flex flex-wrap gap-4">
                 {form.references.map((ref, idx) => (
                   <div key={idx} className="relative group w-32 border rounded-lg overflow-hidden bg-muted/20">
                     {ref.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || ref.url.includes('upload') ? (
                       <img src={ref.url} alt="Ref" className="w-full h-24 object-cover" />
                     ) : (
                       <div className="w-full h-24 flex items-center justify-center bg-muted">
                         <span className="text-[10px] break-all p-1">{ref.url}</span>
                       </div>
                     )}
                     <Button 
                       type="button" 
                       variant="destructive" 
                       size="icon" 
                       className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                       onClick={() => setForm(prev => ({ ...prev, references: prev.references.filter((_, i) => i !== idx) }))}
                     >
                       <span className="text-xs">×</span>
                     </Button>
                     <Input 
                       className="h-7 text-[10px] px-1 rounded-none border-x-0 border-b-0" 
                       placeholder="O que quer aqui?" 
                       value={ref.description} 
                       onChange={e => {
                         const newRefs = [...form.references];
                         newRefs[idx].description = e.target.value;
                         setForm({...form, references: newRefs});
                       }}
                     />
                   </div>
                 ))}
                 <div className="flex flex-col gap-2 w-full max-w-sm">
                   <div className="flex gap-2">
                     <Input placeholder="URL da referência" value={refUrl} onChange={e => setRefUrl(e.target.value)} />
                     <Button type="button" variant="outline" onClick={addReference}>Add Link</Button>
                   </div>
                   <div className="flex gap-2 items-center">
                     <input type="file" id="ref-upload" className="hidden" accept="image/*" multiple onChange={handleFileUpload} />
                     <Button type="button" variant="secondary" className="w-full gap-2" onClick={() => document.getElementById('ref-upload')?.click()} disabled={uploading}>
                       {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Upload de Imagens
                     </Button>
                   </div>
                 </div>
               </div>
             </div>


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
                <Label>Departamento / Área *</Label>
                <Select value={form.department} onValueChange={v => setForm({...form, department: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a área" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

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
                <Label>Atribuir Responsáveis</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between h-auto py-2 min-h-10">
                      <div className="flex flex-wrap gap-1">
                        {form.responsibleIds.length === 0 && <span className="text-muted-foreground">Selecionar responsáveis...</span>}
                        {form.responsibleIds.map(id => {
                          const agent = agencies.find(a => a.userId === id);
                          return (
                            <Badge key={id} variant="secondary" className="mr-1">
                              {agent?.name || id}
                            </Badge>
                          );
                        })}
                      </div>
                      <Users className="h-4 w-4 opacity-50 ml-2" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <div className="p-2 space-y-1">
                      {agencies.map(a => (
                        <div 
                          key={a.id} 
                          className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                          onClick={() => {
                            const current = [...form.responsibleIds];
                            if (current.includes(a.userId)) {
                              setForm({...form, responsibleIds: current.filter(id => id !== a.userId)});
                            } else {
                              setForm({...form, responsibleIds: [...current, a.userId]});
                            }
                          }}
                        >
                          <Checkbox 
                            checked={form.responsibleIds.includes(a.userId)}
                            onCheckedChange={() => {}} // Handle in div click for better UX
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{a.name}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{a.role}</span>
                          </div>
                          {form.responsibleIds.includes(a.userId) && <Check className="h-4 w-4 ml-auto text-primary" />}
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
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
