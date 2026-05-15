import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
 import { api } from "@/lib/api";
 import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  ChevronLeft,
  Calendar,
  User,
  History,
  MessageSquare,
  FileText,
  Sparkles,
  Send,
   Download,
   Upload,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { DemandStatus } from "./DemandsPage";

interface Comment {
  id: string;
  text: string;
  user: { name: string };
  createdAt: string;
}

interface Version {
  id: string;
  versionNumber: number;
  comment?: string;
  files: any[];
  creator: { name: string };
  createdAt: string;
}

interface Demand {
  id: string;
  title: string;
  type: string;
  status: DemandStatus;
  priority: string;
  description?: string;
  objective?: string;
  targetAudience?: string;
  definedDeadline?: string;
  responsible?: { name: string };
  agency?: { name: string };
  briefing?: any;
  checklist?: string[];
  links?: string[];
  comments: Comment[];
  versions: Version[];
}

export default function DemandDetailPage() {
   const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [demand, setDemand] = useState<Demand | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);

   const isAgency = user?.teamRole === "agency";
 
  const load = () => api<Demand>(`/demands/${id}`).then(setDemand).finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, [id]);

  async function addComment() {
    if (!commentText.trim()) return;
    setSending(true);
    try {
      await api(`/demands/${id}/comments`, { method: "POST", body: { text: commentText } });
      setCommentText("");
      load();
    } catch (e) {
      toast.error("Erro ao comentar");
    } finally {
      setSending(false);
    }
  }

  async function generateBriefing() {
    if (!demand) return;
    setGenerating(true);
    try {
      const result = await api("/demands/ai/briefing", { 
        method: "POST", 
        body: { title: demand.title, type: demand.type, description: demand.description } 
      });
      setDemand(prev => prev ? { ...prev, briefing: result } : null);
      toast.success("Briefing gerado com sucesso!");
    } catch (e) {
      toast.error("Erro ao gerar briefing com IA");
    } finally {
      setGenerating(false);
    }
  }

  async function updateStatus(status: DemandStatus) {
    try {
      await api(`/demands/${id}`, { method: "PATCH", body: { status } });
      toast.success("Status atualizado");
      load();
    } catch (e) {
      toast.error("Erro ao atualizar status");
    }
  }

  if (loading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!demand) return <div>Não encontrado</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/demands")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-2xl font-bold truncate">{demand.title}</h1>
            <Badge variant="outline" className="uppercase">{demand.status}</Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
             <span className="flex items-center gap-1"><User className="h-3 w-3" /> {demand.responsible?.name || 'Sem resp.'}</span>
             <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {demand.definedDeadline ? new Date(demand.definedDeadline).toLocaleDateString() : 'Sem prazo'}</span>
          </div>
        </div>
         <div className="flex items-center gap-2">
            {!isAgency && demand.status === 'waiting_feedback' && (
              <>
                <Button variant="destructive" size="sm" onClick={() => updateStatus('adjustments')}>Solicitar Ajustes</Button>
                <Button variant="default" className="bg-emerald-600 hover:bg-emerald-700" size="sm" onClick={() => updateStatus('approved')}>Aprovar</Button>
              </>
            )}
            {!isAgency && demand.status === 'new' && (
              <Button size="sm" onClick={() => updateStatus('production')}>Iniciar Produção</Button>
            )}
            {isAgency && (demand.status === 'production' || demand.status === 'adjustments') && (
               <Button size="sm" className="gap-2" onClick={() => updateStatus('waiting_feedback')}>
                 <Upload className="h-4 w-4" /> Marcar como Entregue
               </Button>
            )}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="overview">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="overview" className="gap-2"><FileText className="h-4 w-4" /> Resumo</TabsTrigger>
              <TabsTrigger value="briefing" className="gap-2"><Sparkles className="h-4 w-4" /> Briefing & IA</TabsTrigger>
              <TabsTrigger value="versions" className="gap-2"><History className="h-4 w-4" /> Entregas</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-lg">Descrição & Objetivo</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Descrição</Label>
                    <p className="mt-1 whitespace-pre-wrap">{demand.description || "Nenhuma descrição informada."}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Objetivo Estratégico</Label>
                    <p className="mt-1">{demand.objective || "Não informado."}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Comunicação</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {demand.comments.map(c => (
                      <div key={c.id} className="bg-muted/30 p-3 rounded-xl border border-border/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs">{c.user.name}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-sm">{c.text}</p>
                      </div>
                    ))}
                    {demand.comments.length === 0 && <p className="text-center py-4 text-muted-foreground text-sm">Nenhum comentário ainda.</p>}
                  </div>
                  
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Digite seu comentário..." 
                      value={commentText} 
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addComment()}
                    />
                    <Button size="icon" onClick={addComment} disabled={sending || !commentText.trim()}>
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="briefing" className="mt-4 space-y-4">
              <Card>
                 <CardHeader className="flex flex-row items-center justify-between">
                   <CardTitle className="text-lg">Briefing Detalhado</CardTitle>
                   {!isAgency && (
                     <Button variant="outline" size="sm" onClick={generateBriefing} disabled={generating} className="gap-2">
                       {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                       {demand.briefing ? "Refinar com IA" : "Gerar com IA"}
                     </Button>
                   )}
                 </CardHeader>
                <CardContent className="space-y-6">
                  {demand.briefing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                       <div className="space-y-1">
                         <Label className="text-primary">Objetivo</Label>
                         <p className="text-sm">{demand.briefing.objective}</p>
                       </div>
                       <div className="space-y-1">
                         <Label className="text-primary">Público-alvo</Label>
                         <p className="text-sm">{demand.briefing.targetAudience}</p>
                       </div>
                       <div className="space-y-1">
                         <Label className="text-primary">Estilo / Tom de Voz</Label>
                         <p className="text-sm">{demand.briefing.style}</p>
                       </div>
                       <div className="space-y-1">
                         <Label className="text-primary">Itens Essenciais</Label>
                         <ul className="list-disc list-inside text-sm">
                           {demand.briefing.essentialItems?.map((item: string, i: number) => <li key={i}>{item}</li>)}
                         </ul>
                       </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 border-2 border-dashed rounded-xl">
                      <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground text-sm">Use a IA para gerar um briefing completo automaticamente.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="versions" className="mt-4 space-y-4">
               {demand.versions.map(v => (
                 <Card key={v.id}>
                    <CardHeader className="py-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-md font-bold">Versão {v.versionNumber}</CardTitle>
                        <Badge variant="secondary">{new Date(v.createdAt).toLocaleString()}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Enviado por {v.creator.name}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {v.comment && <p className="text-sm italic text-muted-foreground border-l-2 pl-3">"{v.comment}"</p>}
                      <div className="flex flex-wrap gap-2">
                        {v.files?.map((f: any, i: number) => (
                          <Button key={i} variant="outline" size="sm" className="gap-2" onClick={() => window.open(f.url, '_blank')}>
                            <Download className="h-3 w-3" /> {f.name || 'Arquivo'}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                 </Card>
               ))}
               {demand.versions.length === 0 && (
                 <div className="text-center py-12 border rounded-xl bg-muted/20">
                    <History className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground text-sm">Nenhuma entrega realizada ainda.</p>
                 </div>
               )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
             <CardHeader><CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Configurações</CardTitle></CardHeader>
             <CardContent className="space-y-4">
               <div className="space-y-1">
                 <Label className="text-xs">Prioridade</Label>
                 <Badge className="w-full justify-center py-1">{demand.priority.toUpperCase()}</Badge>
               </div>
               <div className="space-y-1">
                 <Label className="text-xs">Tipo de Material</Label>
                 <Input disabled value={demand.type} className="uppercase font-bold" />
               </div>
               <div className="space-y-1">
                 <Label className="text-xs">Agência Responsável</Label>
                 <div className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
                   <User className="h-4 w-4 text-muted-foreground" />
                   <span className="text-sm">{demand.agency?.name || 'Não atribuída'}</span>
                 </div>
               </div>
             </CardContent>
          </Card>

          <Card>
             <CardHeader><CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Links e Referências</CardTitle></CardHeader>
             <CardContent className="space-y-2">
                {demand.links?.map((l, i) => (
                  <a key={i} href={l} target="_blank" className="flex items-center gap-2 text-sm text-blue-600 hover:underline truncate">
                    <LinkIcon className="h-3 w-3" /> {l}
                  </a>
                ))}
                {(!demand.links || demand.links.length === 0) && <p className="text-xs text-muted-foreground">Sem links informados.</p>}
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
