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
    History,
    Plus,
    Check,
    Sparkles,
    User,
    Calendar,
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
   const [selectedVersion, setSelectedVersion] = useState<any>(null);

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

   // Seleciona automaticamente a versão mais recente quando os dados carregam
   useEffect(() => {
     const latest = demand?.versions?.[0];
     if (latest && !selectedVersion) {
       setSelectedVersion(latest);
     }
   }, [demand, selectedVersion]);

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

   const versions = demand.versions || [];
   const latestVersion = versions[0];
   const currentDisplayVersion = selectedVersion || latestVersion;

   return (
     <div className="min-h-screen bg-[#f8f9fa] pb-12">
       {/* Header Modernizado */}
        <header className="bg-white/90 backdrop-blur-md border-b sticky top-0 z-50 px-6 py-4 shadow-sm">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
           <div className="flex items-center gap-4">
             <div className="bg-primary/10 p-2 rounded-xl">
               <FileText className="h-5 w-5 text-primary" />
             </div>
             <div className="flex flex-col">
               <h1 className="font-bold text-lg leading-tight text-slate-900">{demand.title}</h1>
               <div className="flex items-center gap-2">
                 <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{demand.type}</span>
                 <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className="text-[10px] text-muted-foreground font-medium">
                    Exibindo Versão {currentDisplayVersion?.versionNumber || 1}
                  </span>
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

        <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* Coluna Principal: Conteúdo da Entrega */}
         <div className="lg:col-span-8 space-y-8">
            <section className="space-y-6">
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg text-primary">
                    <History className="h-5 w-5" />
                  </div>
                  <h2 className="font-bold text-slate-800">Evolução do Projeto</h2>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-[200px] sm:max-w-none">
                  {versions.slice().reverse().map((v: any) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVersion(v)}
                      className={`flex flex-col items-center justify-center min-w-[50px] h-12 rounded-xl border-2 transition-all ${
                        currentDisplayVersion?.id === v.id
                          ? "border-primary bg-primary/5 text-primary shadow-inner"
                          : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200"
                      }`}
                    >
                      <span className="text-[10px] font-bold">V{v.versionNumber}</span>
                    </button>
                  ))}
                </div>
              </div>

              {currentDisplayVersion ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="bg-white p-6 rounded-3xl border shadow-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Sparkles className="h-20 w-20 text-primary" />
                    </div>
                    
                    <div className="flex items-start gap-4 mb-6">
                      <div className="bg-slate-100 h-10 w-10 rounded-full flex items-center justify-center text-slate-500 shrink-0">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-900">{currentDisplayVersion.creator?.name || "Equipe de Produção"}</h4>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {new Date(currentDisplayVersion.createdAt).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1 leading-relaxed whitespace-pre-wrap">
                          {currentDisplayVersion.comment || "Os arquivos desta versão estão prontos para sua revisão."}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {currentDisplayVersion.files?.map((file: any, idx: number) => {
                        const isImage = file.type?.startsWith('image/') || file.url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                        return (
                          <div key={idx} className="group relative bg-slate-50 rounded-2xl overflow-hidden border border-slate-200/60 transition-all hover:ring-2 hover:ring-primary/20">
                            {isImage ? (
                              <div className="aspect-video relative overflow-hidden cursor-zoom-in" onClick={() => setPreviewFile(file)}>
                                <img src={file.url} alt={file.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                  <div className="flex gap-2 w-full">
                                    <Button size="sm" className="rounded-full bg-white/20 backdrop-blur-md text-white border-white/30 hover:bg-white/40 flex-1">
                                      <Eye className="h-3 w-3 mr-2" /> Ampliar
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="aspect-video flex flex-col items-center justify-center p-4 bg-slate-100">
                                <div className="bg-white p-3 rounded-xl shadow-sm mb-3">
                                  <FileText className="h-8 w-8 text-primary/40" />
                                </div>
                                <p className="text-[10px] font-bold text-slate-700 truncate w-full px-4 text-center">{file.name}</p>
                              </div>
                            )}
                            <div className="p-3 bg-white border-t flex items-center justify-between">
                               <div className="flex flex-col min-w-0">
                                 <span className="text-[10px] font-bold text-slate-800 truncate">{file.name}</span>
                                 <span className="text-[8px] text-slate-400 font-medium uppercase">{isImage ? 'Visual' : 'Anexo'}</span>
                               </div>
                               <Button 
                                 variant="ghost" 
                                 size="icon" 
                                 className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   window.open(file.url, '_blank');
                                 }}
                               >
                                 <Download className="h-4 w-4" />
                               </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
          <div className="lg:col-span-4">
            <aside className="sticky top-24 space-y-6">
              <Card className="rounded-[32px] overflow-hidden border-none shadow-xl shadow-slate-200/50 bg-white">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Central de Aprovação</span>
                  </div>
                  <h3 className="text-xl font-bold font-display">Decisão Final</h3>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="comment" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Observações ou Ajustes
                      </Label>
                    </div>
                    <Textarea
                      id="comment"
                      placeholder="Ex: Gostei muito, mas podemos alterar a cor do botão?"
                      className="min-h-[120px] rounded-2xl border-slate-100 focus:ring-primary/10 bg-slate-50/50 resize-none text-sm p-4 transition-all focus:bg-white"
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button
                      className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] group"
                      onClick={() => handleReview('approved')}
                      disabled={submitting}
                    >
                      {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                        <div className="flex items-center justify-center w-full">
                          <Check className="h-5 w-5 mr-2 stroke-[3px]" />
                          Aprovar Agora
                          <ArrowRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </div>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full h-14 rounded-2xl border-2 border-slate-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 font-bold transition-all active:scale-[0.98] text-slate-600 group"
                      onClick={() => handleReview('adjustments')}
                      disabled={submitting}
                    >
                      {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                        <div className="flex items-center justify-center w-full">
                          <X className="h-5 w-5 mr-2 stroke-[3px]" />
                          Solicitar Ajustes
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden">
               <div className="p-5 border-b bg-slate-50/50">
                 <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Objetivo Inicial</h3>
               </div>
               <CardContent className="p-6">
                 <p className="text-sm text-slate-600 leading-relaxed italic">
                   {demand.description || demand.objective || "Sem descrição disponível."}
                 </p>
               </CardContent>
              </Card>
            </aside>
          </div>
        </main>

        {previewFile && (
          <div className="fixed inset-0 z-[100] bg-slate-900/98 backdrop-blur-md flex flex-col animate-in fade-in duration-300">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex flex-col">
                <h3 className="text-white font-bold">{previewFile.name}</h3>
                <span className="text-white/40 text-[10px] uppercase tracking-widest">Visualização em Alta Definição</span>
              </div>
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  className="rounded-full bg-white/10 border-white/20 text-white hover:bg-white/20 h-11 px-6"
                  onClick={() => window.open(previewFile.url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" /> Abrir Original
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="rounded-full text-white hover:bg-white/20 h-11 w-11"
                  onClick={() => setPreviewFile(null)}
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
              <img 
                src={previewFile.url} 
                alt={previewFile.name} 
                className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-500 ring-1 ring-white/20" 
              />
              
              {/* Barra de Aprovação Flutuante no Preview */}
              <div className="mt-8 bg-white rounded-3xl p-2 shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-10 duration-700 delay-300">
                <Button 
                  className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 h-12 px-8 font-bold"
                  onClick={() => {
                    setPreviewFile(null);
                    handleReview('approved');
                  }}
                >
                  Aprovar Versão
                </Button>
                <Button 
                  variant="ghost"
                  className="rounded-2xl h-12 px-8 font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600"
                  onClick={() => {
                    setPreviewFile(null);
                    const el = document.getElementById('comment');
                    el?.focus();
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Solicitar Ajustes
                </Button>
              </div>
            </div>
            
            <div className="p-6 border-t border-white/10 bg-black/20 text-center">
              <div className="flex items-center justify-center gap-6 text-white/60 text-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(currentDisplayVersion.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(currentDisplayVersion.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3" />
                  <span>{currentDisplayVersion.creator?.name || "Equipe"}</span>
                </div>
              </div>
            </div>
          </div>
        )}
     </div>
   );
}
