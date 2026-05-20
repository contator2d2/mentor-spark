import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, API_BASE, getToken } from "@/lib/api";
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
   Image as ImageIcon,
   X as CloseIcon,
   Eye,
    Plus,
    CheckCircle2,
     AlertCircle,
     Link as LinkIcon,
     Clock,
 } from "lucide-react";

const STATUS_META: Record<string, { label: string; tone: string; dot: string }> = {
  new:               { label: "Nova",               tone: "bg-slate-100 text-slate-700 border-slate-200",        dot: "bg-slate-400" },
  analysis:          { label: "Em análise",         tone: "bg-sky-50 text-sky-700 border-sky-200",                dot: "bg-sky-500" },
  planned:           { label: "Planejada",          tone: "bg-indigo-50 text-indigo-700 border-indigo-200",       dot: "bg-indigo-500" },
  production:        { label: "Em produção",        tone: "bg-violet-50 text-violet-700 border-violet-200",       dot: "bg-violet-500" },
  waiting_feedback:  { label: "Aguardando aprovação", tone: "bg-amber-50 text-amber-700 border-amber-200",        dot: "bg-amber-500" },
  review:            { label: "Em revisão",         tone: "bg-amber-50 text-amber-700 border-amber-200",          dot: "bg-amber-500" },
  adjustments:       { label: "Ajustes solicitados", tone: "bg-rose-50 text-rose-700 border-rose-200",            dot: "bg-rose-500" },
  approved:          { label: "Aprovada",           tone: "bg-emerald-50 text-emerald-700 border-emerald-200",    dot: "bg-emerald-500" },
  finished:          { label: "Finalizada",         tone: "bg-emerald-50 text-emerald-700 border-emerald-200",    dot: "bg-emerald-500" },
  canceled:          { label: "Cancelada",          tone: "bg-slate-100 text-slate-500 border-slate-200",         dot: "bg-slate-400" },
};

const PRIORITY_META: Record<string, { label: string; tone: string }> = {
  low:    { label: "Baixa",   tone: "bg-slate-100 text-slate-700" },
  medium: { label: "Média",   tone: "bg-sky-50 text-sky-700" },
  high:   { label: "Alta",    tone: "bg-amber-50 text-amber-700" },
  urgent: { label: "Urgente", tone: "bg-rose-50 text-rose-700" },
};
 
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogFooter,
 } from "@/components/ui/dialog";
import { toast } from "sonner";
import { DemandStatus } from "./DemandsPage";

interface Comment {
  id: string;
   text: string;
   user: { name: string };
   createdAt: string;
   attachments?: any[];
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
   references?: { url: string; description?: string }[];
}

 export default function DemandDetailPage() {
    const { user } = useAuth();
    const [referenceModalOpen, setReferenceModalOpen] = useState(false);
    const [currentRefUrl, setCurrentRefUrl] = useState("");
    const [currentRefDesc, setCurrentRefDesc] = useState("");
  const { id } = useParams();
  const navigate = useNavigate();
  const [demand, setDemand] = useState<Demand | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
   const [sending, setSending] = useState(false);
   const [uploading, setUploading] = useState(false);
   const [commentAttachments, setCommentAttachments] = useState<{ url: string; name: string; type: string }[]>([]);
   const [previewImage, setPreviewImage] = useState<{ url: string; name?: string } | null>(null);
  const [generating, setGenerating] = useState(false);

   const isAgency = user?.teamRole === "agency";
   const normalizeUpload = (file: any) => ({
     url: file.url?.startsWith("http") ? file.url : `${API_BASE.replace(/\/api$/, "")}${file.url}`,
     name: file.originalName || file.name || "Arquivo",
     type: file.mimetype || file.type || "application/octet-stream",
   });
 
   async function uploadFile(file: File) {
     const formData = new FormData();
     formData.append("file", file);
     const token = getToken();
     const response = await fetch(`${API_BASE}/uploads`, {
       method: "POST",
       body: formData,
       headers: token ? { Authorization: `Bearer ${token}` } : undefined,
     });
     if (!response.ok) {
       const error = await response.json().catch(() => ({}));
       throw new Error(error.message || "Upload failed");
     }
     return normalizeUpload(await response.json());
   }

    const isImageAttachment = (attachment: any) =>
      attachment?.type?.startsWith('image/') ||
      (typeof attachment?.url === 'string' && attachment.url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i));

    async function addFilesToComment(files: File[]) {
      const imageFiles = files.filter((file) => file.type.startsWith('image/'));
      if (imageFiles.length === 0) return;
      setUploading(true);
      try {
        const data = await Promise.all(imageFiles.map(uploadFile));
        setCommentAttachments(prev => [...prev, ...data.map((f: any) => ({ url: f.url, name: f.name, type: f.type }))]);
        toast.success(imageFiles.length === 1 ? "Imagem anexada" : `${imageFiles.length} imagens anexadas`);
      } catch (e) {
        toast.error("Erro no upload");
      } finally {
        setUploading(false);
      }
    }

    async function handleCommentPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
      const pastedFiles = Array.from(e.clipboardData.files).filter((file) => file.type.startsWith('image/'));
      const itemFiles = Array.from(e.clipboardData.items)
        .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter((file): file is File => Boolean(file));
      const imageFiles = pastedFiles.length > 0 ? pastedFiles : itemFiles;

      if (imageFiles.length === 0) return;

      e.preventDefault();
      const text = e.clipboardData.getData('text/plain')?.trim();
      if (text) setCommentText(prev => `${prev}${prev ? '\n' : ''}${text}`);
      await addFilesToComment(imageFiles);
    }
 
  const load = () => api<Demand>(`/demands/${id}`).then(setDemand).finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, [id]);

   async function addComment() {
     if (!commentText.trim() && commentAttachments.length === 0) return;
     setSending(true);
     try {
       await api(`/demands/${id}/comments`, {
         method: "POST",
         body: { text: commentText, attachments: commentAttachments }
       });
       setCommentText("");
       setCommentAttachments([]);
       load();
     } catch (e) {
       toast.error("Erro ao comentar");
     } finally {
       setSending(false);
     }
   }
 
   async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, target: 'comment' | 'version') {
     const files = e.target.files;
     if (!files || files.length === 0) return;
      if (target === 'comment') {
        await addFilesToComment(Array.from(files));
        e.currentTarget.value = "";
        return;
      }
 
     setUploading(true);
     try {
        const data = await Promise.all(Array.from(files).map(uploadFile));
 
        if (target === 'version') {
         const versionComment = prompt("Deseja adicionar um comentário para esta entrega?");
         await api(`/demands/${id}/versions`, {
           method: "POST",
           body: { files: data.map((f: any) => ({ url: f.url, name: f.name, type: f.type })), comment: versionComment }
         });
         toast.success("Entrega realizada com sucesso!");
         load();
       }
     } catch (e) {
       toast.error("Erro no upload");
     } finally {
       setUploading(false);
        e.currentTarget.value = "";
     }
   }
 
   async function sendToApproval() {
     const comment = prompt("Deseja adicionar uma mensagem para o cliente nesta solicitação de aprovação?");
     try {
       await updateStatus('waiting_feedback');
       
       const baseUrl = window.location.origin;
       const publicUrl = `${baseUrl}/demands/public/${id}?token=${id}`;
       
       await api(`/demands/${id}/comments`, { 
         method: "POST", 
         body: { 
           text: `🚀 SOLICITAÇÃO DE APROVAÇÃO ENVIADA\n\n${comment || "Arquivos enviados para sua revisão."}\n\n🔗 Link para aprovação rápida: ${publicUrl}`,
           attachments: []
         } 
       });
       
       toast.success("Solicitação de aprovação enviada e registrada!");
       load();
     } catch (e) {
       toast.error("Erro ao enviar para aprovação");
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

   const statusMeta = STATUS_META[demand.status] || STATUS_META.new;
   const priorityMeta = PRIORITY_META[demand.priority] || PRIORITY_META.medium;

   return (
     <div className="space-y-6">
       {/* HERO HEADER */}
       <div className="rounded-2xl border bg-card p-5 shadow-sm">
         <div className="flex items-start gap-4">
           <Button variant="ghost" size="icon" className="mt-1 shrink-0" onClick={() => navigate("/app/demands")}>
             <ChevronLeft className="h-4 w-4" />
           </Button>
           <div className="flex-1 min-w-0 space-y-3">
             <div className="flex items-center gap-2 flex-wrap">
               <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusMeta.tone}`}>
                 <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                 {statusMeta.label}
               </span>
               <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{demand.type}</span>
             </div>
             <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight truncate">{demand.title}</h1>
             <div className="flex items-center gap-5 text-sm text-muted-foreground flex-wrap">
               <span className="flex items-center gap-1.5">
                 <User className="h-3.5 w-3.5" />
                 <span className="text-foreground/80">{demand.responsible?.name || 'Sem responsável'}</span>
               </span>
               <span className="flex items-center gap-1.5">
                 <Calendar className="h-3.5 w-3.5" />
                 <span className="text-foreground/80">
                   {demand.definedDeadline ? new Date(demand.definedDeadline).toLocaleDateString('pt-BR') : 'Sem prazo definido'}
                 </span>
               </span>
               <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${priorityMeta.tone}`}>
                 Prioridade {priorityMeta.label}
               </span>
             </div>
           </div>
          <div className="flex items-center gap-2 shrink-0">
             {!isAgency && (demand.status === 'waiting_feedback' || demand.status === 'adjustments') && (
                <div className="flex gap-2">
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => {
                      const reason = prompt("Por favor, descreva os ajustes necessários:");
                      if (!reason) return;
                      
                      api(`/demands/${id}`, { method: "PATCH", body: { status: 'adjustments' } })
                        .then(() => api(`/demands/${id}/comments`, { 
                          method: "POST", 
                          body: { text: `❌ AJUSTES SOLICITADOS:\n${reason}` } 
                        }))
                        .then(() => {
                          toast.success("Solicitação de ajustes enviada");
                          load();
                        })
                        .catch(() => toast.error("Erro ao processar solicitação"));
                    }}
                  >
                    Solicitar Ajustes
                  </Button>
                  <Button 
                    variant="default" 
                    className="bg-emerald-600 hover:bg-emerald-700" 
                    size="sm" 
                    onClick={() => updateStatus('approved')}
                  >
                    Aprovar
                  </Button>
                </div>
              )}
            {!isAgency && demand.status === 'new' && (
              <Button size="sm" onClick={() => updateStatus('production')}>Iniciar Produção</Button>
            )}
             {isAgency && (
                <div className="flex gap-2">
                  <input
                    type="file"
                    id="delivery-upload"
                    className="hidden"
                    multiple
                    onChange={(e) => handleFileUpload(e, 'version')}
                  />
                   <Button 
                    size="sm" 
                    variant="outline" 
                    className="gap-2 border-primary/20 hover:border-primary/50" 
                    onClick={() => document.getElementById('delivery-upload')?.click()} 
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4" /> Enviar Arquivos
                  </Button>
                   <Button 
                    size="sm" 
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-sm" 
                    onClick={() => sendToApproval()} 
                    disabled={demand.versions.length === 0}
                  >
                    <Send className="h-4 w-4" /> Enviar para Aprovação
                  </Button>
                </div>
             )}
         </div>
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
                   <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 flex flex-col-reverse">
                     {[...demand.comments].reverse().map(c => {
                        const isRequestForApproval = c.text && typeof c.text === 'string' && (c.text.includes("SOLICITAÇÃO DE APROVAÇÃO") || c.text.includes("REVISÃO PÚBLICA"));
                        const isAprove = c.text && typeof c.text === 'string' && c.text.includes("APROVADO");
                        const isAdjust = c.text && typeof c.text === 'string' && c.text.includes("AJUSTES");
                        
                        let cardClass = 'bg-muted/30 border-border/50';
                        if (isRequestForApproval) {
                          if (isAprove) cardClass = 'bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/20';
                          else if (isAdjust) cardClass = 'bg-rose-500/10 border-rose-500/30 ring-1 ring-rose-500/20';
                          else cardClass = 'bg-amber-500/10 border-amber-500/30 shadow-sm';
                        }

                        return (
                          <div key={c.id} className={`p-4 rounded-2xl border transition-all ${cardClass}`}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                                  {c.user.name.charAt(0)}
                                </div>
                                <span className="font-bold text-xs">{c.user.name}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground font-medium">{new Date(c.createdAt).toLocaleString('pt-BR')}</span>
                            </div>
                            
                            <div className="mt-2 space-y-3">
                              <p className="text-sm whitespace-pre-wrap leading-relaxed text-slate-700">{c.text}</p>
                              
                              {isRequestForApproval && (
                                <div className="flex items-center gap-2 py-2 border-y border-black/5">
                                   {isAprove ? (
                                     <Badge className="bg-emerald-600 hover:bg-emerald-600 border-none rounded-full px-3 py-1 text-[10px] gap-1">
                                       <CheckCircle2 className="h-3 w-3" /> APROVADO PELO CLIENTE
                                     </Badge>
                                   ) : isAdjust ? (
                                     <Badge variant="destructive" className="rounded-full px-3 py-1 text-[10px] gap-1">
                                       <AlertCircle className="h-3 w-3" /> AJUSTES SOLICITADOS
                                     </Badge>
                                   ) : (
                                     <Badge variant="outline" className="border-amber-500/50 text-amber-600 rounded-full px-3 py-1 text-[10px] gap-1 bg-amber-500/5">
                                       <Clock className="h-3 w-3" /> AGUARDANDO REVISÃO
                                     </Badge>
                                   )}
                                </div>
                              )}
                            </div>

                            {c.attachments && c.attachments.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {c.attachments.map((at: any, idx: number) => (
                                  <div key={idx} className="relative group overflow-hidden rounded-xl border border-black/5 shadow-sm">
                                     {isImageAttachment(at) ? (
                                      <div className="relative h-24 w-24">
                                        <img 
                                          src={at.url} 
                                           alt={at.name || "Imagem anexada"} 
                                           className="h-full w-full object-cover cursor-pointer transition-transform duration-500 group-hover:scale-110" 
                                           onClick={() => setPreviewImage({ url: at.url, name: at.name })}
                                        />
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                          <Eye className="h-4 w-4 text-white" />
                                        </div>
                                      </div>
                                    ) : (
                                      <Button variant="ghost" size="sm" className="h-24 w-24 flex-col gap-1 bg-white" onClick={() => window.open(at.url, '_blank')}>
                                        <FileText className="h-8 w-8 text-slate-400" />
                                        <span className="text-[9px] font-bold truncate w-full px-2">{at.name || 'Arquivo'}</span>
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                     })}
                    {demand.comments.length === 0 && <p className="text-center py-4 text-muted-foreground text-sm">Nenhum comentário ainda.</p>}
                  </div>
                  
                   <div className="space-y-3">
                     {commentAttachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-2 bg-muted/20 rounded-lg">
                         {commentAttachments.map((at, idx) => (
                            <div key={idx} className="relative h-16 w-16 group">
                              <img
                                src={at.url}
                                alt={at.name || "Prévia"}
                                className="h-full w-full object-cover rounded-md border cursor-pointer"
                                onClick={() => setPreviewImage({ url: at.url, name: at.name })}
                              />
                             <button 
                               onClick={() => setCommentAttachments(prev => prev.filter((_, i) => i !== idx))}
                               className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                             >
                               <CloseIcon className="h-3 w-3" />
                             </button>
                           </div>
                         ))}
                       </div>
                     )}
                      <div className="flex gap-2">
                       <input
                         type="file"
                         id="comment-upload"
                         className="hidden"
                         accept="image/*"
                         multiple
                         onChange={(e) => handleFileUpload(e, 'comment')}
                       />
                       <Button 
                         variant="outline" 
                         size="icon" 
                         onClick={() => document.getElementById('comment-upload')?.click()}
                         disabled={uploading}
                       >
                         {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                       </Button>
                       <Textarea 
                          placeholder="Digite seu comentário, cole imagens com Ctrl+V ou descreva a correção..." 
                         value={commentText} 
                         className="min-h-[40px] h-[40px] py-2 resize-none"
                         onChange={(e) => setCommentText(e.target.value)}
                          onPaste={handleCommentPaste}
                         onKeyDown={(e) => {
                           if (e.key === 'Enter' && !e.shiftKey) {
                             e.preventDefault();
                             addComment();
                           }
                         }}
                       />
                       <Button size="icon" onClick={addComment} disabled={sending || (!commentText.trim() && commentAttachments.length === 0)}>
                         {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                       </Button>
                     </div>
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

             <TabsContent value="versions" className="mt-4 space-y-6">
                {demand.versions.map((v, vIdx) => (
                  <Card key={v.id} className={vIdx === 0 ? "border-primary/20 shadow-md" : ""}>
                    <CardHeader className="py-4 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-md font-bold">Versão {v.versionNumber}</CardTitle>
                          {vIdx === 0 && <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">Última</Badge>}
                        </div>
                        <Badge variant="outline" className="text-[10px]">{new Date(v.createdAt).toLocaleString()}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Enviado por {v.creator.name}</p>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      {v.comment && (
                        <div className="bg-muted/30 p-4 rounded-xl text-sm italic border-l-4 border-primary/40">
                          "{v.comment}"
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {v.files?.map((f: any, i: number) => {
                          const isImg = isImageAttachment(f);
                          return (
                            <div key={i} className="group relative bg-muted/20 rounded-2xl overflow-hidden border border-border/50 transition-all hover:shadow-lg">
                              {isImg ? (
                                <div className="aspect-square relative flex flex-col cursor-pointer" onClick={() => setPreviewImage({ url: f.url, name: f.name })}>
                                  <img src={f.url} alt={f.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <Eye className="h-5 w-5 text-white" />
                                  </div>
                                </div>
                              ) : (
                                <div className="aspect-square flex flex-col items-center justify-center p-4 text-center">
                                  <FileText className="h-10 w-10 text-muted-foreground/30 mb-2" />
                                  <span className="text-[10px] font-medium truncate w-full px-2">{f.name || 'Arquivo'}</span>
                                </div>
                              )}
                              <div className="p-3 border-t bg-card flex items-center justify-between">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-full text-[10px] font-bold uppercase gap-2 hover:bg-primary/5 hover:text-primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(f.url, '_blank');
                                  }}
                                >
                                  <Download className="h-3.5 w-3.5" /> Baixar
                                </Button>
                              </div>
                            </div>
                          );
                        })}
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

        <div className="space-y-5">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Detalhes da demanda</CardTitle>
              <p className="text-xs text-muted-foreground">Informações principais do projeto</p>
            </CardHeader>
            <CardContent className="pt-0">
              <dl className="divide-y divide-border/60">
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-xs text-muted-foreground">Prioridade</dt>
                  <dd>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${priorityMeta.tone}`}>
                      {priorityMeta.label}
                    </span>
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-xs text-muted-foreground">Tipo</dt>
                  <dd className="text-sm font-medium">{demand.type}</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-xs text-muted-foreground">Status</dt>
                  <dd>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusMeta.tone}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                      {statusMeta.label}
                    </span>
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-xs text-muted-foreground">Responsável</dt>
                  <dd className="text-sm font-medium text-right">{demand.responsible?.name || <span className="text-muted-foreground font-normal">—</span>}</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-xs text-muted-foreground">Agência</dt>
                  <dd className="text-sm font-medium text-right">{demand.agency?.name || <span className="text-muted-foreground font-normal">Não atribuída</span>}</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-xs text-muted-foreground">Prazo</dt>
                  <dd className="text-sm font-medium text-right">
                    {demand.definedDeadline ? new Date(demand.definedDeadline).toLocaleDateString('pt-BR') : <span className="text-muted-foreground font-normal">Sem prazo</span>}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

           <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-sm font-semibold">Referências visuais</CardTitle>
                  <p className="text-xs text-muted-foreground">Inspirações enviadas pelo cliente</p>
                </div>
                {!isAgency && (
                   <>
                     <input
                       type="file"
                       id="reference-upload"
                       className="hidden"
                       accept="image/*"
                       onChange={async (e) => {
                         const files = e.target.files;
                         if (!files?.length) return;
                         setUploading(true);
                         try {
                            const data = await uploadFile(files[0]);
                            setCurrentRefUrl(data.url);
                           setCurrentRefDesc("");
                           setReferenceModalOpen(true);
                         } catch (err) {
                           toast.error("Erro ao carregar imagem");
                         } finally {
                           setUploading(false);
                         }
                       }}
                     />
                     <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => document.getElementById('reference-upload')?.click()} disabled={uploading}>
                       {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                       Adicionar
                     </Button>
                   </>
                 )}
              </CardHeader>
              <CardContent className="pt-0">
                 {demand.references && demand.references.length > 0 ? (
                   <div className="grid grid-cols-2 gap-2">
                 {demand.references?.map((ref, i) => (
                     <div key={i} className="group space-y-1">
                     <img 
                        src={ref.url} 
                         alt={ref.description || "Referência visual"} 
                          className="w-full aspect-square object-cover rounded-lg border cursor-pointer transition group-hover:opacity-90"
                         onClick={() => setPreviewImage({ url: ref.url, name: ref.description || "Referência visual" })}
                     />
                       {ref.description && <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">{ref.description}</p>}
                   </div>
                 ))}
                   </div>
                 ) : (
                   <div className="text-center py-6 border border-dashed rounded-lg">
                     <ImageIcon className="h-5 w-5 mx-auto text-muted-foreground/40 mb-1.5" />
                     <p className="text-xs text-muted-foreground">Nenhuma referência</p>
                   </div>
                 )}
              </CardContent>
           </Card>
 
           <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Links úteis</CardTitle>
                <p className="text-xs text-muted-foreground">Materiais externos relacionados</p>
              </CardHeader>
              <CardContent className="pt-0 space-y-1.5">
                 {demand.links && demand.links.length > 0 ? (
                   demand.links.map((l, i) => (
                     <a key={i} href={l} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline truncate p-2 rounded-md hover:bg-muted/50">
                       <LinkIcon className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{l}</span>
                     </a>
                   ))
                 ) : (
                   <div className="text-center py-6 border border-dashed rounded-lg">
                     <LinkIcon className="h-5 w-5 mx-auto text-muted-foreground/40 mb-1.5" />
                     <p className="text-xs text-muted-foreground">Nenhum link</p>
                   </div>
                 )}
              </CardContent>
           </Card>
        </div>
       </div>
 
       <Dialog open={referenceModalOpen} onOpenChange={setReferenceModalOpen}>
         <DialogContent className="sm:max-w-[425px]">
           <DialogHeader>
             <DialogTitle>Descrição da Referência</DialogTitle>
           </DialogHeader>
           <div className="space-y-4 py-4">
             {currentRefUrl && (
               <img 
                 src={currentRefUrl} 
                 alt="Preview" 
                 className="w-full h-48 object-cover rounded-lg border" 
               />
             )}
             <div className="space-y-2">
               <Label htmlFor="ref-desc">O que você quer nessa imagem de referência?</Label>
               <Textarea 
                 id="ref-desc"
                 placeholder="Descreva detalhes, cores, elementos ou o que deseja que seja seguido nesta imagem..."
                 value={currentRefDesc}
                 onChange={(e) => setCurrentRefDesc(e.target.value)}
                 className="min-h-[100px]"
               />
             </div>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setReferenceModalOpen(false)}>Cancelar</Button>
             <Button 
               onClick={async () => {
                 const newRefs = [...(demand.references || []), { url: currentRefUrl, description: currentRefDesc }];
                 try {
                   await api(`/demands/${id}`, { method: "PATCH", body: { references: newRefs } });
                   toast.success("Referência adicionada!");
                   setReferenceModalOpen(false);
                   load();
                 } catch (err) {
                   toast.error("Erro ao salvar referência");
                 }
               }}
             >
               Salvar Referência
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
 
        <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
          <DialogContent className="max-w-4xl p-3 sm:p-4">
            <DialogHeader>
              <DialogTitle className="text-sm font-medium truncate pr-8">
                {previewImage?.name || "Imagem"}
              </DialogTitle>
            </DialogHeader>
            {previewImage && (
              <div className="max-h-[75vh] overflow-auto rounded-lg bg-muted/20">
                <img
                  src={previewImage.url}
                  alt={previewImage.name || "Imagem ampliada"}
                  className="mx-auto max-h-[75vh] w-auto max-w-full object-contain"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
     </div>
   );
 }
