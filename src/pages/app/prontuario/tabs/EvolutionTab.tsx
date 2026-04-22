 import { Card } from "@/components/ui/card";
 import { TrendingUp, CheckCircle2, AlertCircle, Clock, Star, Sparkles } from "lucide-react";
 import { ProntuarioPayload } from "../types";
 
 interface Props {
   data: ProntuarioPayload;
 }
 
 export function EvolutionTab({ data }: Props) {
   const { timeline, record } = data;
 
   return (
     <div className="space-y-6">
       {/* Cabeçalho de Evolução */}
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
           <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status de Entrega</div>
           <div className="flex items-center gap-2">
             <CheckCircle2 className="h-5 w-5 text-emerald-500" />
             <span className="text-xl font-bold">Em dia</span>
           </div>
         </Card>
         <Card className="p-4 bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
           <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Score de Execução</div>
           <div className="flex items-center gap-2">
             <TrendingUp className="h-5 w-5 text-primary" />
             <span className="text-xl font-bold">{record.executionScore}%</span>
           </div>
         </Card>
         <Card className="p-4 bg-gradient-to-br from-violet-500/10 to-transparent border-violet-500/20">
           <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Engajamento</div>
           <div className="flex items-center gap-2">
             <Star className="h-5 w-5 text-violet-500" />
             <span className="text-xl font-bold">{record.engagementScore}%</span>
           </div>
         </Card>
         <Card className="p-4 bg-gradient-to-br from-rose-500/10 to-transparent border-rose-500/20">
           <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Índice de Risco</div>
           <div className="flex items-center gap-2">
             <AlertCircle className="h-5 w-5 text-rose-500" />
             <span className="text-xl font-bold">{record.riskScore}%</span>
           </div>
         </Card>
       </div>
 
       <div className="grid md:grid-cols-12 gap-6">
         {/* Linha do Tempo Visual de Marcos */}
         <div className="md:col-span-8 space-y-4">
           <h3 className="font-display font-bold text-lg flex items-center gap-2">
             <Sparkles className="h-4 w-4 text-amber-500" />
             Principais Marcos da Jornada
           </h3>
           <div className="relative border-l-2 border-border ml-3 pl-8 space-y-8 py-4">
             {timeline.slice(0, 10).map((item, idx) => (
               <div key={idx} className="relative">
                 <div className="absolute -left-[41px] top-0 h-6 w-6 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                   <div className="h-2 w-2 rounded-full bg-primary" />
                 </div>
                 <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
                   <div className="flex items-center justify-between mb-1">
                     <span className="text-xs font-bold text-primary uppercase">{item.type.replace('_', ' ')}</span>
                     <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                       <Clock className="h-3 w-3" />
                       {new Date(item.at).toLocaleDateString('pt-BR')}
                     </span>
                   </div>
                   <div className="text-sm font-medium">{item.title}</div>
                   {item.meta?.scorePct && (
                     <div className="mt-2 h-1.5 w-32 bg-muted rounded-full overflow-hidden">
                       <div className="h-full bg-primary" style={{ width: `${item.meta.scorePct}%` }} />
                     </div>
                   )}
                 </div>
               </div>
             ))}
           </div>
         </div>
 
         {/* Insights da IA no Dashboard */}
         <div className="md:col-span-4 space-y-6">
           <Card className="p-5 border-primary/20 bg-primary/5">
             <h4 className="font-bold flex items-center gap-2 mb-4">
               <Sparkles className="h-4 w-4 text-primary" />
               Análise de Evolução (IA)
             </h4>
             <div className="space-y-4 text-sm">
               <div className="p-3 bg-background rounded-lg border border-border">
                 <div className="font-bold text-xs text-primary mb-1 uppercase">Ponto de Atenção</div>
                 <p className="text-muted-foreground leading-relaxed">
                   O mentorado reduziu a frequência de conclusão de tarefas em 15% nos últimos 10 dias.
                 </p>
               </div>
               <div className="p-3 bg-background rounded-lg border border-border">
                 <div className="font-bold text-xs text-emerald-500 mb-1 uppercase">Oportunidade</div>
                 <p className="text-muted-foreground leading-relaxed">
                   O score de "Clareza Estratégica" subiu após o teste mais recente, indicando maturidade para o Próximo Módulo.
                 </p>
               </div>
             </div>
           </Card>
         </div>
       </div>
     </div>
   );
 }