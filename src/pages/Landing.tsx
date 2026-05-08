import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
   ArrowRight, Sparkles, Users, ClipboardList, Brain, BarChart3, ShieldCheck, Smartphone, Search, Database, TrendingDown,
   Calendar, DollarSign, GraduationCap, MessageSquare, Zap, CheckCircle2, Monitor, X, Check, Activity, Eye,
   Star, TrendingUp, Quote, Play, ChevronRight, Workflow, Target, CheckCircle, Layers, Lock, Settings2, FileText, Scale, Briefcase, CircleDollarSign, HeartHandshake,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

 import { LeadForm } from "@/components/landing/LeadForm";
 
 const problemCards = [
   { icon: Users, title: "Muito atendimento, pouco controle", desc: "Perdido entre várias ferramentas e sem visão clara." },
   { icon: Search, title: "Diagnóstico sem padrão", desc: "Cada cliente é avaliado de um jeito diferente." },
   { icon: Calendar, title: "Reuniões que se perdem", desc: "Sem histórico organizado do que foi conversado." },
   { icon: TrendingDown, title: "Baixa execução do mentorado", desc: "O cliente não sabe o que fazer entre as sessões." },
   { icon: Smartphone, title: "App fraco ou inexistente", desc: "Falta de profissionalismo na entrega digital." },
   { icon: Layers, title: "Difícil escalar sem caos", desc: "Crescer significa mais bagunça operacional." },
 ];
 
 const modules = [
   { title: "Captação", icon: Target, items: ["QR Code para eventos", "Formulários", "Entrada via landing page", "Pipeline comercial"] },
   { title: "Diagnóstico", icon: ClipboardList, items: ["Testes por segmento", "Score automático", "Relatórios detalhados", "Leitura inicial com IA"] },
   { title: "Prontuário", icon: MessageSquare, items: ["Dores e objetivos", "Histórico completo", "Evolução do cliente", "Timeline viva"] },
   { title: "Reuniões", icon: Calendar, items: ["Meet / Zoom", "Resumo automático", "Transcrição", "Próximos passos"] },
   { title: "Execução", icon: TrendingUp, items: ["Tarefas e metas", "Planos de ação", "Alertas de atraso", "Acompanhamento"] },
   { title: "App", icon: Smartphone, items: ["Agenda integrada", "Conteúdos exclusivos", "Tarefas pendentes", "Notificações push"] },
 ];
 
 const timelineSteps = [
   { t: "Entrada do Lead", d: "O lead entra por evento, palestra, campanha ou indicação." },
   { t: "Diagnóstico Inicial", d: "Faz testes e diagnósticos automáticos no app." },
   { t: "Análise Estratégica", d: "O mentor recebe análise inicial consolidada pela IA." },
   { t: "Sessão Inteligente", d: "A reunião acontece com histórico e contexto completo." },
   { t: "Plano de Ação", d: "Tarefas e conteúdos específicos são liberados no app." },
   { t: "Evolução Contínua", d: "Plataforma acompanha engajamento, riscos e progresso." },
 ];
 
 const differentials = [
   { title: "Prontuário Inteligente", desc: "Cada mentorado com contexto completo e visão 360º.", icon: Brain },
   { title: "IA como Suporte", desc: "Resumos, insights e sugestões de próximos passos.", icon: Sparkles },
   { title: "App Próprio", desc: "Experiência premium para o cliente no mobile e desktop.", icon: Smartphone },
   { title: "Biblioteca de Testes", desc: "Modelos prontos por nicho para você começar rápido.", icon: Database },
   { title: "Funil de Conversão", desc: "Transforme eventos e palestras em mentorias pagas.", icon: Zap },
   { title: "Escala com Método", desc: "Atenda mais clientes sem perder a qualidade do serviço.", icon: TrendingUp },
 ];
 
 const niches = [
   { title: "Mentor Empresarial", desc: "Vendas, liderança, processos e finanças.", icon: Briefcase },
   { title: "Mentor Jurídico", desc: "Captação, operação e produtividade no direito.", icon: Scale },
   { title: "Mentor Financeiro", desc: "Margem, caixa e indicadores de performance.", icon: CircleDollarSign },
   { title: "Mentor RH", desc: "Cultura, liderança e gestão de pessoas.", icon: HeartHandshake },
 ];
 
 const aiCapabilities = [
   "Resumir reuniões automaticamente",
   "Consolidar histórico de sessões",
   "Sugerir próximos passos estratégicos",
   "Detectar riscos de cancelamento",
   "Apontar padrões de comportamento",
   "Gerar visão executiva da jornada",
   "Organizar informações dispersas",
 ];
 
 const librarySegments = [
   { title: "Empresarial", icon: Briefcase },
   { title: "RH & Pessoas", icon: Users },
   { title: "Financeiro", icon: DollarSign },
   { title: "Jurídico", icon: Scale },
 ];
 
 const realBenefits = [
   { title: "Mais Clareza", desc: "Você entende cada mentorado rapidamente.", icon: Eye },
   { title: "Mais Valor Percebido", desc: "O cliente sente o acompanhamento real.", icon: Star },
   { title: "Mais Escala", desc: "Atenda mais sem perder o contexto.", icon: TrendingUp },
   { title: "Mais Retenção", desc: "Motivos reais para continuar com você.", icon: Activity },
   { title: "Mais Conversão", desc: "Leads entram melhor preparados.", icon: Zap },
   { title: "Mais Profissionalismo", desc: "Sua operação sobe de nível imediatamente.", icon: ShieldCheck },
 ];

const stats = [
  { v: "+128", l: "leads/semana" },
  { v: "82", l: "testes aplicados" },
  { v: "23.4%", l: "conversão lead→mentorado" },
  { v: "412", l: "insights gerados" },
];

const testimonials = [
  { name: "Carlos Mendes", role: "Mentor de negócios", quote: "Triplicou minha conversão. A IA entrega insights que eu levaria horas pra escrever." , initial: "C" },
  { name: "Ana Paula Silva", role: "Coach executiva", quote: "Finalmente tenho controle total — captação, agenda, cobrança e cursos num único lugar." , initial: "A" },
  { name: "Roberto Lima", role: "Consultor estratégico", quote: "Saí de planilhas pro MentorFlow. Cresci 2x em 4 meses. Indispensável." , initial: "R" },
];

const plans = [
  {
    name: "Starter", price: "R$ 97", period: "/mês",
    desc: "Pra começar profissional", highlight: false,
    features: ["Até 50 leads", "Testes ilimitados", "1 trilha de conteúdo", "Agenda pública", "Suporte por email"],
  },
  {
    name: "Pro", price: "R$ 297", period: "/mês",
    desc: "Pro mentor que escala", highlight: true,
    features: ["Leads ilimitados", "IA personalizada", "Trilhas ilimitadas", "Cobrança recorrente Asaas", "WhatsApp + automações", "Dashboard executivo", "Suporte prioritário"],
  },
  {
    name: "Enterprise", price: "Custom", period: "",
    desc: "Times e instituições", highlight: false,
    features: ["Multi-mentor", "API + integrações", "Branding white-label", "Onboarding dedicado", "SLA garantido"],
  },
];

const faqs = [
  { q: "O MentorFlow serve para qualquer nicho?", a: "Sim. A estrutura é genérica e o conteúdo é 100% personalizável para atender diferentes metodologias." },
  { q: "Posso personalizar testes e relatórios?", a: "Sim. Você pode adaptar perguntas, pesos, linguagem, categorias e o layout dos resultados." },
  { q: "O mentorado tem app próprio?", a: "Sim. Ele acessa agenda, tarefas, conteúdos e sua evolução direto pelo celular ou navegador." },
  { q: "A IA substitui o mentor?", a: "Não. Ela apenas apoia sua operação, automatizando resumos e insights baseados no seu método." },
  { q: "Funciona para eventos e palestras?", a: "Sim. Leads podem entrar via QR Code e realizar testes rápidos durante seus eventos." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ============ HEADER ============ */}
       <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
         <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
           <div className="flex items-center gap-2">
             <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
               <Sparkles className="h-5 w-5 text-white" />
             </div>
             <div className="font-display text-xl font-bold">MentorFlow <span className="text-xs font-normal text-muted-foreground ml-1">by MentorFlow</span></div>
           </div>
           <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
             <a href="#recursos" className="text-muted-foreground hover:text-foreground transition-colors">Recursos</a>
             <a href="#para-quem" className="text-muted-foreground hover:text-foreground transition-colors">Para quem serve</a>
             <a href="#app" className="text-muted-foreground hover:text-foreground transition-colors">App Mentorado</a>
             <a href="#diagnosticos" className="text-muted-foreground hover:text-foreground transition-colors">Diagnósticos</a>
             <a href="#ia" className="text-muted-foreground hover:text-foreground transition-colors">IA</a>
             <a href="#demonstracao" className="text-muted-foreground hover:text-foreground transition-colors">Demonstração</a>
           </nav>
           <div className="flex items-center gap-2">
             <ThemeToggle />
             <Link to="/login"><Button variant="ghost" size="sm">Entrar</Button></Link>
             <a href="#demonstracao"><Button size="sm" className="bg-gradient-primary hover:opacity-90 shadow-glow">Agendar Demonstração</Button></a>
           </div>
         </div>
       </header>

      {/* ============ HERO ============ */}
       {/* ============ HERO ============ */}
       <section className="relative overflow-hidden bg-gradient-hero border-b border-border/40">
         <div className="absolute inset-0 bg-grid opacity-20" />
         <div className="absolute inset-0 bg-gradient-mesh" />
         <div className="blob bg-primary/20 h-[600px] w-[600px] -top-80 -left-80" />
         <div className="blob bg-accent/15 h-[500px] w-[500px] bottom-0 -right-40" />
         
         <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-32 grid md:grid-cols-2 gap-12 items-center">
           <div className="animate-fade-in">
             <Badge variant="outline" className="mb-6 bg-primary/5 border-primary/20 text-primary">Infraestrutura digital para mentores</Badge>
             <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05] mb-6">
               Transforme sua mentoria em uma operação <span className="text-gradient">organizada, escalável e inteligente</span>
             </h1>
             <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl leading-relaxed">
               Com o MentorFlow, você reúne mentorados, diagnósticos, reuniões, prontuário estratégico, app próprio e IA de suporte em uma única plataforma.
             </p>
             <div className="flex flex-wrap gap-3 mb-8">
               <a href="#demonstracao">
                 <Button size="lg" className="bg-gradient-primary hover:opacity-90 shadow-glow h-12 px-8 group font-bold">
                   Quero Ver uma Demonstração <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                 </Button>
               </a>
               <Button size="lg" variant="outline" className="h-12 px-8 font-semibold">Falar com Especialista</Button>
             </div>
             <div className="flex flex-wrap gap-4 text-sm text-muted-foreground font-medium">
               {["App para mentorados", "Testes e diagnósticos", "Reuniões com histórico", "IA Aplicada"].map((t) => (
                 <span key={t} className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> {t}</span>
               ))}
             </div>
           </div>
           <div className="relative animate-scale-in anim-delay-200">
             <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full" />
             <Card className="relative overflow-hidden shadow-elegant border-primary/20 p-2 glass-card">
                <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800" alt="MentorFlow Dashboard" className="rounded-lg shadow-2xl" />
             </Card>
           </div>
         </div>
       </section>

       {/* ============ PROBLEM ============ */}
       <section className="py-24 bg-muted/30">
         <div className="max-w-7xl mx-auto px-6">
           <div className="text-center mb-16">
             <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">Quando a mentoria cresce, a operação começa a travar</h2>
             <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Muitos mentores entregam valor, mas operam no improviso, o que limita o crescimento e a percepção de valor.</p>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {problemCards.map((card, i) => (
               <Card key={i} className="p-6 glass-card border-destructive/10 hover:border-destructive/30 transition-colors animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                 <div className="h-12 w-12 rounded-xl bg-destructive/5 flex items-center justify-center mb-4">
                   <card.icon className="h-6 w-6 text-destructive/70" />
                 </div>
                 <h3 className="font-bold text-lg mb-2">{card.title}</h3>
                 <p className="text-sm text-muted-foreground">{card.desc}</p>
               </Card>
             ))}
           </div>
         </div>
       </section>
 
       {/* ============ SOLUTION ============ */}
       <section id="recursos" className="py-24 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-primary/5 blur-[120px] rounded-full" />
         <div className="max-w-7xl mx-auto px-6 relative">
           <div className="text-center mb-16">
             <Badge variant="outline" className="mb-4">Módulos MentorFlow</Badge>
             <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">O MentorFlow centraliza toda a operação</h2>
             <p className="text-muted-foreground text-lg">Da entrada do lead até a evolução do mentorado, tudo conectado em um único sistema.</p>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {modules.map((m, i) => (
               <Card key={i} className="p-6 glass-card glass-card-hover border-primary/10">
                 <div className="flex items-center gap-3 mb-4">
                   <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                     <m.icon className="h-5 w-5 text-primary" />
                   </div>
                   <h3 className="font-bold text-xl">{m.title}</h3>
                 </div>
                 <ul className="space-y-2">
                   {m.items.map((item, idx) => (
                     <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                       <CheckCircle2 className="h-4 w-4 text-primary/60 shrink-0" />
                       {item}
                     </li>
                   ))}
                 </ul>
               </Card>
             ))}
           </div>
         </div>
       </section>
 
       {/* ============ LEAD FORM 1 ============ */}
       <section id="diagnosticos" className="py-24 bg-gradient-to-b from-background to-muted/30">
          <div className="max-w-7xl mx-auto px-6">
            <LeadForm />
          </div>
       </section>

       {/* ============ HOW IT WORKS ============ */}
       <section className="py-24 bg-background">
         <div className="max-w-7xl mx-auto px-6">
           <div className="text-center mb-16">
             <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">Da entrada do prospect à evolução do mentorado</h2>
           </div>
           <div className="relative">
             <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent -translate-y-1/2" />
             <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-8">
               {timelineSteps.map((step, i) => (
                 <div key={i} className="relative z-10 text-center animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                   <div className="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center mx-auto mb-4 font-bold shadow-glow">
                     {i + 1}
                   </div>
                   <h3 className="font-bold text-sm mb-2">{step.t}</h3>
                   <p className="text-xs text-muted-foreground">{step.d}</p>
                 </div>
               ))}
             </div>
           </div>
         </div>
       </section>
 
       {/* ============ DIFFERENTIALS ============ */}
       <section className="py-24 bg-muted/30">
         <div className="max-w-7xl mx-auto px-6">
           <div className="text-center mb-16">
             <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">Mais do que agenda. Mais do que CRM.</h2>
             <p className="text-muted-foreground text-lg">Diferenciais que tornam o MentorFlow único.</p>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {differentials.map((diff, i) => (
               <div key={i} className="p-8 rounded-2xl bg-background border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                 <diff.icon className="h-10 w-10 text-primary mb-6" />
                 <h3 className="font-bold text-xl mb-3">{diff.title}</h3>
                 <p className="text-muted-foreground">{diff.desc}</p>
               </div>
             ))}
           </div>
         </div>
       </section>
 
       {/* ============ PERSONALIZATION ============ */}
       <section id="para-quem" className="py-24">
         <div className="max-w-7xl mx-auto px-6">
           <div className="grid lg:grid-cols-2 gap-12 items-center">
             <div>
               <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">A estrutura é escalável. A metodologia continua sendo sua.</h2>
               <p className="text-lg text-muted-foreground mb-8">O MentorFlow atende diferentes nichos porque a base do sistema é sólida e o conteúdo é personalizável. Você adapta tudo ao seu método.</p>
               <div className="grid grid-cols-2 gap-4 mb-8">
                 {["Linguagem", "Testes", "Categorias", "Prompts da IA", "Score", "Relatórios"].map(item => (
                   <div key={item} className="flex items-center gap-2 font-medium">
                     <CheckCircle2 className="h-5 w-5 text-primary" /> {item}
                   </div>
                 ))}
               </div>
               <p className="p-4 rounded-lg bg-primary/5 border border-primary/10 font-medium italic">
                 "Seu método continua sendo o diferencial. A tecnologia potencializa."
               </p>
             </div>
             <div className="grid grid-cols-2 gap-4">
               {niches.map((niche, i) => (
                 <Card key={i} className="p-6 text-center glass-card border-primary/5 group hover:border-primary/20 transition-colors">
                   <niche.icon className="h-10 w-10 text-primary/70 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                   <h4 className="font-bold mb-2">{niche.title}</h4>
                   <p className="text-xs text-muted-foreground">{niche.desc}</p>
                 </Card>
               ))}
             </div>
           </div>
         </div>
       </section>

       {/* ============ APP ============ */}
       <section id="app" className="py-24 bg-gradient-to-r from-primary to-primary/80 text-white overflow-hidden relative">
         <div className="absolute inset-0 bg-grid opacity-10" />
         <div className="max-w-7xl mx-auto px-6 relative flex flex-col lg:flex-row gap-12 items-center">
           <div className="lg:w-1/2">
             <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">Seu mentorado não recebe só conteúdo. Ele acompanha a própria evolução.</h2>
             <p className="text-xl text-white/80 mb-8">No app o mentorado acessa agenda, tarefas, conteúdos e todo o seu progresso em tempo real.</p>
             <div className="grid grid-cols-2 gap-y-4">
               {["Próximas reuniões", "Tarefas da semana", "Testes liberados", "Trilhas de conteúdo", "Progresso visual", "Histórico completo"].map(item => (
                 <div key={item} className="flex items-center gap-2">
                   <Check className="h-5 w-5 bg-white/20 rounded-full p-1" /> {item}
                 </div>
               ))}
             </div>
             <p className="mt-8 text-sm font-medium bg-white/10 p-3 rounded-lg border border-white/20 inline-block">
               Até prospects podem entrar no app antes de fechar a mentoria.
             </p>
           </div>
           <div className="lg:w-1/2 relative">
             <div className="absolute -inset-10 bg-white/20 blur-3xl rounded-full" />
             <img src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=400" alt="App Mockup" className="relative mx-auto w-64 md:w-80 rounded-[3rem] border-[8px] border-white/10 shadow-2xl" />
           </div>
         </div>
       </section>
 
       {/* ============ IA ============ */}
       <section id="ia" className="py-24 relative overflow-hidden">
         <div className="absolute left-0 bottom-0 w-1/2 h-1/2 bg-accent/5 blur-[120px] rounded-full" />
         <div className="max-w-7xl mx-auto px-6 relative">
           <div className="text-center mb-16">
             <h2 className="font-display text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
               IA como suporte, não substituição <Brain className="h-10 w-10 text-primary animate-pulse" />
             </h2>
             <p className="text-muted-foreground text-lg max-w-2xl mx-auto">A inteligência artificial apoia sua operação sem substituir sua experiência humana e metodologia.</p>
           </div>
           <div className="grid md:grid-cols-2 gap-12 items-center">
             <Card className="p-8 glass-card border-primary/20">
               <h3 className="font-bold text-2xl mb-6">O que a IA faz por você:</h3>
               <div className="space-y-4">
                 {aiCapabilities.map((cap, i) => (
                   <div key={i} className="flex items-start gap-3">
                     <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                     <p className="font-medium">{cap}</p>
                   </div>
                 ))}
               </div>
               <p className="mt-8 text-sm text-center font-bold text-primary">A metodologia continua humana. A eficiência ganha escala.</p>
             </Card>
             <div className="space-y-6">
               <div className="p-6 bg-muted rounded-2xl border border-border relative">
                 <div className="flex items-center gap-2 mb-3 text-primary font-bold">
                   <Brain className="h-4 w-4" /> Insight da IA
                 </div>
                 <p className="italic text-muted-foreground">"Baseado na última sessão, o mentorado João Silva apresenta um padrão de procrastinação na etapa de finanças. Sugestão: Liberar trilha de Mindset Financeiro."</p>
               </div>
               <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10">
                 <p className="font-bold mb-2">Resumo da Reunião</p>
                 <div className="h-2 w-full bg-primary/20 rounded-full mb-2 overflow-hidden">
                   <div className="h-full bg-primary w-[70%]" />
                 </div>
                 <p className="text-xs text-muted-foreground">Transcrição e análise estratégica concluída com sucesso.</p>
               </div>
             </div>
           </div>
         </div>
       </section>
 
       {/* ============ LIBRARY ============ */}
       <section className="py-24 bg-muted/30">
         <div className="max-w-7xl mx-auto px-6">
           <div className="text-center mb-16">
             <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">Comece com diagnósticos prontos</h2>
             <p className="text-muted-foreground text-lg">Adapte os modelos existentes ao seu método ou crie do zero.</p>
           </div>
           <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
             {librarySegments.map((seg, i) => (
               <div key={i} className="p-6 text-center bg-background rounded-xl border border-border shadow-sm">
                 <seg.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                 <h4 className="font-bold">{seg.title}</h4>
               </div>
             ))}
           </div>
           <div className="grid md:grid-cols-2 gap-8 text-sm">
             <div className="space-y-3">
               <div className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4 text-primary" /> Duplicar modelos prontos</div>
               <div className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4 text-primary" /> Editar todas as perguntas</div>
               <div className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4 text-primary" /> Alterar pesos dos resultados</div>
             </div>
             <div className="space-y-3">
               <div className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4 text-primary" /> Mudar linguagem e tom</div>
               <div className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4 text-primary" /> Personalizar relatórios finais</div>
               <div className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4 text-primary" /> Salvar como modelo próprio</div>
             </div>
           </div>
         </div>
       </section>
 
       {/* ============ BENEFITS ============ */}
       <section className="py-24">
         <div className="max-w-7xl mx-auto px-6">
           <div className="text-center mb-16">
             <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">O que muda quando a mentoria deixa de ser improvisada</h2>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {realBenefits.map((b, i) => (
               <Card key={i} className="p-6 glass-card border-primary/5 hover:border-primary/20">
                 <b.icon className="h-10 w-10 text-primary mb-4" />
                 <h3 className="font-bold text-lg mb-2">{b.title}</h3>
                 <p className="text-sm text-muted-foreground">{b.desc}</p>
               </Card>
             ))}
           </div>
         </div>
       </section>
 
       {/* ============ COMPARISON ============ */}
       <section className="py-24 bg-muted/50">
         <div className="max-w-5xl mx-auto px-6">
           <div className="text-center mb-16">
             <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">Antes e depois do MentorFlow</h2>
           </div>
           <div className="grid md:grid-cols-2 gap-0 rounded-3xl overflow-hidden border border-border shadow-2xl">
             <div className="p-8 md:p-12 bg-destructive/5">
               <h3 className="font-bold text-2xl mb-8 flex items-center gap-2 text-destructive"><X className="h-6 w-6" /> Antes</h3>
               <ul className="space-y-4">
                 {["WhatsApp solto", "Planilhas paralelas", "Reuniões sem histórico", "Testes desorganizados", "Pouca visão da jornada", "Cancelamentos inesperados"].map(item => (
                   <li key={item} className="flex items-center gap-3 text-muted-foreground">
                     <div className="h-1.5 w-1.5 rounded-full bg-destructive/30" /> {item}
                   </li>
                 ))}
               </ul>
             </div>
             <div className="p-8 md:p-12 bg-primary/5">
               <h3 className="font-bold text-2xl mb-8 flex items-center gap-2 text-primary"><Check className="h-6 w-6" /> Depois</h3>
               <ul className="space-y-4 font-medium">
                 {["Operação centralizada", "Prontuário vivo", "Reuniões organizadas", "Testes com método", "App ativo", "IA apoiando evolução", "Mais retenção"].map(item => (
                   <li key={item} className="flex items-center gap-3">
                     <CheckCircle2 className="h-5 w-5 text-primary shrink-0" /> {item}
                   </li>
                 ))}
               </ul>
             </div>
           </div>
         </div>
       </section>
 
       {/* ============ CTA FINAL ============ */}
       <section id="demonstracao" className="relative py-24 md:py-32 overflow-hidden bg-primary text-white">
         <div className="absolute inset-0 bg-grid opacity-20" />
         <div className="relative max-w-4xl mx-auto px-6 text-center">
           <h2 className="font-display text-4xl md:text-6xl font-bold mb-6">Se sua mentoria cresceu, sua estrutura também precisa crescer.</h2>
           <p className="text-xl text-white/80 mb-12">O MentorFlow foi criado para mentores que querem sair do improviso e operar com método, contexto e escala.</p>
           <LeadForm />
           <div className="mt-12 flex flex-wrap gap-4 justify-center">
             <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10 h-14 px-8 font-bold">Falar com Especialista</Button>
           </div>
         </div>
       </section>
 
       {/* ============ FAQ ============ */}
       <section className="py-24">
         <div className="max-w-3xl mx-auto px-6">
           <div className="text-center mb-16">
             <h2 className="font-display text-4xl md:text-5xl font-bold">Tudo que você precisa saber</h2>
           </div>
           <Accordion type="single" collapsible className="space-y-4">
             {faqs.map((faq, i) => (
               <AccordionItem key={i} value={`item-${i}`} className="border rounded-xl px-6 bg-muted/20">
                 <AccordionTrigger className="font-bold text-left py-6">{faq.q}</AccordionTrigger>
                 <AccordionContent className="pb-6 text-muted-foreground">{faq.a}</AccordionContent>
               </AccordionItem>
             ))}
           </Accordion>
         </div>
       </section>

      {/* ============ FOOTER ============ */}
      <footer className="py-12 border-t border-border bg-muted/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="font-display font-bold text-xl">MentorFlow</div>
              </div>
              <p className="text-sm text-muted-foreground">A infraestrutura digital definitiva para quem leva mentoria a sério.</p>
            </div>
            <div>
              <div className="font-semibold text-sm mb-3">Produto</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#recursos" className="hover:text-foreground">Recursos</a></li>
                <li><a href="#app" className="hover:text-foreground">App Mentorado</a></li>
                <li><a href="#ia" className="hover:text-foreground">IA</a></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-sm mb-3">Empresa</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Sobre</a></li>
                <li><a href="#" className="hover:text-foreground">Contato</a></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-sm mb-3">Legal</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Termos</a></li>
                <li><a href="#" className="hover:text-foreground">Privacidade</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} MentorFlow by MentorFlow — Mentoria Inteligente
          </div>
        </div>
      </footer>
    </div>
  );
}
