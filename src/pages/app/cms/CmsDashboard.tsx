 import { useState, useEffect } from "react";
 import { api } from "@/lib/api";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { 
   LayoutGrid, 
   Image as ImageIcon, 
   ShoppingBag, 
   MessageCircle, 
   GraduationCap, 
   Store,
   Plus,
   Settings,
   Globe,
   Eye
 } from "lucide-react";
 import { useNavigate } from "react-router-dom";

 export default function CmsDashboard() {
   const navigate = useNavigate();
   const [stats, setStats] = useState({
     activeModules: 0,
     activeBanners: 0,
     categories: 0,
     kits: 0,
     courses: 0,
     partners: 0,
     whatsappClicks: 0
   });

   useEffect(() => {
     // api("/cms/stats").then(setStats).catch(() => {});
   }, []);

   const modules = [
     { id: "banners", name: "Banners Sazonais", icon: ImageIcon, count: stats.activeBanners, color: "bg-pink-500" },
     { id: "categories", name: "Categorias", icon: LayoutGrid, count: stats.categories, color: "bg-purple-500" },
     { id: "kits", name: "Pegue e Monte", icon: ShoppingBag, count: stats.kits, color: "bg-blue-500" },
     { id: "courses", name: "Cursos", icon: GraduationCap, count: stats.courses, color: "bg-orange-500" },
     { id: "shops", name: "Lojas", icon: Store, count: stats.activeModules, color: "bg-green-500" },
     { id: "faq", name: "FAQ / Dúvidas", icon: MessageCircle, count: 0, color: "bg-yellow-500" },
   ];

   return (
     <div className="space-y-6">
       <div className="flex items-center justify-between">
         <div>
           <h1 className="font-display text-3xl font-bold">CMS Modular Basmar</h1>
           <p className="text-muted-foreground">Gerencie o conteúdo do seu site vitrine.</p>
         </div>
         <div className="flex gap-2">
           <Button variant="outline" className="gap-2">
             <Eye className="h-4 w-4" /> Ver Site
           </Button>
           <Button className="gap-2" onClick={() => navigate("/app/cms/modules")}>
             <Settings className="h-4 w-4" /> Módulos
           </Button>
         </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <Card>
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium text-muted-foreground">Cliques no WhatsApp</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{stats.whatsappClicks}</div>
             <p className="text-xs text-muted-foreground mt-1">+12% desde ontem</p>
           </CardContent>
         </Card>
         {/* Add more stats cards as needed */}
       </div>

       <h2 className="text-xl font-bold mt-8">Gerenciamento de Conteúdo</h2>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {modules.map((m) => (
           <Card key={m.id} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate(`/app/cms/${m.id}`)}>
             <CardContent className="p-6">
               <div className="flex items-start justify-between">
                 <div className={`p-3 rounded-xl ${m.color} text-white`}>
                   <m.icon className="h-6 w-6" />
                 </div>
                 <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                   <Plus className="h-4 w-4" />
                 </Button>
               </div>
               <div className="mt-4">
                 <h3 className="font-bold text-lg">{m.name}</h3>
                 <p className="text-sm text-muted-foreground mt-1">{m.count} itens ativos</p>
               </div>
             </CardContent>
           </Card>
         ))}
       </div>
     </div>
   );
 }
