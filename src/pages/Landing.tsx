import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Users, ClipboardList, Brain, BarChart3, ShieldCheck } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="font-display text-2xl font-bold text-primary">MentorFlow</div>
          <nav className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link to="/signup">
              <Button>Cadastrar mentor</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-hero text-primary-foreground">
        <div className="max-w-7xl mx-auto px-6 py-24 md:py-32 grid md:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sm mb-6">
              <Sparkles className="h-4 w-4 text-accent" />
              SaaS de mentoria com IA
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight text-balance mb-6">
              O ambiente onde o prospect entra antes da mentoria — e fica para sempre.
            </h1>
            <p className="text-lg text-white/80 mb-8 max-w-xl">
              Capte leads, aplique testes, conduza reuniões com IA e acompanhe a evolução de cada mentorado em uma plataforma única e branded.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/signup">
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Começar agora <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  Já sou mentor
                </Button>
              </Link>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="relative">
              <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full" />
              <div className="relative bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 shadow-elegant">
                <div className="space-y-4">
                  {[
                    { l: "Lead capturado", v: "+128 esta semana" },
                    { l: "Testes aplicados", v: "82" },
                    { l: "Conversão prospect → mentorado", v: "23.4%" },
                    { l: "Insights de IA gerados", v: "412" },
                  ].map((s) => (
                    <div key={s.l} className="flex items-center justify-between border-b border-white/10 pb-3 last:border-0">
                      <span className="text-white/70 text-sm">{s.l}</span>
                      <span className="text-white font-semibold">{s.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Tudo o que sua mentoria precisa</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Da primeira interação no evento até a entrega de resultados consistentes.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Users, title: "Captação inteligente", body: "Página + QR Code para eventos. Lead vira conta automaticamente." },
              { icon: ClipboardList, title: "Testes & diagnósticos", body: "Builder próprio. Score automático. Análise por IA." },
              { icon: Brain, title: "IA personalizada", body: "Sua metodologia, seu prompt. A IA pensa como você." },
              { icon: BarChart3, title: "Funil completo", body: "Pipeline visual. Frio / morno / quente. Conversão medida." },
              { icon: Sparkles, title: "Reuniões com insights", body: "Transcrição + resumo + próximas ações automáticas." },
              { icon: ShieldCheck, title: "Multi-tenant seguro", body: "Cada mentor com seu ambiente isolado. Branding próprio." },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-card border border-border rounded-xl p-6 shadow-soft hover:shadow-elegant transition-shadow">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Pronto para escalar sua mentoria?</h2>
          <p className="text-white/80 mb-8">Cadastre-se. Após aprovação, você terá seu próprio espaço.</p>
          <Link to="/signup">
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              Solicitar acesso <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="py-8 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} MentorFlow — Mentoria Inteligente
        </div>
      </footer>
    </div>
  );
}
