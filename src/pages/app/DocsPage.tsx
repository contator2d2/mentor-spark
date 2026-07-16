import { useState, useMemo } from "react";
import {
  BookOpen, Search, LayoutDashboard, Kanban, KanbanSquare, Briefcase, Users,
  ClipboardList, Zap, Calendar, CalendarDays, CheckSquare, DollarSign,
  GraduationCap, MessageSquare, Sparkles, QrCode, FileText, Plug, Settings,
  BookOpen as BookIcon, CalendarClock, ShieldCheck, Layers,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type Section = {
  id: string;
  title: string;
  icon: any;
  category: string;
  summary: string;
  content: { heading: string; body: string; items?: string[] }[];
};

const SECTIONS: Section[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    category: "Visão Geral",
    summary: "Visão consolidada da mentoria: leads, mentorados, tarefas, receita e próximos compromissos.",
    content: [
      { heading: "Para que serve", body: "Ponto de partida do sistema. Reúne os principais indicadores da sua operação em um só lugar, para você entender rapidamente o que precisa de atenção no dia." },
      { heading: "Principais métricas", body: "", items: [
        "Total de leads e mentorados ativos",
        "Reuniões e tarefas do dia",
        "Receita e cobranças pendentes",
        "Atalhos rápidos para as áreas mais usadas",
      ]},
    ],
  },
  {
    id: "agenda",
    title: "Agenda",
    icon: CalendarClock,
    category: "Rotina",
    summary: "Calendário unificado com reuniões, tarefas, eventos e compromissos integrados ao Google Calendar.",
    content: [
      { heading: "Como funciona", body: "Todos os compromissos do sistema aparecem em um único calendário: reuniões com mentorados, tarefas com prazo, eventos, cobranças e agendamentos públicos." },
      { heading: "Recursos", body: "", items: [
        "Sincronização bidirecional com Google Calendar (após conectar em Integrações)",
        "Filtro por tipo (reunião, tarefa, evento)",
        "Visualização diária, semanal e mensal",
      ]},
    ],
  },
  {
    id: "leads",
    title: "Leads & Funil",
    icon: Kanban,
    category: "Comercial",
    summary: "Kanban de vendas com etapas configuráveis, formulários de captura e conversão em mentorado.",
    content: [
      { heading: "Fluxo do lead", body: "Um lead entra pelo formulário público (Captação/QR), pela criação manual ou por importação. Você arrasta ele pelas colunas do funil até fechar. Ao fechar, converte em mentorado com um clique." },
      { heading: "Recursos", body: "", items: [
        "Prontuário completo por lead (dores, objetivos, materiais, notas, tarefas)",
        "Timeline de interações automática",
        "Análise de IA com insights e sugestões",
        "Envio de contratos e cobranças direto do card",
        "Alertas de leads parados há muito tempo",
      ]},
    ],
  },
  {
    id: "boards",
    title: "Meus Kanbans",
    icon: KanbanSquare,
    category: "Operação",
    summary: "Kanbans customizados para gerenciar qualquer processo além do funil de vendas.",
    content: [
      { heading: "Uso", body: "Crie quadros para projetos internos, onboarding de clientes, produção de conteúdo, etc. Cada quadro tem colunas e cards independentes com responsáveis, prazos e checklists." },
    ],
  },
  {
    id: "demands",
    title: "Central de Demandas",
    icon: Briefcase,
    category: "Operação",
    summary: "Ponto único de solicitações internas (marketing, jurídico, financeiro) com fluxo de aprovação.",
    content: [
      { heading: "Como funciona", body: "Mentorado ou equipe abre uma solicitação, escolhe a categoria e responsável. A demanda passa por status (Nova → Em Análise → Produção → Revisão → Concluída) em um kanban visual." },
      { heading: "Recursos", body: "", items: [
        "Atribuição para membros da equipe ou agências",
        "Versionamento de entregas com histórico",
        "Aprovação pública via link (mentorado revisa sem login)",
        "Comentários e anexos por demanda",
      ]},
    ],
  },
  {
    id: "mentorados",
    title: "Mentorados",
    icon: Users,
    category: "Gestão",
    summary: "Base completa de mentorados ativos com prontuário 360°, acessos e histórico de evolução.",
    content: [
      { heading: "Prontuário", body: "Cada mentorado tem uma ficha completa com dores, objetivos, indicadores, plano de ação, reuniões, tarefas, materiais, testes aplicados, timeline e notas privadas." },
      { heading: "IA", body: "A aba de IA gera resumo executivo, insights de comportamento e recomendações a partir de tudo que existe no prontuário." },
    ],
  },
  {
    id: "tests",
    title: "Testes",
    icon: ClipboardList,
    category: "Metodologia",
    summary: "Criador de testes/diagnósticos com biblioteca pronta e análise por IA.",
    content: [
      { heading: "Biblioteca", body: "Mais de dezenas de testes prontos por segmento (Empresarial, RH, Financeiro, Comercial, Liderança, Marketing…). Clone qualquer um e personalize as perguntas, pesos e prompt de análise." },
      { heading: "Aplicação", body: "Envie para o mentorado por link. Ao responder, a IA gera relatório, interpretação e recomendações automaticamente." },
    ],
  },
  {
    id: "quiz",
    title: "Quizzes PVP",
    icon: Zap,
    category: "Engajamento",
    summary: "Quiz ao vivo estilo Kahoot para dinâmicas de grupo, aulas e eventos.",
    content: [
      { heading: "Funcionamento", body: "Você cria as perguntas, gera um PIN, projeta a tela do host e os participantes entram pelo celular. Ranking em tempo real com pontuação por velocidade e acerto." },
    ],
  },
  {
    id: "meetings",
    title: "Reuniões",
    icon: Calendar,
    category: "Metodologia",
    summary: "Agendamento, preparação assistida por IA e gravação/transcrição de reuniões.",
    content: [
      { heading: "Ciclo completo", body: "Antes: IA sugere pauta baseada no prontuário do mentorado. Durante: captura de áudio pelo navegador com transcrição. Depois: resumo executivo, decisões, tarefas e follow-ups gerados automaticamente." },
    ],
  },
  {
    id: "scheduling",
    title: "Agenda Pública",
    icon: CalendarDays,
    category: "Comercial",
    summary: "Página pública tipo Calendly para leads e mentorados agendarem horários.",
    content: [
      { heading: "Como usar", body: "Configure sua disponibilidade semanal, duração dos slots e tipos de reunião. Compartilhe o link (/agendar/seu-slug). Reservas caem na sua agenda e sincronizam com o Google Calendar." },
    ],
  },
  {
    id: "tasks",
    title: "Tarefas",
    icon: CheckSquare,
    category: "Operação",
    summary: "Kanban pessoal de tarefas com prazos, prioridade e vínculo a mentorados.",
    content: [
      { heading: "Uso", body: "Toda tarefa pode ser vinculada a um lead, mentorado ou reunião. Aparece também na Agenda unificada e no prontuário do mentorado." },
    ],
  },
  {
    id: "billing",
    title: "Cobranças",
    icon: DollarSign,
    category: "Financeiro",
    summary: "Cobranças recorrentes e avulsas via Stripe, Paddle ou Pix, com contratos vinculados.",
    content: [
      { heading: "Configuração", body: "Conecte um provedor de pagamento em Integrações. Depois crie cobranças únicas ou assinaturas ligadas ao mentorado. Ele recebe o link de pagamento por email/WhatsApp." },
      { heading: "Contratos", body: "Você pode anexar um contrato template. Ele é enviado para assinatura antes da cobrança ser efetivada." },
    ],
  },
  {
    id: "trails",
    title: "Academy (Cursos EAD)",
    icon: GraduationCap,
    category: "Conteúdo",
    summary: "Área de membros EAD com cursos, módulos e aulas — layout estilo Netflix personalizável. Cursos ilimitados com venda direta.",
    content: [
      { heading: "Estrutura", body: "Curso → Módulos → Aulas. Aulas suportam vídeo, texto, PDF, quiz e materiais anexos. Progresso do aluno é rastreado." },
      { heading: "Controle de acesso", body: "Libere cursos por Grupo de Acesso, por aluno individual, ou torne público. Cursos bloqueados mostram cadeado com CTA de upgrade/solicitação." },
      { heading: "Venda direta", body: "Cobre pelos cursos sem intermediários. Upsell individual direto na sua plataforma via cobrança PIX." },
      { heading: "Layouts", body: "Escolha em Branding entre Netflix (linhas), Grade, Neon Glow ou Cinema. Efeitos neon no modo escuro e animações de entrada ao rolar." },
    ],
  },
  {
    id: "access-groups",
    title: "Grupos de Acesso",
    icon: Layers,
    category: "Conteúdo",
    summary: "Grupos para liberar conjuntos de cursos/conteúdos para grupos de alunos.",
    content: [
      { heading: "Uso", body: "Ex.: grupo 'Turma Junho' com acesso aos cursos A, B e C. Adicione alunos ao grupo e todos ganham acesso automaticamente. Facilita a gestão de turmas." },
    ],
  },
  {
    id: "community",
    title: "Comunidade",
    icon: Users,
    category: "Engajamento",
    summary: "Feed interno de posts, comentários e reações entre mentor e mentorados.",
    content: [
      { heading: "Recursos", body: "", items: [
        "Posts com texto, imagem e vídeo",
        "Reações e comentários",
        "Fixação de posts importantes",
        "Gamificação (pontos por participação)",
      ]},
    ],
  },
  {
    id: "analytics",
    title: "Analytics",
    icon: Sparkles,
    category: "Visão Geral",
    summary: "Relatórios avançados de captação, conversão, retenção e engajamento.",
    content: [
      { heading: "Métricas", body: "Funil de conversão, tempo médio por etapa, LTV, churn, engajamento na comunidade e nas trilhas, ranking de mentorados mais ativos." },
    ],
  },
  {
    id: "messages",
    title: "Mensagens & Broadcasts",
    icon: MessageSquare,
    category: "Comunicação",
    summary: "Templates de mensagens e envios em massa por WhatsApp e email.",
    content: [
      { heading: "Templates", body: "Crie mensagens reutilizáveis com variáveis ({{nome}}, {{link}}). Usadas em automações e envios manuais." },
      { heading: "Broadcasts", body: "Envie para segmentos de leads/mentorados. Rastreia entregas e cliques." },
    ],
  },
  {
    id: "whatsapp",
    title: "Grupos WhatsApp",
    icon: Users,
    category: "Comunicação",
    summary: "Gestão de grupos e links de convite do WhatsApp integrados à jornada.",
    content: [
      { heading: "Uso", body: "Cadastre grupos, gere links rastreáveis e associe a etapas do funil. Métricas de cliques por grupo." },
    ],
  },
  {
    id: "automations",
    title: "Automações",
    icon: Zap,
    category: "Automação",
    summary: "Regras baseadas em gatilhos (ex.: novo lead → enviar template + criar tarefa).",
    content: [
      { heading: "Como funciona", body: "Escolha um gatilho (lead criado, mudou de etapa, teste respondido, cobrança paga, etc.) e uma ou mais ações (enviar mensagem, criar tarefa, adicionar a grupo de acesso, etc.)." },
    ],
  },
  {
    id: "team",
    title: "Equipe",
    icon: Users,
    category: "Gestão",
    summary: "Convide membros para sua conta com papéis (admin, editor, atendente, agência).",
    content: [
      { heading: "Papéis", body: "", items: [
        "Admin: acesso total",
        "Editor: gerencia conteúdos, trilhas e prontuários",
        "Atendente: foca em leads e mentorados",
        "Agência: recebe demandas de marketing",
      ]},
    ],
  },
  {
    id: "contents",
    title: "Conteúdos",
    icon: BookIcon,
    category: "Conteúdo",
    summary: "Biblioteca de conteúdos avulsos (vídeos, PDFs, links) liberados para mentorados.",
    content: [
      { heading: "Uso", body: "Diferente das trilhas, aqui você posta conteúdos independentes que aparecem no feed do mentorado. Bom para materiais complementares e novidades." },
    ],
  },
  {
    id: "ai",
    title: "Assistente IA & Prompts",
    icon: Sparkles,
    category: "IA",
    summary: "Chat com IA treinada no contexto da sua mentoria, com biblioteca de prompts.",
    content: [
      { heading: "Assistente", body: "Chat que conhece seus mentorados, testes e conteúdos. Use para preparar reuniões, escrever mensagens, analisar cases." },
      { heading: "Prompts", body: "Salve prompts prontos para reutilizar (ex.: 'Analisar teste DISC', 'Gerar plano de ação')." },
    ],
  },
  {
    id: "capture",
    title: "Captação / QR",
    icon: QrCode,
    category: "Comercial",
    summary: "Landing pages de captura de leads com QR Code para eventos presenciais.",
    content: [
      { heading: "Uso", body: "Configure a página (/c/seu-slug), personalize campos e mensagens. Gere QR Code para imprimir em materiais. Leads caem direto no funil." },
    ],
  },
  {
    id: "events",
    title: "Eventos",
    icon: CalendarDays,
    category: "Comercial",
    summary: "Criação de eventos com venda de ingressos, check-in por QR e NPS pós-evento.",
    content: [
      { heading: "Ciclo", body: "Crie o evento, defina tiers de ingresso, publique a página pública. Participantes compram, recebem ticket com QR. No dia, você escaneia com a câmera para check-in. Depois envia pesquisa NPS." },
    ],
  },
  {
    id: "contracts",
    title: "Contratos",
    icon: FileText,
    category: "Financeiro",
    summary: "Templates de contratos com variáveis para envio e assinatura.",
    content: [
      { heading: "Uso", body: "Crie templates com variáveis ({{mentorado}}, {{valor}}, {{data}}). Anexe a cobranças ou envie avulso. O mentorado assina digitalmente pelo link." },
    ],
  },
  {
    id: "integrations",
    title: "Integrações",
    icon: Plug,
    category: "Configuração",
    summary: "Conexões com Google Calendar, WhatsApp, Stripe, Paddle e outras ferramentas.",
    content: [
      { heading: "Disponíveis", body: "", items: [
        "Google Calendar (sincronização de agenda)",
        "WhatsApp (envio de mensagens)",
        "Stripe / Paddle (pagamentos)",
        "Provedores de IA (OpenAI, Anthropic, Google)",
      ]},
    ],
  },
  {
    id: "branding",
    title: "Branding",
    icon: Settings,
    category: "Configuração",
    summary: "Personalize logo, nome, cores, domínio e layout da área do mentorado.",
    content: [
      { heading: "White-label", body: "Configure um domínio próprio (ex.: alunos.suamentoria.com.br) e a área do mentorado será servida com sua marca — sem menção ao Glee-go." },
      { heading: "Layout de cursos", body: "Escolha entre 4 modelos (Netflix, Grade, Neon, Cinema) para a área de trilhas do mentorado." },
    ],
  },
];

const CATEGORIES = ["Todos", "Visão Geral", "Comercial", "Gestão", "Operação", "Metodologia", "Conteúdo", "Engajamento", "Financeiro", "Comunicação", "Automação", "IA", "Rotina", "Configuração"];

export default function DocsPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Todos");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return SECTIONS.filter((s) => {
      if (cat !== "Todos" && s.category !== cat) return false;
      if (!term) return true;
      const hay = (s.title + " " + s.summary + " " + s.content.map((c) => c.heading + " " + c.body + " " + (c.items || []).join(" ")).join(" ")).toLowerCase();
      return hay.includes(term);
    });
  }, [q, cat]);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <BookOpen className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight">Documentação</h1>
          <p className="text-muted-foreground mt-1">
            Guia completo de tudo que existe no sistema e como cada área funciona. Use a busca ou os filtros para encontrar rapidamente o que precisa.
          </p>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar (ex.: trilha, cobrança, WhatsApp, IA...)"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                cat === c
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted border-border"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          Nada encontrado para "{q}". Tente outra palavra ou remova o filtro.
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.id} className="overflow-hidden">
                <Accordion type="single" collapsible>
                  <AccordionItem value={s.id} className="border-0">
                    <AccordionTrigger className="px-5 py-4 hover:no-underline">
                      <div className="flex items-start gap-4 text-left flex-1 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-base">{s.title}</h3>
                            <Badge variant="secondary" className="text-xs">{s.category}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{s.summary}</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-5">
                      <div className="pl-14 space-y-4">
                        {s.content.map((block, i) => (
                          <div key={i}>
                            <h4 className="font-medium text-sm mb-1">{block.heading}</h4>
                            {block.body && <p className="text-sm text-muted-foreground leading-relaxed">{block.body}</p>}
                            {block.items && (
                              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                                {block.items.map((it, j) => (
                                  <li key={j} className="flex gap-2">
                                    <span className="text-primary mt-1">•</span>
                                    <span>{it}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="p-6 bg-muted/30 border-dashed">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <strong className="text-foreground">Dica:</strong> se você não encontrou o que precisa aqui, use o <strong>Assistente IA</strong> no menu — ele conhece o contexto da sua operação e responde perguntas específicas sobre seus mentorados, testes e resultados.
          </div>
        </div>
      </Card>
    </div>
  );
}