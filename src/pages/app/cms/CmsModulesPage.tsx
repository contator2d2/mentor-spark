 import { useState, useEffect } from "react";
 import { api } from "@/lib/api";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Switch } from "@/components/ui/switch";
 import { Label } from "@/components/ui/label";
 import { Badge } from "@/components/ui/badge";
 import { 
   LayoutGrid, 
   ChevronLeft,
   GripVertical,
   Settings2
 } from "lucide-react";
 import { useNavigate } from "react-router-dom";
 import { toast } from "sonner";

 export default function CmsModulesPage() {
   const navigate = useNavigate();
   const [modules, setModules] = useState<any[]>([
     { id: '1', name: 'Banners Sazonais', slug: 'banners', isActive: true, showInHome: true, order: 1 },
     { id: '2', name: 'Categorias de Produtos', slug: 'categories', isActive: true, showInHome: true, order: 2 },
     { id: '3', name: 'História da Empresa', slug: 'history', isActive: true, showInHome: false, order: 3 },
     { id: '4', name: 'Galeria de Imagens', slug: 'gallery', isActive: false, showInHome: false, order: 4 },
     { id: '5', name: 'Pegue e Monte', slug: 'kits', isActive: true, showInHome: true, order: 5 },
     { id: '6', name: 'Cursos', slug: 'courses', isActive: true, showInHome: true, order: 6 },
   ]);

   async function toggleModule(id: string, field: 'isActive' | 'showInHome') {
     const newModules = modules.map(m => m.id === id ? { ...m, [field]: !m[field] } : m);
     setModules(newModules);
     toast.success("Módulo atualizado!");
   }

   return (
     <div className="space-y-6 max-w-4xl mx-auto">
       <div className="flex items-center gap-3">
         <Button variant="ghost" size="icon" onClick={() => navigate("/app/cms")}>
           <ChevronLeft className="h-4 w-4" />
         </Button>
         <h1 className="font-display text-3xl font-bold">Módulos do Sistema</h1>
       </div>

       <Card>
         <CardHeader>
           <CardTitle>Configuração de Módulos</CardTitle>
         </CardHeader>
         <CardContent className="divide-y">
           {modules.sort((a,b) => a.order - b.order).map((m) => (
             <div key={m.id} className="py-4 flex items-center gap-4">
               <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
               <div className="flex-1">
                 <div className="flex items-center gap-2">
                   <span className="font-bold">{m.name}</span>
                   <Badge variant="outline" className="text-[10px] uppercase">{m.slug}</Badge>
                 </div>
                 <p className="text-xs text-muted-foreground">Ordem no menu: {m.order}</p>
               </div>
               
               <div className="flex items-center gap-6">
                 <div className="flex flex-col items-center gap-1">
                   <Label className="text-[10px] uppercase text-muted-foreground">Ativo</Label>
                   <Switch checked={m.isActive} onCheckedChange={() => toggleModule(m.id, 'isActive')} />
                 </div>
                 <div className="flex flex-col items-center gap-1">
                   <Label className="text-[10px] uppercase text-muted-foreground">Home</Label>
                   <Switch checked={m.showInHome} onCheckedChange={() => toggleModule(m.id, 'showInHome')} />
                 </div>
                 <Button variant="ghost" size="icon">
                   <Settings2 className="h-4 w-4 text-muted-foreground" />
                 </Button>
               </div>
             </div>
           ))}
         </CardContent>
       </Card>
     </div>
   );
 }
