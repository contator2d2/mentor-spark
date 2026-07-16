import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ArrowRight, Sparkles, Users, ClipboardList, Brain, ShieldCheck, Smartphone,
  Calendar, MessageSquare, Zap, CheckCircle2, Check, TrendingUp,
  Target, Layers, FileText, QrCode, Video, BookOpen, MessagesSquare,
  Gamepad2, ListChecks, Workflow, CreditCard, FileSignature, Palette,
  Globe, Bot, LineChart, PlayCircle, DollarSign, Infinity as InfinityIcon,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import amandaPhoto from "@/assets/amanda-cristina.png.asset.json";
import esneyPhoto from "@/assets/esney-menezes.png.asset.json";

const WHATSAPP_URL = "https://wa.me/5517991308048?text=Ol%C3%A1%21%20Quero%20saber%20mais%20sobre%20o%20Mentor%20Glee-go.";

const replaces = [
  "WhatsApp",
  "Planilhas",
  "Calendly",
  "Hotmart",
  "CRM",
  "Kahoot",
  "Trello",
  "Google Forms",
];

type Feature = { icon: any; title: string; desc: string };
type Category = { name: string; features: Feature[] };

const categories: Category[] = [
  {
    name: "Comercial",
    features: [
      { icon: Target, title: "Funil de Leads", desc: "Kanban configurável, conversão em mentorado com 1 clique." },
      { icon: Calendar, title: "Agenda Pública", desc: "Estilo Calendly, sincroniza com Google Calendar." },
      { icon: QrCode, title: "Captação & QR Code", desc: "Landing pages + QR Code para eventos presenciais." },
    ],
  },
  {
    name: "Gestão de Mentorados",
    features: [
      { icon: ClipboardList, title: "Prontuário 360°", desc: "Dores, objetivos, plano de ação e histórico completo." },
      { icon: FileText, title: "Testes & Diagnósticos", desc: "Biblioteca pronta com análise por IA." },
      { icon: Video, title: "Reuniões com IA", desc: "Pauta, transcrição, resumo e follow-ups automáticos." },
    ],
  },
  {
    name: "Conteúdo",
    features: [
      { icon: BookOpen, title: "Academy — Cursos EAD", desc: "Área de membros estilo Netflix. Cursos ilimitados com venda direta, sem intermediários." },
      { icon: MessagesSquare, title: "Comunidade", desc: "Feed interno com posts, reações e gamificação." },
      { icon: Gamepad2, title: "Quizzes ao Vivo", desc: "Estilo Kahoot para aulas e eventos presenciais." },
    ],
  },
  {
    name: "Operação",
    features: [
      { icon: Workflow, title: "Central de Demandas", desc: "Fluxo de aprovação para marketing, jurídico e financeiro." },
      { icon: ListChecks, title: "Kanbans & Tarefas", desc: "Boards customizados vinculados a cada mentorado." },
      { icon: Zap, title: "Automações", desc: "Gatilhos → ações, sem código." },
    ],
  },
  {
    name: "Financeiro",
    features: [
      { icon: CreditCard, title: "Cobranças", desc: "Recorrentes ou avulsas via Stripe, Paddle e Pix." },
      { icon: FileSignature, title: "Contratos Digitais", desc: "Modelos com assinatura eletrônica integrada." },
    ],
  },
  {
    name: "Inteligência Artificial",
    features: [
      { icon: Bot, title: "Assistente IA", desc: "Treinado no contexto da sua mentoria e método." },
      { icon: Brain, title: "Análise por IA", desc: "Insights em testes, reuniões e prontuários." },
    ],
  },
];

const plans = [
  {
    name: "Starter", price: "R$ 89,90", period: "/mês",
    desc: "Para mentores começando a organizar a operação.",
    features: ["Funil de leads", "Agenda pública", "Prontuário básico", "1 curso na Academy", "Suporte por e-mail"],
    highlight: false,
  },
  {
    name: "Pro", price: "R$ 199,90", period: "/mês",
    desc: "Para quem já entrega e quer escalar com método.",
    features: ["Tudo do Starter", "IA nativa em reuniões e testes", "Academy com cursos ilimitados", "Central de Demandas", "Cobranças recorrentes", "Automações e integrações"],
    highlight: true,
  },
  {
    name: "White-label", price: "R$ 399,99", period: "/mês",
    desc: "Marca própria, domínio próprio, sem menção à plataforma.",
    features: ["Tudo do Pro", "Domínio + branding 100% seus", "Multi-mentor / time", "Onboarding dedicado", "SLA e suporte prioritário"],
    highlight: false,
  },
];

const faqs = [
  { q: "Preciso trocar minhas ferramentas atuais?", a: "A Mentor Glee-go substitui de 6 a 8 ferramentas (CRM, agenda, plataforma de cursos, comunidade, cobrança, quizzes, formulários e planilhas) em um único lugar. Você migra no seu ritmo." },
  { q: "A área do mentorado pode ter minha marca?", a: "Sim. No plano White-label, seu mentorado acessa por um domínio seu, com sua logo, cores e nome — sem menção à Mentor Glee-go." },
  { q: "A IA substitui o mentor?", a: "Não. Ela automatiza tarefas repetitivas (resumos, follow-ups, análise de testes) para você focar no que só um mentor humano entrega." },
  { q: "Como funcionam as cobranças?", a: "Integração nativa com Stripe, Paddle e Pix. Cobranças recorrentes, avulsas e contratos com assinatura digital." },
  { q: "Preciso de cartão de crédito para testar?", a: "Não. O teste gratuito não exige cartão." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ============ HEADER ============ */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="font-display text-xl font-bold">Mentor Glee-go</div>
          </div>
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
            <a href="#recursos" className="text-muted-foreground hover:text-foreground transition-colors">Recursos</a>
            <a href="#academy" className="text-muted-foreground hover:text-foreground transition-colors">Academy</a>
            <a href="#whitelabel" className="text-muted-foreground hover:text-foreground transition-colors">White-label</a>
            <a href="#depoimentos" className="text-muted-foreground hover:text-foreground transition-colors">Clientes</a>
            <a href="#planos" className="text-muted-foreground hover:text-foreground transition-colors">Planos</a>
            <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/login"><Button variant="ghost" size="sm">Entrar</Button></Link>
            <a href="#cta"><Button size="sm" className="bg-gradient-primary hover:opacity-90 shadow-glow">Testar Grátis</Button></a>
          </div>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-gradient-hero border-b border-border/40">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute inset-0 bg-gradient-mesh" />
        <div className="blob bg-primary/20 h-[600px] w-[600px] -top-80 -left-80" />
        <div className="blob bg-accent/15 h-[500px] w-[500px] bottom-0 -right-40" />

        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28 grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in">
            <Badge variant="outline" className="mb-6 bg-primary/5 border-primary/20 text-primary">
              Plataforma tudo-em-um para mentoria
            </Badge>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.05] mb-6">
              Uma única plataforma no lugar de <span className="text-gradient">8 ferramentas</span> soltas.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl leading-relaxed">
              CRM de leads, prontuário de mentorados, cursos, cobranças, IA e comunidade — integrados em um sistema white-label com a sua marca.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              <a href="#cta">
                <Button size="lg" className="bg-gradient-primary hover:opacity-90 shadow-glow h-12 px-8 group font-bold">
                  Testar Grátis <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </a>
              <a href="#cta">
                <Button size="lg" variant="outline" className="h-12 px-8 font-semibold">
                  Agendar Demonstração
                </Button>
              </a>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground font-medium">
              {["Sem cartão de crédito", "Setup em minutos", "Suporte em português"].map((t) => (
                <span key={t} className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> {t}</span>
              ))}
            </div>
          </div>

          <div className="relative animate-scale-in anim-delay-200">
            <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full" />
            <Card className="relative overflow-hidden shadow-elegant border-primary/20 p-2 glass-card">
              <img
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1000"
                alt="Dashboard Mentor Glee-go"
                className="rounded-lg shadow-2xl w-full"
                loading="lazy"
              />
            </Card>
          </div>
        </div>
      </section>

      {/* ============ PROBLEMA → SOLUÇÃO ============ */}
      <section className="py-20 bg-muted/30 border-b border-border/40">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <Badge variant="outline" className="mb-4 border-destructive/30 text-destructive bg-destructive/5">O problema</Badge>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Seu WhatsApp, planilha, Calendly, Hotmart e CRM não conversam entre si.
            </h2>
            <p className="text-muted-foreground text-lg mb-6">
              Cada ferramenta guarda um pedaço da história do mentorado. Você perde tempo copiando dados, perde contexto nas reuniões e perde vendas por falta de follow-up.
            </p>
            <div className="flex flex-wrap gap-2">
              {replaces.map((r) => (
                <span key={r} className="text-xs font-medium px-3 py-1 rounded-full border border-border bg-background text-muted-foreground line-through">
                  {r}
                </span>
              ))}
            </div>
          </div>
          <div>
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">A solução</Badge>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              A <span className="text-gradient">Mentor Glee-go</span> centraliza tudo — com IA nativa.
            </h2>
            <p className="text-muted-foreground text-lg mb-6">
              Um único sistema para captar leads, atender mentorados, entregar conteúdo, cobrar e analisar resultados. A IA cuida da parte repetitiva; você foca na mentoria.
            </p>
            <ul className="space-y-3">
              {["Um único login para todo o time", "Contexto completo de cada mentorado", "IA nativa em reuniões, testes e prontuários", "Marca própria (white-label)"].map((i) => (
                <li key={i} className="flex items-start gap-2 font-medium">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" /> {i}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="recursos" className="py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-primary/5 blur-[120px] rounded-full" />
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Tudo em um só lugar</Badge>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Todos os módulos que sua mentoria precisa
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Da entrada do lead à cobrança recorrente — passando por conteúdo, comunidade e IA.
            </p>
          </div>

          <div className="space-y-14">
            {categories.map((cat) => (
              <div key={cat.name}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px flex-1 bg-border" />
                  <h3 className="font-display text-xl md:text-2xl font-bold text-primary">{cat.name}</h3>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {cat.features.map((f) => (
                    <Card key={f.title} className="p-6 glass-card glass-card-hover border-primary/10 group">
                      <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                        <f.icon className="h-5 w-5 text-primary" />
                      </div>
                      <h4 className="font-bold text-lg mb-2">{f.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ WHITE-LABEL ============ */}
      <section id="whitelabel" className="py-24 relative overflow-hidden bg-gradient-to-br from-primary/95 via-primary to-primary/80 text-primary-foreground">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="relative max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge className="mb-6 bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/10">
              <Palette className="h-3 w-3 mr-1" /> White-label
            </Badge>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
              A área do mentorado é 100% sua.
            </h2>
            <p className="text-lg opacity-90 mb-8">
              Domínio próprio, logo, cores e nome do produto. O mentorado nunca vê a marca da plataforma — só a sua. Ideal para escolas, agências e mentores que vendem experiência premium.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: Globe, t: "Domínio próprio" },
                { icon: Palette, t: "Logo e paleta de cores" },
                { icon: Smartphone, t: "PWA instalável com sua marca" },
                { icon: ShieldCheck, t: "Sem menção à Mentor Glee-go" },
              ].map((item) => (
                <div key={item.t} className="flex items-center gap-3 p-3 rounded-lg bg-primary-foreground/10 border border-primary-foreground/15">
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="font-medium">{item.t}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-10 bg-primary-foreground/20 blur-3xl rounded-full" />
            <Card className="relative p-6 bg-background text-foreground shadow-2xl border-primary-foreground/20">
              <div className="flex items-center gap-2 pb-3 border-b border-border mb-4">
                <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-primary/60" />
                <div className="ml-3 text-xs text-muted-foreground font-mono">app.suamarca.com.br</div>
              </div>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center font-bold text-primary-foreground">S</div>
                <div>
                  <div className="font-bold">Sua Marca</div>
                  <div className="text-xs text-muted-foreground">Bem-vindo(a), João</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {["Academy", "Reuniões", "Comunidade"].map((t) => (
                  <div key={t} className="p-3 rounded-lg bg-muted text-center text-xs font-semibold">{t}</div>
                ))}
              </div>
              <div className="p-4 rounded-lg border border-border">
                <div className="text-xs text-muted-foreground mb-1">Próxima reunião</div>
                <div className="font-bold text-sm">Estratégia comercial — Ter, 14h</div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ============ ACADEMY ============ */}
      <section id="academy" className="py-24 relative overflow-hidden border-b border-border/40">
        <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-accent/10 blur-[120px] rounded-full" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-14 max-w-3xl mx-auto">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
              <PlayCircle className="h-3 w-3 mr-1" /> Academy — EAD com sua marca
            </Badge>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Sua <span className="text-gradient">escola online</span> dentro da plataforma.
            </h2>
            <p className="text-muted-foreground text-lg">
              Lance cursos em vídeo, monte módulos e aulas, venda direto para seus alunos e faça upsell — <strong className="text-foreground">sem intermediários e sem taxa de plataforma de cursos</strong>.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-10 items-center mb-16">
            <div className="order-2 lg:order-1 space-y-5">
              {[
                { icon: InfinityIcon, t: "Cursos ilimitados", d: "Crie quantos cursos quiser. Estrutura Curso → Módulos → Aulas com vídeos, materiais e progresso." },
                { icon: DollarSign, t: "Venda direta, 0% intermediário", d: "Cobre em PIX, cartão recorrente ou avulso. O dinheiro cai na sua conta — sem Hotmart, Kiwify ou Eduzz no meio." },
                { icon: TrendingUp, t: "Upsell individual por aula", d: "Libere aulas ou módulos extras como upsell dentro do próprio curso. Aumente ticket sem trocar de ferramenta." },
                { icon: Video, t: "Player estilo Netflix", d: "Experiência de área de membros premium, com sua marca no white-label. Alunos assistem no celular como PWA." },
              ].map((f) => (
                <div key={f.t} className="flex gap-4">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-bold text-lg mb-1">{f.t}</div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.d}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="order-1 lg:order-2 relative">
              <div className="absolute -inset-6 bg-primary/15 blur-3xl rounded-full" />
              <Card className="relative p-4 glass-card border-primary/20 shadow-elegant">
                <div className="rounded-lg overflow-hidden bg-black aspect-video relative mb-3 flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-accent/30 to-background/20" />
                  <div className="relative h-16 w-16 rounded-full bg-background/90 flex items-center justify-center shadow-glow">
                    <PlayCircle className="h-10 w-10 text-primary" />
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 text-primary-foreground">
                    <div className="text-xs opacity-80">Módulo 2 · Aula 4</div>
                    <div className="font-bold text-sm">Estratégia de precificação premium</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {["Fundamentos", "Prática", "Bônus (upsell)"].map((t, i) => (
                    <div key={t} className={`p-3 rounded-lg text-xs font-semibold text-center ${i === 2 ? "bg-primary/15 text-primary border border-primary/20" : "bg-muted"}`}>{t}</div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              { k: "0%", v: "de taxa de plataforma de cursos" },
              { k: "∞", v: "cursos, módulos e aulas" },
              { k: "PIX", v: "e recorrência direto na sua conta" },
            ].map((s) => (
              <Card key={s.v} className="p-6 text-center glass-card border-primary/10">
                <div className="font-display text-3xl font-bold text-gradient mb-1">{s.k}</div>
                <div className="text-sm text-muted-foreground">{s.v}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PROVA SOCIAL ============ */}
      <section id="depoimentos" className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">Quem já opera com a Mentor Glee-go</h2>
            <p className="text-muted-foreground text-lg">Mentores, coaches e escolas de treinamento que já centralizaram sua operação.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {[
              { name: "Dra. Amanda Cristina", role: "Mentoria Jurídica", photo: amandaPhoto.url },
              { name: "Esney Menezes", role: "Mentoria de Negócios", photo: esneyPhoto.url },
            ].map((c) => (
              <Card key={c.name} className="overflow-hidden glass-card border-primary/10 group">
                <div className="aspect-[16/9] overflow-hidden bg-muted">
                  <img
                    src={c.photo}
                    alt={c.name}
                    loading="lazy"
                    className="h-full w-full object-contain object-center transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  <div className="font-display font-bold text-lg">{c.name}</div>
                  <div className="text-sm text-muted-foreground">{c.role}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PLANOS ============ */}
      <section id="planos" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4">Planos</Badge>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">Comece grátis. Escale quando quiser.</h2>
            <p className="text-muted-foreground text-lg">Sem cartão de crédito no teste. Cancele a qualquer momento.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((p) => (
              <Card
                key={p.name}
                className={`p-8 relative flex flex-col ${p.highlight ? "border-primary shadow-glow scale-[1.02] bg-gradient-to-b from-primary/5 to-transparent" : "glass-card"}`}
              >
                {p.highlight && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground shadow-glow">Mais popular</Badge>
                )}
                <div className="font-display text-xl font-bold mb-1">{p.name}</div>
                <p className="text-sm text-muted-foreground mb-6">{p.desc}</p>
                <div className="mb-6">
                  <span className="font-display text-4xl font-bold">{p.price}</span>
                  <span className="text-muted-foreground">{p.period}</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <a href="#cta">
                  <Button
                    className={`w-full ${p.highlight ? "bg-gradient-primary hover:opacity-90 shadow-glow" : ""}`}
                    variant={p.highlight ? "default" : "outline"}
                  >
                    {p.name === "White-label" ? "Falar com vendas" : "Começar agora"}
                  </Button>
                </a>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA FINAL ============ */}
      <section id="cta" className="relative py-24 overflow-hidden bg-gradient-to-br from-background via-muted/30 to-background border-y border-border">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <Badge variant="outline" className="mb-6 bg-primary/5 border-primary/20 text-primary">
            <LineChart className="h-3 w-3 mr-1" /> Comece grátis, sem cartão de crédito
          </Badge>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
            Pronto para operar sua mentoria como uma <span className="text-gradient">empresa de verdade</span>?
          </h2>
          <p className="text-lg text-muted-foreground mb-10">
            Deixe seus dados e um especialista mostra como a Mentor Glee-go se encaixa na sua operação.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="h-14 px-8 text-base font-bold bg-[#25D366] hover:bg-[#20ba57] text-white shadow-glow group">
                <MessageSquare className="mr-2 h-5 w-5" />
                Falar no WhatsApp
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
            <a href="tel:+5517991308048" className="text-sm text-muted-foreground hover:text-foreground font-medium">
              ou ligue: (17) 99130-8048
            </a>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="py-24">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="font-display text-4xl md:text-5xl font-bold">Perguntas frequentes</h2>
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
                <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="font-display font-bold text-xl">Mentor Glee-go</div>
              </div>
              <p className="text-sm text-muted-foreground">
                Plataforma tudo-em-um de gestão de mentoria. Uma marca. Um sistema. Zero ferramenta solta.
              </p>
            </div>
            <div>
              <div className="font-semibold text-sm mb-3">Produto</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#recursos" className="hover:text-foreground">Recursos</a></li>
                <li><a href="#academy" className="hover:text-foreground">Academy</a></li>
                <li><a href="#whitelabel" className="hover:text-foreground">White-label</a></li>
                <li><a href="#planos" className="hover:text-foreground">Planos</a></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-sm mb-3">Empresa</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#depoimentos" className="hover:text-foreground">Clientes</a></li>
                <li><a href="#cta" className="hover:text-foreground">Contato</a></li>
                <li><a href="#faq" className="hover:text-foreground">FAQ</a></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-sm mb-3">Legal</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/terms" className="hover:text-foreground">Termos</Link></li>
                <li><Link to="/privacy" className="hover:text-foreground">Privacidade</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Mentor Glee-go — Plataforma de gestão de mentoria.
          </div>
        </div>
      </footer>
    </div>
  );
}
