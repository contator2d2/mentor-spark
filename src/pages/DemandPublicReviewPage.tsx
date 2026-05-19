import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
 import {
   Loader2,
   CheckCircle2,
   AlertCircle,
   Download,
   FileText,
   Clock,
   MessageSquare,
   Eye,
   ExternalLink,
   X,
   ChevronRight,
   ArrowRight,
 } from "lucide-react";
import { toast } from "sonner";

export default function DemandPublicReviewPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [demand, setDemand] = useState<any>(null);
  const [loading, setLoading] = useState(true);
   const [reviewComment, setReviewComment] = useState("");
   const [submitting, setSubmitting] = useState(false);
   const [done, setDone] = useState(false);
   const [previewFile, setPreviewFile] = useState<any>(null);

  useEffect(() => {
    if (!id || !token) {
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/demands/public/${id}?token=${token}`)
      .then(res => {
        if (!res.ok) throw new Error("Link inválido ou expirado");
        return res.json();
      })
      .then(setDemand)
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [id, token]);

  async function handleReview(status: 'approved' | 'adjustments') {
    if (status === 'adjustments' && !reviewComment.trim()) {
      toast.error("Por favor, descreva os ajustes necessários.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/demands/public/${id}/review?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, comment: reviewComment })
      });

      if (!res.ok) throw new Error("Falha ao enviar revisão");
      
      setDone(true);
      toast.success(status === 'approved' ? "Demanda aprovada!" : "Solicitação de ajustes enviada.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  
  if (!demand || !token) return (
    <div className="flex flex-col h-screen items-center justify-center p-6 text-center">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h1 className="text-xl font-bold">Link Inválido</h1>
      <p className="text-muted-foreground">Este link de revisão não é mais válido ou está incorreto.</p>
    </div>
  );

  if (done) return (
    <div className="flex flex-col h-screen items-center justify-center p-6 text-center bg-muted/30">
      <div className="bg-background p-8 rounded-3xl shadow-xl border max-w-md w-full animate-in zoom-in-95 duration-300">
        <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Obrigado!</h1>
        <p className="text-muted-foreground mb-6">Sua revisão foi enviada com sucesso para a equipe de produção.</p>
        <Button className="w-full" variant="outline" onClick={() => window.close()}>Fechar</Button>
      </div>
    </div>
  );

   const latestVersion = demand.versions?.[0];

   return (
     <div className="min-h-screen bg-[#f8f9fa] pb-12">
       {/* Header Modernizado */}
       <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50 px-6 py-4">
         <div className="max-w-5xl mx-auto flex items-center justify-between">
           <div className="flex items-center gap-4">
             <div className="bg-primary/10 p-2 rounded-xl">
               <FileText className="h-5 w-5 text-primary" />
             </div>
             <div className="flex flex-col">
               <h1 className="font-bold text-lg leading-tight text-slate-900">{demand.title}</h1>
               <div className="flex items-center gap-2">
                 <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{demand.type}</span>
                 <span className="w-1 h-1 rounded-full bg-slate-300" />
                 <span className="text-[10px] text-muted-foreground font-medium">Versão {latestVersion?.versionNumber || 1}</span>
               </div>
             </div>
           </div>
           <Badge className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-tight ${
             demand.status === 'approved' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-primary hover:bg-primary/90'
           }`}>
             {demand.status === 'waiting_feedback' ? 'Aguardando Revisão' : demand.status}
           </Badge>
         </div>
       </header>

       <main className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* Coluna Principal: Conteúdo da Entrega */}
         <div className="lg:col-span-8 space-y-8">
           <section className="space-y-4">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-2 text-slate-900 font-bold">
                 <Clock className="h-4 w-4 text-primary" />
                 <h2>Arquivos da Entrega</h2>
               </div>
               {latestVersion && (
                 <span className="text-xs text-muted-foreground bg-white px-2 py-1 rounded-lg border shadow-sm">
                   Enviado em {new Date(latestVersion.createdAt).toLocaleDateString('pt-BR')}
                 </span>
               )}
             </div>

             {latestVersion ? (
               <div className="space-y-6">
                 {latestVersion.comment && (
                   <div className="bg-white p-5 rounded-2xl border shadow-sm text-slate-700 leading-relaxed relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                     <MessageSquare className="h-4 w-4 text-primary/30 absolute top-4 right-4" />
                     <p className="text-sm italic">"{latestVersion.comment}"</p>
                   </div>
                 )}

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                   {latestVersion.files?.map((file: any, idx: number) => {
                     const isImage = file.type?.startsWith('image/') || file.url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                     return (
                       <div key={idx} className="group relative bg-white rounded-3xl overflow-hidden border shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                         {isImage ? (
                           <div className="aspect-[4/3] relative">
                             <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                             <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3">
                               <Button 
                                 size="sm" 
                                 className="rounded-full bg-white text-slate-900 hover:bg-slate-100"
                                 onClick={() => setPreviewFile(file)}
                               >
                                 <Eye className="h-4 w-4 mr-2" /> Ver Grande
                               </Button>
                               <Button 
                                 size="sm" 
                                 variant="outline" 
                                 className="rounded-full bg-transparent text-white border-white hover:bg-white/20"
                                 onClick={() => window.open(file.url, '_blank')}
                               >
                                 <Download className="h-4 w-4" />
                               </Button>
                             </div>
                           </div>
                         ) : (
                           <div className="aspect-[4/3] flex flex-col items-center justify-center p-8 text-center bg-slate-50">
                             <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
                               <FileText className="h-10 w-10 text-primary/40" />
                             </div>
                             <p className="text-xs font-bold text-slate-900 truncate w-full px-4 mb-4">{file.name}</p>
                             <div className="flex gap-2">
                               <Button 
                                 size="sm" 
                                 className="rounded-full"
                                 onClick={() => window.open(file.url, '_blank')}
                               >
                                 <Download className="h-4 w-4 mr-2" /> Baixar
                               </Button>
                             </div>
                           </div>
                         )}
                         <div className="p-4 border-t bg-white flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase truncate max-w-[150px]">{file.name}</span>
                            <Badge variant="secondary" className="text-[8px] rounded-full uppercase">{isImage ? 'Imagem' : 'Documento'}</Badge>
                         </div>
                       </div>
                     );
                   })}
                 </div>
               </div>
             ) : (
               <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-slate-200">
                 <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                   <AlertCircle className="h-8 w-8" />
                 </div>
                 <h3 className="text-slate-900 font-bold">Sem arquivos</h3>
                 <p className="text-slate-500 text-sm">Nenhum arquivo de entrega foi encontrado para esta demanda.</p>
               </div>
             )}
           </section>
         </div>

         {/* Sidebar: Ações e Info */}
         <div className="lg:col-span-4 space-y-6">
           <section className="sticky top-24 space-y-6">
             {/* Painel de Decisão */}
             <Card className="rounded-[32px] overflow-hidden border-none shadow-2xl shadow-primary/5 bg-white">
               <CardHeader className="bg-slate-900 text-white p-6">
                 <CardTitle className="text-lg flex items-center gap-2 font-display">
                   <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                   Sua Decisão
                 </CardTitle>
                 <p className="text-slate-400 text-xs mt-1 leading-relaxed">Avalie o trabalho entregue e decida os próximos passos.</p>
               </CardHeader>
               <CardContent className="p-6 space-y-6">
                 <div className="space-y-3">
                   <Label htmlFor="comment" className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                     <MessageSquare className="h-3 w-3" />
                     Feedback ou Correções
                   </Label>
                   <Textarea
                     id="comment"
                     placeholder="Descreva aqui o que achou ou o que precisa ser alterado..."
                     className="min-h-[140px] rounded-2xl border-slate-200 focus:ring-primary/20 bg-slate-50/50 resize-none text-sm p-4"
                     value={reviewComment}
                     onChange={(e) => setReviewComment(e.target.value)}
                   />
                 </div>

                 <div className="flex flex-col gap-3">
                   <Button
                     className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95 group"
                     onClick={() => handleReview('approved')}
                     disabled={submitting}
                   >
                     {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                       <>
                         <CheckCircle2 className="h-5 w-5 mr-2" />
                         Aprovar Projeto
                         <ArrowRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                       </>
                     )}
                   </Button>
                   
                   <Button
                     variant="outline"
                     className="w-full h-14 rounded-2xl border-2 border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 font-bold transition-all active:scale-95 text-slate-600"
                     onClick={() => handleReview('adjustments')}
                     disabled={submitting}
                   >
                     {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                       <>
                         <AlertCircle className="h-5 w-5 mr-2" />
                         Solicitar Ajustes
                       </>
                     )}
                   </Button>
                 </div>
               </CardContent>
             </Card>

             {/* Resumo da Demanda */}
             <Card className="rounded-3xl border-slate-200 shadow-sm bg-white overflow-hidden">
               <div className="p-5 border-b bg-slate-50/50">
                 <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Objetivo Inicial</h3>
               </div>
               <CardContent className="p-6">
                 <p className="text-sm text-slate-600 leading-relaxed italic">
                   {demand.description || demand.objective || "Sem descrição disponível."}
                 </p>
               </CardContent>
             </Card>
           </section>
         </div>
       </main>

       {/* Modal de Preview Moderno */}
       {previewFile && (
         <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-300">
           <div className="flex items-center justify-between p-6">
             <div className="flex flex-col">
               <h3 className="text-white font-bold">{previewFile.name}</h3>
               <span className="text-white/40 text-xs uppercase tracking-widest">Pré-visualização</span>
             </div>
             <div className="flex items-center gap-3">
               <Button 
                 variant="outline" 
                 className="rounded-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                 onClick={() => window.open(previewFile.url, '_blank')}
               >
                 <ExternalLink className="h-4 w-4 mr-2" /> Abrir Original
               </Button>
               <Button 
                 size="icon" 
                 variant="ghost" 
                 className="rounded-full text-white hover:bg-white/10"
                 onClick={() => setPreviewFile(null)}
               >
                 <X className="h-6 w-6" />
               </Button>
             </div>
           </div>
           <div className="flex-1 flex items-center justify-center p-4 md:p-12 overflow-hidden">
             <img 
               src={previewFile.url} 
               alt={previewFile.name} 
               className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-500" 
             />
           </div>
         </div>
       )}
     </div>
   );
}
