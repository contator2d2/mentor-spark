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
  MessageSquare
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
    <div className="min-h-screen bg-muted/30 pb-12">
      <header className="bg-background border-b sticky top-0 z-10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex flex-col">
             <h1 className="font-bold text-lg leading-tight">{demand.title}</h1>
             <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{demand.type}</p>
          </div>
          <Badge className={demand.status === 'approved' ? 'bg-emerald-500' : 'bg-amber-500'}>
            {demand.status === 'waiting_feedback' ? 'Aguardando sua revisão' : demand.status.toUpperCase()}
          </Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Última Entrega / Prova */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <h2 className="text-sm font-semibold uppercase tracking-tight">Última Entrega Enviada</h2>
          </div>
          
          {latestVersion ? (
            <Card className="overflow-hidden border-2 border-primary/20 shadow-lg">
              <CardContent className="p-0">
                <div className="bg-muted/50 p-4 border-b flex items-center justify-between">
                  <span className="text-sm font-medium">Versão {latestVersion.versionNumber}</span>
                  <span className="text-xs text-muted-foreground">{new Date(latestVersion.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
                
                <div className="p-6 space-y-6">
                  {latestVersion.comment && (
                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 italic text-sm text-foreground/80">
                      "{latestVersion.comment}"
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {latestVersion.files?.map((file: any, idx: number) => {
                      const isImage = file.type?.startsWith('image/') || file.url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                      return (
                        <div key={idx} className="group relative rounded-2xl overflow-hidden border shadow-sm bg-background transition-all hover:shadow-md">
                          {isImage ? (
                            <div className="aspect-square relative flex flex-col">
                              <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <Button size="sm" variant="secondary" onClick={() => window.open(file.url, '_blank')}>
                                  <Download className="h-4 w-4 mr-2" /> Baixar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="aspect-square flex flex-col items-center justify-center p-6 text-center gap-3">
                              <FileText className="h-12 w-12 text-muted-foreground/40" />
                              <p className="text-xs font-medium truncate w-full px-2">{file.name}</p>
                              <Button size="sm" variant="outline" onClick={() => window.open(file.url, '_blank')}>
                                <Download className="h-4 w-4 mr-2" /> Baixar
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="p-12 text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum arquivo de entrega encontrado.</p>
            </Card>
          )}
        </section>

        {/* Formulário de Revisão */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            <h2 className="text-sm font-semibold uppercase tracking-tight">Sua Avaliação</h2>
          </div>

          <Card className="shadow-xl">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="comment">Comentários ou Ajustes Necessários</Label>
                <Textarea 
                  id="comment"
                  placeholder="Explique o que achou ou descreva detalhadamente o que precisa ser alterado..."
                  className="min-h-[120px] rounded-2xl"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <Button 
                  variant="outline" 
                  className="h-14 rounded-2xl border-2 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                  onClick={() => handleReview('adjustments')}
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <AlertCircle className="h-5 w-5 mr-2" />}
                  Solicitar Ajustes
                </Button>
                <Button 
                  className="h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200"
                  onClick={() => handleReview('approved')}
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
                  Aprovar Tudo
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Detalhes da Demanda (Contexto) */}
        <section className="pt-8">
           <Card className="bg-background/50 border-dashed">
             <CardHeader className="pb-2">
               <CardTitle className="text-sm text-muted-foreground">Objetivo Original</CardTitle>
             </CardHeader>
             <CardContent>
                <p className="text-sm">{demand.description || demand.objective || "Sem descrição disponível."}</p>
             </CardContent>
           </Card>
        </section>
      </main>
    </div>
  );
}
