import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ArrowRight, Sparkles, Users, ClipboardList, Brain, BarChart3, ShieldCheck,
  Calendar, DollarSign, GraduationCap, MessageSquare, Zap, CheckCircle2,
   Star, TrendingUp, Quote, Play, ChevronRight, Workflow, Target, CheckCircle,
 import {
   Accordion,
   AccordionContent,
   AccordionItem,
   AccordionTrigger,
 } from "@/components/ui/accordion";
 
} from "lucide-react";

const features = [
  { icon: Users, title: "Captação inteligente", body: "Página + QR Code para eventos. Lead vira conta automaticamente. Funil visual de frio → quente.", color: "from-violet-500 to-purple-500" },
  { icon: ClipboardList, title: "Testes & diagnósticos", body: "Builder próprio. Score automático. Análise por IA com sua metodologia.", color: "from-blue-500 to-cyan-500" },
  { icon: Brain, title: "IA personalizada", body: "Sua metodologia, seu prompt. A IA pensa como você e gera insights únicos.", color: "from-fuchsia-500 to-pink-500" },
  { icon: Calendar, title: "Agenda pública", body: "Estilo Calendly. Link compartilhável. Google Meet automático. Lembretes WhatsApp.", color: "from-emerald-500 to-teal-500" },
  { icon: DollarSign, title: "Cobrança recorrente", body: "Pix, boleto, cartão via Asaas. Régua de cobrança automática no WhatsApp.", color: "from-amber-500 to-orange-500" },
   { icon: GraduationCap, title: "Trilhas estilo Netflix", body: "Crie jornadas com vídeo, PDF e áudio. Bloqueio por pré-requisito e drip de conteúdo.", color: "from-rose-500 to-red-500" },
   { icon: MessageSquare, title: "Prontuário Inteligente", body: "Visão 360º do mentorado: dores, objetivos, histórico e evolução em um só lugar.", color: "from-indigo-500 to-violet-500" },
   { icon: BarChart3, title: "Dashboard de Evolução", body: "Score de execução, clareza estratégica e risco de churn detectado por IA.", color: "from-sky-500 to-blue-500" },
   { icon: Users, title: "Grupos de Acesso", body: "Crie grupos para eventos específicos ou turmas. Controle acessos manuais ou por tags.", color: "from-orange-500 to-amber-500" },
  { icon: ShieldCheck, title: "Multi-tenant seguro", body: "Cada mentor com ambiente isolado. Branding próprio. Dados protegidos.", color: "from-slate-500 to-zinc-500" },
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
  { q: "Preciso instalar algo?", a: "Não. Tudo roda no navegador, em qualquer dispositivo. Seu mentorado também acessa pelo celular." },
  { q: "Posso usar minha marca?", a: "Sim. Logo, cores e domínio próprios em todos os planos pagos." },
   { q: "Como funciona a IA?", a: "Você treina a IA na sua própria metodologia. Ela gera diagnósticos, planos de ação e resumos usando o seu tom de voz e princípios." },
  { q: "E meus dados?", a: "Cada mentor tem ambiente isolado (multi-tenant) com criptografia em trânsito e em repouso." },
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
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Recursos</a>
            <a href="#como-funciona" className="text-muted-foreground hover:text-foreground transition-colors">Como funciona</a>
            <a href="#planos" className="text-muted-foreground hover:text-foreground transition-colors">Planos</a>
            <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/login"><Button variant="ghost" size="sm">Entrar</Button></Link>
            <Link to="/signup"><Button size="sm" className="bg-gradient-primary hover:opacity-90 shadow-glow">Começar grátis</Button></Link>
          </div>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute inset-0 bg-gradient-mesh" />

        {/* Floating blobs */}
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
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                 <p className="text-sm font-medium">App mentorado • Diagnósticos • Prontuário • IA Suporte • Plataforma Personalizável</p>
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

        {/* Logos / social proof bar */}
        <div className="relative border-t border-border/40 bg-background/40 backdrop-blur">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-4">Mentores que confiam</div>
            <div className="flex items-center justify-center gap-8 md:gap-12 flex-wrap opacity-60">
                 <p>Mentor Glee-go by Gleego</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="features" className="relative py-24 md:py-32">
        <div className="absolute inset-0 bg-gradient-mesh opacity-40" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <Badge variant="outline" className="mb-4">Plataforma completa</Badge>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4 text-balance">
              Tudo o que sua mentoria precisa, <span className="text-gradient">finalmente integrado</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Da primeira interação no evento até a entrega de resultados consistentes — sem precisar de 10 ferramentas diferentes.
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
            <Badge variant="outline" className="mb-4">Como funciona</Badge>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4 text-balance">
              Em <span className="text-gradient">3 passos</span>, sua mentoria está rodando
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* connector */}
            <div className="hidden md:block absolute top-12 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0" />
            {[
              { n: "01", icon: Workflow, t: "Configure sua marca", d: "Logo, cores, domínio. Em 5 minutos seu ambiente está pronto e parecendo 100% seu." },
              { n: "02", icon: Target, t: "Capte e diagnostique", d: "Compartilhe link/QR. Lead preenche, faz teste, vira conta. IA analisa e gera insights." },
              { n: "03", icon: TrendingUp, t: "Entregue e cobre", d: "Reuniões com transcrição IA, trilhas de conteúdo, cobranças automáticas via Pix/cartão." },
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

      {/* ============ TESTIMONIALS ============ */}
      <section className="py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <Badge variant="outline" className="mb-4">Quem usa, recomenda</Badge>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4 text-balance">
              Mentores que <span className="text-gradient">escalaram</span> com a gente
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <Card key={t.name} className="p-6 glass-card glass-card-hover relative animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/20" />
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-sm leading-relaxed mb-5 text-foreground/90">"{t.quote}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                  <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold">{t.initial}</div>
                  <div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PLANS ============ */}
      <section id="planos" className="py-24 md:py-32 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <Badge variant="outline" className="mb-4">Planos transparentes</Badge>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4 text-balance">
              Escolha o plano que <span className="text-gradient">cresce com você</span>
            </h2>
            <p className="text-muted-foreground text-lg">14 dias grátis em qualquer plano. Sem cartão.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {plans.map((p, i) => (
              <Card key={p.name}
                className={`relative p-7 flex flex-col animate-slide-up ${p.highlight ? "border-primary border-2 shadow-elegant scale-[1.02] md:scale-105" : "glass-card"}`}
                style={{ animationDelay: `${i * 100}ms` }}>
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-primary text-white text-xs font-bold shadow-glow">
                    MAIS ESCOLHIDO
                  </div>
                )}
                <div className="mb-4">
                  <div className="font-display font-bold text-xl">{p.name}</div>
                  <div className="text-sm text-muted-foreground">{p.desc}</div>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-display font-bold">{p.price}</span>
                  <span className="text-muted-foreground text-sm">{p.period}</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/signup">
                  <Button className={`w-full ${p.highlight ? "bg-gradient-primary hover:opacity-90 shadow-glow" : ""}`} variant={p.highlight ? "default" : "outline"}>
                    Começar agora <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </Card>
            ))}
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
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <Card key={f.q} className="p-5 glass-card glass-card-hover animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer font-semibold list-none">
                    {f.q}
                    <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                </details>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA FINAL ============ */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-primary" />
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="blob bg-white/10 h-[500px] w-[500px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="relative max-w-3xl mx-auto px-6 text-center text-white">
          <Zap className="h-12 w-12 mx-auto mb-6 animate-float" />
          <h2 className="font-display text-4xl md:text-6xl font-bold mb-5 text-balance">
            Pronto pra escalar sua mentoria?
          </h2>
          <p className="text-white/90 text-lg mb-8 max-w-xl mx-auto">
            Cadastre-se em 1 minuto. 14 dias grátis. Cancele quando quiser. Sem cartão de crédito.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/signup">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 text-base h-12 px-8 shadow-elegant group font-semibold">
                Começar grátis agora <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 text-base h-12 px-8">
                Já sou mentor
              </Button>
            </Link>
          </div>
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-white/80 flex-wrap">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> 14 dias grátis</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Sem cartão</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Cancele quando quiser</span>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="py-12 border-t border-border bg-muted/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="font-display font-bold">MentorFlow</div>
              </div>
              <p className="text-sm text-muted-foreground">A plataforma definitiva pra quem leva mentoria a sério.</p>
            </div>
            <div>
              <div className="font-semibold text-sm mb-3">Produto</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground">Recursos</a></li>
                <li><a href="#planos" className="hover:text-foreground">Planos</a></li>
                <li><a href="#faq" className="hover:text-foreground">FAQ</a></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-sm mb-3">Empresa</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Sobre</a></li>
                <li><a href="#" className="hover:text-foreground">Blog</a></li>
                <li><a href="#" className="hover:text-foreground">Contato</a></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-sm mb-3">Legal</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Termos</a></li>
                <li><a href="#" className="hover:text-foreground">Privacidade</a></li>
                <li><a href="#" className="hover:text-foreground">LGPD</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} MentorFlow — Mentoria Inteligente
          </div>
        </div>
      </footer>
    </div>
  );
}
