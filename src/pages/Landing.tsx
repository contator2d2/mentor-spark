import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
   ArrowRight, Sparkles, Users, ClipboardList, Brain, BarChart3, ShieldCheck, Smartphone, Search, Database, TrendingDown,
   Calendar, DollarSign, GraduationCap, MessageSquare, Zap, CheckCircle2, Monitor, X, Check, Activity,
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
  { name: "Roberto Lima", role: "Consultor estratégico", quote: "Saí de planilhas pro Mentor Glee-go. Cresci 2x em 4 meses. Indispensável." , initial: "R" },
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
  { q: "O Mentor Glee-go serve para qualquer nicho?", a: "Sim. A estrutura é genérica e o conteúdo é 100% personalizável para atender diferentes metodologias." },
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
            <div className="font-display text-xl font-bold">Mentor Glee-go <span className="text-xs font-normal text-muted-foreground ml-1">by Gleego</span></div>
          </div>
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
            <a href="#recursos" className="text-muted-foreground hover:text-foreground transition-colors">Recursos</a>
            <a href="#app" className="text-muted-foreground hover:text-foreground transition-colors">App Mentorado</a>
            <a href="#ia" className="text-muted-foreground hover:text-foreground transition-colors">IA</a>
            <a href="#biblioteca" className="text-muted-foreground hover:text-foreground transition-colors">Biblioteca</a>
            <a href="#demonstracao" className="text-muted-foreground hover:text-foreground transition-colors">Demonstração</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/login"><Button variant="ghost" size="sm">Entrar</Button></Link>
            <Link to="/signup"><Button size="sm" className="bg-gradient-primary hover:opacity-90 shadow-glow">Agendar Demonstração</Button></Link>
          </div>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute inset-0 bg-gradient-mesh" />

        <div className="blob bg-primary/30 h-[500px] w-[500px] -top-40 -left-40" />
        <div className="blob bg-secondary/20 h-[400px] w-[400px] top-20 -right-20" style={{ animationDelay: "5s" }} />
        <div className="blob bg-accent/20 h-[350px] w-[350px] bottom-0 left-1/3" style={{ animationDelay: "10s" }} />

        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-32 grid md:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm mb-6 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium">Infraestrutura digital para mentores</span>
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05] text-balance mb-6">
              Transforme sua mentoria em uma operação <span className="text-gradient">organizada, escalável e inteligente</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl leading-relaxed">
              Com o Mentor Glee-go, você reúne mentorados, diagnósticos, reuniões, prontuário estratégico, app próprio e IA de suporte em uma única plataforma.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              <Link to="/signup">
                <Button size="lg" className="bg-gradient-primary hover:opacity-90 shadow-glow text-base h-12 px-6 group">
                  Quero Ver uma Demonstração <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-base h-12 px-6 group">
                Falar com Especialista
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-primary" /> App para mentorados</span>
              <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-primary" /> Testes e diagnósticos</span>
              <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-primary" /> IA Aplicada</span>
            </div>
          </div>

          {/* Hero visual: dashboard mock */}
          <div className="relative animate-scale-in anim-delay-200">
            <div className="absolute -inset-4 bg-gradient-primary opacity-30 blur-3xl rounded-full" />
            <Card className="relative p-6 shadow-elegant glass-card overflow-hidden">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="text-xs text-muted-foreground">Dashboard ao vivo</div>
                  <div className="font-display font-bold text-lg">Hoje, 14:32</div>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400">● ao vivo</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {stats.map((s, i) => (
                  <div key={s.l} className="p-3 rounded-xl bg-muted/40 border border-border/50 animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="text-xs text-muted-foreground">{s.l}</div>
                    <div className="text-2xl font-bold text-gradient">{s.v}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {[
                  { icon: Users, t: "Maria Silva entrou no funil", c: "violet" },
                  { icon: Calendar, t: "Reunião agendada com João", c: "blue" },
                  { icon: DollarSign, t: "Pagamento Pix recebido R$ 297", c: "emerald" },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-background/40 border border-border/30 animate-fade-in" style={{ animationDelay: `${300 + i * 150}ms` }}>
                      <div className={`h-8 w-8 rounded-lg bg-${item.c}-500/10 flex items-center justify-center`}>
                        <Icon className={`h-4 w-4 text-${item.c}-500`} />
                      </div>
                      <div className="flex-1 text-sm">{item.t}</div>
                      <span className="text-[10px] text-muted-foreground">agora</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>

        <div className="relative border-t border-border/40 bg-background/40 backdrop-blur">
          <div className="max-w-7xl mx-auto px-6 py-6 text-center">
             <p className="text-sm font-medium text-muted-foreground">Mentor Glee-go by Gleego</p>
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="recursos" className="relative py-24 md:py-32">
        <div className="absolute inset-0 bg-gradient-mesh opacity-40" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <Badge variant="outline" className="mb-4">O que fazemos</Badge>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4 text-balance">
              O Mentor Glee-go centraliza toda a sua <span className="text-gradient">operação</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Da entrada do lead até a evolução do mentorado, tudo conectado em um único sistema profissional.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <Card key={f.title} className="group relative p-6 glass-card glass-card-hover overflow-hidden animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className={`absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br ${f.color} opacity-10 group-hover:opacity-20 transition-opacity blur-2xl`} />
                  <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-display font-bold text-lg mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="como-funciona" className="py-24 md:py-32 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <Badge variant="outline" className="mb-4">Fluxo de evolução</Badge>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4 text-balance">
              Da entrada do prospect à <span className="text-gradient">evolução</span> do mentorado
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0" />
            {[
              { n: "01", icon: Workflow, t: "Captação & Diagnóstico", d: "Lead entra por evento ou campanha, realiza testes automáticos e o mentor recebe o score na hora." },
              { n: "02", icon: Target, t: "Reunião Inteligente", d: "Encontro acontece com histórico 360º. IA sugere próximos passos e resume a sessão." },
              { n: "03", icon: TrendingUp, t: "Execução & Escala", d: "Mentorado executa tarefas no app, consome trilhas e você acompanha o progresso de todos." },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.n} className="relative text-center animate-slide-up" style={{ animationDelay: `${i * 150}ms` }}>
                  <div className="relative inline-flex">
                    <div className="h-24 w-24 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-elegant mb-5 mx-auto">
                      <Icon className="h-10 w-10 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-background border-2 border-primary text-primary font-bold text-sm flex items-center justify-center">
                      {s.n}
                    </div>
                  </div>
                  <h3 className="font-display font-bold text-xl mb-2">{s.t}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">{s.d}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="py-24 md:py-32">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">Dúvidas frequentes</Badge>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-balance">
              Tudo que você precisa saber
            </h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((f, i) => (
              <AccordionItem key={f.q} value={`item-${i}`} className="border-none">
                <Card className="glass-card overflow-hidden">
                  <AccordionTrigger className="px-5 py-4 hover:no-underline font-semibold">{f.q}</AccordionTrigger>
                  <AccordionContent className="px-5 text-sm text-muted-foreground pt-0">{f.a}</AccordionContent>
                </Card>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ============ CTA FINAL ============ */}
      <section id="demonstracao" className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-primary" />
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="blob bg-white/10 h-[500px] w-[500px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="relative max-w-3xl mx-auto px-6 text-center text-white">
          <Zap className="h-12 w-12 mx-auto mb-6 animate-float" />
          <h2 className="font-display text-4xl md:text-6xl font-bold mb-5 text-balance">
            Pronto pra escalar sua mentoria?
          </h2>
          <p className="text-white/90 text-lg mb-8 max-w-xl mx-auto">
            Saia do improviso. Opere com método, contexto e inteligência em uma única plataforma.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/signup">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 text-base h-12 px-8 shadow-elegant group font-semibold">
                Agendar Demonstração <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 text-base h-12 px-8">
              Falar com Especialista
            </Button>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="py-12 border-t border-border bg-muted/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="font-display font-bold text-xl">Mentor Glee-go</div>
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
            © {new Date().getFullYear()} Mentor Glee-go by Gleego — Mentoria Inteligente
          </div>
        </div>
      </footer>
    </div>
  );
}
