 import { useState } from "react";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Card } from "@/components/ui/card";
 import { toast } from "sonner";
 import { Sparkles } from "lucide-react";
 
 export function LeadForm() {
   const [loading, setLoading] = useState(false);
 
   const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     setLoading(true);
     // Simulando envio
     setTimeout(() => {
       setLoading(false);
       toast.success("Recebemos seu interesse! Nossa equipe entrará em contato em breve.");
     }, 1500);
   };
 
   return (
     <Card className="p-6 md:p-8 shadow-elegant glass-card max-w-xl mx-auto border-primary/20">
       <div className="flex items-center gap-2 mb-6 text-primary">
         <Sparkles className="h-5 w-5" />
         <h3 className="font-display font-bold text-xl">Quero Conhecer o Mentor Glee-go</h3>
       </div>
       
       <form onSubmit={handleSubmit} className="space-y-4">
         <div className="space-y-2">
           <Label htmlFor="name">Nome</Label>
           <Input id="name" placeholder="Seu nome completo" required className="bg-background/50" />
         </div>
         
         <div className="space-y-2">
           <Label htmlFor="whatsapp">WhatsApp</Label>
           <Input id="whatsapp" placeholder="(00) 00000-0000" required className="bg-background/50" />
         </div>
         
         <div className="space-y-2">
           <Label htmlFor="niche">Nicho de atuação</Label>
           <Input id="niche" placeholder="Ex: Empresarial, Financeiro, Carreira..." required className="bg-background/50" />
         </div>
         
         <div className="space-y-2">
           <Label htmlFor="mentorees">Quantos mentorados atende hoje?</Label>
           <Select required>
             <SelectTrigger id="mentorees" className="bg-background/50">
               <SelectValue placeholder="Selecione uma faixa" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="0-5">0 a 5 mentorados</SelectItem>
               <SelectItem value="6-20">6 a 20 mentorados</SelectItem>
               <SelectItem value="21-50">21 a 50 mentorados</SelectItem>
               <SelectItem value="50+">Mais de 50 mentorados</SelectItem>
             </SelectContent>
           </Select>
         </div>
         
         <div className="space-y-2">
           <Label htmlFor="goal">Objetivo principal</Label>
           <Input id="goal" placeholder="Ex: Organizar operação, Escalar vendas..." required className="bg-background/50" />
         </div>
         
         <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90 shadow-glow h-12 text-base font-bold" disabled={loading}>
           {loading ? "Enviando..." : "Quero Conhecer o Mentor Glee-go"}
         </Button>
         
         <p className="text-[10px] text-center text-muted-foreground mt-4">
           Seus dados estão seguros e serão usados apenas para o contato de nossa equipe.
         </p>
       </form>
     </Card>
   );
 }