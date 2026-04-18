import { LibrarySegment, LibraryTestKind, LibraryQuestion, LibraryCategory, LibraryInterpretationRange } from '../../entities/library-test-template.entity';

export interface LibrarySeed {
  seedKey: string;
  segment: LibrarySegment;
  kind: LibraryTestKind;
  title: string;
  description: string;
  objective: string;
  categories: LibraryCategory[];
  questions: LibraryQuestion[];
  baseInterpretation: LibraryInterpretationRange[];
  baseReport: string;
  baseRecommendation: string;
  aiAnalysisPrompt?: string;
}

const STD_INTERPRETATION: LibraryInterpretationRange[] = [
  { min: 0, max: 39, label: 'Crítico', description: 'A área avaliada apresenta sinais críticos. Prioridade máxima de ação imediata.' },
  { min: 40, max: 59, label: 'Atenção', description: 'Há gargalos relevantes. É necessário um plano estruturado nos próximos 30 dias.' },
  { min: 60, max: 79, label: 'Evolução', description: 'Boa base, mas com oportunidades claras de melhoria para alcançar excelência.' },
  { min: 80, max: 100, label: 'Excelência', description: 'Performance acima da média. Foco em manter consistência e escalar resultados.' },
];

const FORMAL_PROMPT = (segmento: string) =>
  `Você é um consultor sênior em ${segmento}. Analise as respostas com linguagem técnica, objetiva e executiva. Aponte 3 forças, 3 riscos críticos e 3 ações priorizadas. Conclua classificando o lead como cold, warm ou hot.`;

const FRIENDLY_PROMPT = (segmento: string) =>
  `Você é um mentor experiente em ${segmento} com linguagem clara e acolhedora. Resuma o cenário, destaque pontos fortes, identifique 3 desafios principais e proponha próximos passos práticos. Classifique o lead como cold, warm ou hot.`;

// ============================================================
// EMPRESARIAL — corporativo formal
// ============================================================
const empresarialDiagnostic: LibrarySeed = {
  seedKey: 'empresarial-diagnostico-360',
  segment: LibrarySegment.EMPRESARIAL,
  kind: LibraryTestKind.DIAGNOSTIC,
  title: 'Diagnóstico 360° de Maturidade Empresarial',
  description: 'Avaliação completa da maturidade do negócio em estratégia, gestão, pessoas e resultados.',
  objective: 'Mapear o estágio atual da empresa e identificar gargalos estruturais antes de iniciar a mentoria.',
  categories: [
    { key: 'estrategia', label: 'Estratégia & Visão', weight: 1 },
    { key: 'gestao', label: 'Gestão & Processos', weight: 1 },
    { key: 'pessoas', label: 'Pessoas & Cultura', weight: 1 },
    { key: 'resultados', label: 'Resultados & Indicadores', weight: 1 },
  ],
  questions: [
    { type: 'multiple_choice', text: 'A empresa possui um planejamento estratégico formalizado para os próximos 12 meses?', weight: 2, categoryKey: 'estrategia',
      config: { options: [{ label: 'Não há planejamento', score: 0 }, { label: 'Existe informalmente', score: 3 }, { label: 'Documentado mas pouco executado', score: 6 }, { label: 'Documentado, executado e revisado', score: 10 }] } },
    { type: 'scale', text: 'Quão clara é a visão de longo prazo (3-5 anos) para os sócios e liderança?', weight: 2, categoryKey: 'estrategia', config: { min: 1, max: 10 } },
    { type: 'multiple_choice', text: 'Os processos críticos da operação estão documentados?', weight: 2, categoryKey: 'gestao',
      config: { options: [{ label: 'Nenhum', score: 0 }, { label: 'Alguns', score: 4 }, { label: 'A maioria', score: 7 }, { label: 'Todos com SOP atualizado', score: 10 }] } },
    { type: 'scale', text: 'Nível de delegação real do principal gestor (1=faz tudo, 10=time autônomo).', weight: 2, categoryKey: 'gestao', config: { min: 1, max: 10 } },
    { type: 'multiple_choice', text: 'Como você avalia o engajamento do time atualmente?', weight: 1, categoryKey: 'pessoas',
      config: { options: [{ label: 'Baixo, alta rotatividade', score: 0 }, { label: 'Médio', score: 5 }, { label: 'Alto e estável', score: 10 }] } },
    { type: 'multiple_choice', text: 'Existe um plano de carreira ou trilha de desenvolvimento para o time?', weight: 1, categoryKey: 'pessoas',
      config: { options: [{ label: 'Não existe', score: 0 }, { label: 'Em construção', score: 5 }, { label: 'Implementado e ativo', score: 10 }] } },
    { type: 'scale', text: 'Quão confiantes vocês estão nos números financeiros mensais reportados?', weight: 2, categoryKey: 'resultados', config: { min: 1, max: 10 } },
    { type: 'multiple_choice', text: 'KPIs estratégicos são acompanhados em ritmo definido (dashboards, reuniões)?', weight: 2, categoryKey: 'resultados',
      config: { options: [{ label: 'Não acompanhamos', score: 0 }, { label: 'Esporadicamente', score: 4 }, { label: 'Mensalmente', score: 7 }, { label: 'Semanalmente com plano de ação', score: 10 }] } },
    { type: 'open_text', text: 'Qual é o principal gargalo que impede a empresa de crescer hoje?', weight: 1, categoryKey: 'estrategia' },
  ],
  baseInterpretation: STD_INTERPRETATION,
  baseReport: `# Diagnóstico Empresarial 360°\n\nEsta avaliação posiciona a empresa em quatro dimensões críticas: Estratégia, Gestão, Pessoas e Resultados. O score geral indica a maturidade consolidada, enquanto os scores por categoria revelam onde concentrar energia nos próximos ciclos.`,
  baseRecommendation: `Sugerimos iniciar pela categoria de menor score, validando hipóteses em uma sessão de discovery de 90 minutos. Estabeleça 1 OKR trimestral por dimensão prioritária e cadência semanal de revisão.`,
  aiAnalysisPrompt: FORMAL_PROMPT('gestão empresarial'),
};

const empresarialQuick: LibrarySeed = {
  seedKey: 'empresarial-pulse-gestao',
  segment: LibrarySegment.EMPRESARIAL,
  kind: LibraryTestKind.QUICK,
  title: 'Pulse Rápido de Gestão',
  description: 'Termômetro de 5 perguntas para usar em palestras e eventos de captação.',
  objective: 'Qualificar prospects em poucos minutos identificando dor primária de gestão.',
  categories: [
    { key: 'urgencia', label: 'Urgência', weight: 1 },
    { key: 'capacidade', label: 'Capacidade de Investir', weight: 1 },
  ],
  questions: [
    { type: 'scale', text: 'Quão urgente é resolver o principal problema de gestão hoje?', weight: 2, categoryKey: 'urgencia', config: { min: 1, max: 10 } },
    { type: 'multiple_choice', text: 'Faturamento mensal aproximado?', weight: 2, categoryKey: 'capacidade',
      config: { options: [{ label: 'Até R$ 50k', score: 2 }, { label: 'R$ 50k a R$ 200k', score: 5 }, { label: 'R$ 200k a R$ 1M', score: 8 }, { label: 'Acima de R$ 1M', score: 10 }] } },
    { type: 'multiple_choice', text: 'Você já investiu em mentoria ou consultoria antes?', weight: 1, categoryKey: 'capacidade',
      config: { options: [{ label: 'Nunca', score: 3 }, { label: 'Sim, sem resultado', score: 6 }, { label: 'Sim, com bons resultados', score: 10 }] } },
    { type: 'scale', text: 'Em uma escala de 1 a 10, quanto você está disposto a mudar processos atuais?', weight: 1, categoryKey: 'urgencia', config: { min: 1, max: 10 } },
    { type: 'open_text', text: 'Em uma frase: o que mudaria se essa dor fosse resolvida em 90 dias?', weight: 1, categoryKey: 'urgencia' },
  ],
  baseInterpretation: STD_INTERPRETATION,
  baseReport: `Pulse rápido para qualificação. Score acima de 70% indica lead com urgência + capacidade — priorizar contato em 24h.`,
  baseRecommendation: `Cold (<40): nutrição por conteúdo. Warm (40-69): convite para diagnóstico gratuito. Hot (≥70): proposta direta.`,
  aiAnalysisPrompt: FORMAL_PROMPT('gestão empresarial'),
};

// ============================================================
// RH — acessível e direto
// ============================================================
const rhDiagnostic: LibrarySeed = {
  seedKey: 'rh-cultura-engajamento',
  segment: LibrarySegment.RH,
  kind: LibraryTestKind.DIAGNOSTIC,
  title: 'Diagnóstico de Cultura & Engajamento',
  description: 'Avaliação prática da saúde cultural e do nível de engajamento do time.',
  objective: 'Identificar pontos fortes da cultura e onde o engajamento está sendo perdido.',
  categories: [
    { key: 'clima', label: 'Clima', weight: 1 },
    { key: 'lideranca', label: 'Liderança', weight: 1 },
    { key: 'reconhecimento', label: 'Reconhecimento', weight: 1 },
    { key: 'desenvolvimento', label: 'Desenvolvimento', weight: 1 },
  ],
  questions: [
    { type: 'scale', text: 'O quanto seu time recomenda a empresa como um bom lugar para trabalhar (eNPS)?', weight: 2, categoryKey: 'clima', config: { min: 1, max: 10 } },
    { type: 'multiple_choice', text: 'Como anda a rotatividade nos últimos 12 meses?', weight: 2, categoryKey: 'clima',
      config: { options: [{ label: 'Muito alta (>30%)', score: 0 }, { label: 'Alta (15-30%)', score: 4 }, { label: 'Saudável (<15%)', score: 10 }] } },
    { type: 'scale', text: 'Quão preparados estão os líderes para conduzir feedbacks difíceis?', weight: 2, categoryKey: 'lideranca', config: { min: 1, max: 10 } },
    { type: 'multiple_choice', text: 'Existem rituais de 1:1 entre líderes e liderados?', weight: 1, categoryKey: 'lideranca',
      config: { options: [{ label: 'Não existem', score: 0 }, { label: 'Existem mas não acontecem', score: 3 }, { label: 'Acontecem com regularidade', score: 10 }] } },
    { type: 'multiple_choice', text: 'Existe um programa estruturado de reconhecimento?', weight: 1, categoryKey: 'reconhecimento',
      config: { options: [{ label: 'Nenhum', score: 0 }, { label: 'Informal', score: 5 }, { label: 'Estruturado e ativo', score: 10 }] } },
    { type: 'scale', text: 'Quanto o time se sente reconhecido por entregas relevantes?', weight: 1, categoryKey: 'reconhecimento', config: { min: 1, max: 10 } },
    { type: 'multiple_choice', text: 'Existe trilha de desenvolvimento individual?', weight: 2, categoryKey: 'desenvolvimento',
      config: { options: [{ label: 'Não', score: 0 }, { label: 'Em piloto', score: 5 }, { label: 'Implementada', score: 10 }] } },
    { type: 'open_text', text: 'Se pudesse mudar uma coisa na cultura amanhã, o que seria?', weight: 1, categoryKey: 'clima' },
  ],
  baseInterpretation: STD_INTERPRETATION,
  baseReport: `Análise da saúde cultural sob 4 lentes. Score geral abaixo de 60% sinaliza risco de fuga de talentos nos próximos 6 meses.`,
  baseRecommendation: `Atue na categoria de menor score primeiro. Combine ações rápidas (rituais, reconhecimento) com estruturais (trilhas, formação de liderança).`,
  aiAnalysisPrompt: FRIENDLY_PROMPT('cultura organizacional e RH'),
};

const rhQuick: LibrarySeed = {
  seedKey: 'rh-termometro-clima',
  segment: LibrarySegment.RH,
  kind: LibraryTestKind.QUICK,
  title: 'Termômetro de Clima',
  description: 'Pulse rápido de 5 perguntas para checar o clima do time em 2 minutos.',
  objective: 'Detectar sinais de alerta no clima organizacional sem aplicar pesquisa formal.',
  categories: [{ key: 'clima', label: 'Clima', weight: 1 }],
  questions: [
    { type: 'scale', text: 'Como está sua energia para vir trabalhar nesta semana?', weight: 1, categoryKey: 'clima', config: { min: 1, max: 10 } },
    { type: 'scale', text: 'Quão claro está o que se espera de você nos próximos 30 dias?', weight: 1, categoryKey: 'clima', config: { min: 1, max: 10 } },
    { type: 'scale', text: 'Quão à vontade você se sente para discordar do seu líder?', weight: 1, categoryKey: 'clima', config: { min: 1, max: 10 } },
    { type: 'scale', text: 'Quão reconhecido você se sentiu no último mês?', weight: 1, categoryKey: 'clima', config: { min: 1, max: 10 } },
    { type: 'open_text', text: 'O que poderia melhorar seu dia a dia aqui?', weight: 1, categoryKey: 'clima' },
  ],
  baseInterpretation: STD_INTERPRETATION,
  baseReport: `Indicador rápido de clima. Tendência de queda em pulses sequenciais é sinal de alerta antecipado.`,
  baseRecommendation: `Aplique mensalmente. Compare com pulses anteriores e abra conversa de feedback nas perguntas com menor score.`,
  aiAnalysisPrompt: FRIENDLY_PROMPT('clima e engajamento'),
};

// ============================================================
// FINANCEIRO — acessível e direto
// ============================================================
const financeiroDiagnostic: LibrarySeed = {
  seedKey: 'financeiro-saude-financeira',
  segment: LibrarySegment.FINANCEIRO,
  kind: LibraryTestKind.DIAGNOSTIC,
  title: 'Diagnóstico de Saúde Financeira',
  description: 'Análise abrangente da saúde financeira do negócio em 4 dimensões.',
  objective: 'Identificar onde o dinheiro está vazando e o que travar antes de planejar crescimento.',
  categories: [
    { key: 'caixa', label: 'Fluxo de Caixa', weight: 1 },
    { key: 'margens', label: 'Margens & Precificação', weight: 1 },
    { key: 'controles', label: 'Controles Financeiros', weight: 1 },
    { key: 'planejamento', label: 'Planejamento', weight: 1 },
  ],
  questions: [
    { type: 'multiple_choice', text: 'Você sabe hoje, com precisão, quanto sobra (ou falta) no caixa no fim do mês?', weight: 2, categoryKey: 'caixa',
      config: { options: [{ label: 'Não sei', score: 0 }, { label: 'Tenho uma estimativa', score: 4 }, { label: 'Sim, com margem de erro pequena', score: 10 }] } },
    { type: 'multiple_choice', text: 'Existe reserva de emergência (capital de giro)?', weight: 2, categoryKey: 'caixa',
      config: { options: [{ label: 'Não', score: 0 }, { label: 'Menos de 1 mês de operação', score: 3 }, { label: '1 a 3 meses', score: 7 }, { label: 'Mais de 3 meses', score: 10 }] } },
    { type: 'scale', text: 'Quanto você confia que sua precificação cobre todos os custos diretos e indiretos?', weight: 2, categoryKey: 'margens', config: { min: 1, max: 10 } },
    { type: 'multiple_choice', text: 'Você acompanha a margem de contribuição por produto/serviço?', weight: 2, categoryKey: 'margens',
      config: { options: [{ label: 'Não acompanho', score: 0 }, { label: 'Acompanho global', score: 5 }, { label: 'Acompanho item a item', score: 10 }] } },
    { type: 'multiple_choice', text: 'PJ e PF estão financeiramente separados?', weight: 2, categoryKey: 'controles',
      config: { options: [{ label: 'Não', score: 0 }, { label: 'Parcialmente', score: 5 }, { label: 'Totalmente separados', score: 10 }] } },
    { type: 'multiple_choice', text: 'Você tem DRE atualizado mensalmente?', weight: 1, categoryKey: 'controles',
      config: { options: [{ label: 'Não tenho', score: 0 }, { label: 'Atrasado', score: 4 }, { label: 'Sempre em dia', score: 10 }] } },
    { type: 'multiple_choice', text: 'Existe orçamento anual e acompanhamento de realizado vs planejado?', weight: 2, categoryKey: 'planejamento',
      config: { options: [{ label: 'Não', score: 0 }, { label: 'Apenas planejado', score: 4 }, { label: 'Planejado + realizado mensal', score: 10 }] } },
    { type: 'open_text', text: 'Qual decisão financeira está te tirando o sono?', weight: 1, categoryKey: 'planejamento' },
  ],
  baseInterpretation: STD_INTERPRETATION,
  baseReport: `Diagnóstico financeiro nas 4 dimensões essenciais. Categorias com score crítico devem ser tratadas em paralelo, não em série.`,
  baseRecommendation: `Comece resolvendo a categoria de menor score. Se Controles for crítico, qualquer outro plano financeiro será fragil. Implementar DRE mensal é o ponto de partida típico.`,
  aiAnalysisPrompt: FRIENDLY_PROMPT('finanças empresariais'),
};

const financeiroQuick: LibrarySeed = {
  seedKey: 'financeiro-quick-fluxo',
  segment: LibrarySegment.FINANCEIRO,
  kind: LibraryTestKind.QUICK,
  title: 'Quick Check de Fluxo de Caixa',
  description: 'Pulse de 5 perguntas para detectar risco imediato de caixa.',
  objective: 'Mapear em minutos se há risco de iliquidez nos próximos 90 dias.',
  categories: [{ key: 'caixa', label: 'Fluxo de Caixa', weight: 1 }],
  questions: [
    { type: 'scale', text: 'Quantas semanas de caixa você tem hoje? (1=menos de 1, 10=mais de 12)', weight: 2, categoryKey: 'caixa', config: { min: 1, max: 10 } },
    { type: 'multiple_choice', text: 'Existe previsão de fluxo de caixa para os próximos 90 dias?', weight: 2, categoryKey: 'caixa',
      config: { options: [{ label: 'Não', score: 0 }, { label: 'Estimativa mental', score: 4 }, { label: 'Planilha atualizada', score: 10 }] } },
    { type: 'scale', text: 'Quão concentrado é seu faturamento em poucos clientes? (1=muito, 10=diversificado)', weight: 1, categoryKey: 'caixa', config: { min: 1, max: 10 } },
    { type: 'multiple_choice', text: 'Como está a inadimplência?', weight: 1, categoryKey: 'caixa',
      config: { options: [{ label: 'Acima de 10%', score: 0 }, { label: 'Entre 3 e 10%', score: 5 }, { label: 'Abaixo de 3%', score: 10 }] } },
    { type: 'open_text', text: 'Qual sua maior incerteza financeira para os próximos 30 dias?', weight: 1, categoryKey: 'caixa' },
  ],
  baseInterpretation: STD_INTERPRETATION,
  baseReport: `Termômetro de risco de caixa. Score abaixo de 50% indica necessidade de ação em até 7 dias.`,
  baseRecommendation: `Score crítico → renegociar prazos com fornecedores e antecipar recebíveis. Score saudável → projetar 12 meses.`,
  aiAnalysisPrompt: FRIENDLY_PROMPT('gestão de caixa'),
};

// ============================================================
// JURÍDICO — corporativo formal
// ============================================================
const juridicoDiagnostic: LibrarySeed = {
  seedKey: 'juridico-compliance-risco',
  segment: LibrarySegment.JURIDICO,
  kind: LibraryTestKind.DIAGNOSTIC,
  title: 'Diagnóstico de Compliance & Risco Jurídico',
  description: 'Mapeamento da exposição jurídica e maturidade de compliance da empresa.',
  objective: 'Identificar passivos ocultos e priorizar adequações regulatórias.',
  categories: [
    { key: 'contratos', label: 'Contratos', weight: 1 },
    { key: 'trabalhista', label: 'Trabalhista', weight: 1 },
    { key: 'tributario', label: 'Tributário', weight: 1 },
    { key: 'lgpd', label: 'LGPD & Dados', weight: 1 },
  ],
  questions: [
    { type: 'multiple_choice', text: 'Os contratos com clientes e fornecedores são padronizados e revisados juridicamente?', weight: 2, categoryKey: 'contratos',
      config: { options: [{ label: 'Sem padrão', score: 0 }, { label: 'Modelo informal', score: 4 }, { label: 'Modelos revisados por advogado', score: 10 }] } },
    { type: 'multiple_choice', text: 'Existe gestão centralizada de prazos contratuais (renovações, vencimentos)?', weight: 1, categoryKey: 'contratos',
      config: { options: [{ label: 'Não', score: 0 }, { label: 'Planilha esporádica', score: 5 }, { label: 'Sistema com alertas', score: 10 }] } },
    { type: 'multiple_choice', text: 'Existem processos trabalhistas ativos ou recorrentes?', weight: 2, categoryKey: 'trabalhista',
      config: { options: [{ label: 'Vários e recorrentes', score: 0 }, { label: 'Pontuais', score: 5 }, { label: 'Nenhum nos últimos 24m', score: 10 }] } },
    { type: 'scale', text: 'Quão atualizadas estão as políticas internas e de RH em relação à CLT vigente?', weight: 1, categoryKey: 'trabalhista', config: { min: 1, max: 10 } },
    { type: 'multiple_choice', text: 'Há revisão tributária periódica para identificação de oportunidades e riscos?', weight: 2, categoryKey: 'tributario',
      config: { options: [{ label: 'Nunca foi feita', score: 0 }, { label: 'Há mais de 2 anos', score: 4 }, { label: 'Anualmente', score: 10 }] } },
    { type: 'multiple_choice', text: 'Existe enquadramento tributário validado para o porte e atividade atual?', weight: 1, categoryKey: 'tributario',
      config: { options: [{ label: 'Nunca validado', score: 0 }, { label: 'Validado no início', score: 5 }, { label: 'Revisado nos últimos 12m', score: 10 }] } },
    { type: 'multiple_choice', text: 'A empresa está adequada à LGPD (mapeamento de dados, política, DPO)?', weight: 2, categoryKey: 'lgpd',
      config: { options: [{ label: 'Não iniciado', score: 0 }, { label: 'Política básica', score: 4 }, { label: 'Adequação parcial', score: 7 }, { label: 'Plenamente adequada', score: 10 }] } },
    { type: 'open_text', text: 'Qual risco jurídico mais te preocupa hoje?', weight: 1, categoryKey: 'contratos' },
  ],
  baseInterpretation: STD_INTERPRETATION,
  baseReport: `# Diagnóstico Jurídico\n\nMapeamento de exposição em quatro frentes regulatórias. Categorias críticas devem ser tratadas com prioridade absoluta dada a natureza assimétrica do risco jurídico (baixa probabilidade × alto impacto).`,
  baseRecommendation: `Priorize: (1) cessar passivos recorrentes (trabalhista crítico), (2) regularizar contratos-padrão, (3) revisar enquadramento tributário, (4) avançar LGPD em fases trimestrais.`,
  aiAnalysisPrompt: FORMAL_PROMPT('compliance e risco jurídico empresarial'),
};

const juridicoQuick: LibrarySeed = {
  seedKey: 'juridico-pulse-preventivo',
  segment: LibrarySegment.JURIDICO,
  kind: LibraryTestKind.QUICK,
  title: 'Pulse Jurídico Preventivo',
  description: 'Checagem rápida de 5 pontos críticos de exposição jurídica.',
  objective: 'Sinalizar passivos potenciais em 3 minutos para qualificar conversas iniciais.',
  categories: [{ key: 'risco', label: 'Risco Jurídico', weight: 1 }],
  questions: [
    { type: 'multiple_choice', text: 'Possui contratos escritos com todos os clientes ativos?', weight: 2, categoryKey: 'risco',
      config: { options: [{ label: 'Não', score: 0 }, { label: 'Apenas com alguns', score: 5 }, { label: 'Sim, com todos', score: 10 }] } },
    { type: 'multiple_choice', text: 'Possui processo formal de admissão/demissão alinhado à CLT?', weight: 2, categoryKey: 'risco',
      config: { options: [{ label: 'Não', score: 0 }, { label: 'Parcialmente', score: 5 }, { label: 'Totalmente', score: 10 }] } },
    { type: 'multiple_choice', text: 'Sua empresa possui política de privacidade e termo de uso publicados?', weight: 1, categoryKey: 'risco',
      config: { options: [{ label: 'Não', score: 0 }, { label: 'Em construção', score: 5 }, { label: 'Sim, atualizados', score: 10 }] } },
    { type: 'scale', text: 'Quão confiante você está de que não há passivos jurídicos ocultos?', weight: 2, categoryKey: 'risco', config: { min: 1, max: 10 } },
    { type: 'open_text', text: 'Houve alguma notificação ou processo nos últimos 12 meses?', weight: 1, categoryKey: 'risco' },
  ],
  baseInterpretation: STD_INTERPRETATION,
  baseReport: `Pulse de exposição jurídica. Score baixo demanda diagnóstico aprofundado em até 30 dias.`,
  baseRecommendation: `Score crítico → diagnóstico completo prioritário. Score moderado → plano de adequação trimestral.`,
  aiAnalysisPrompt: FORMAL_PROMPT('risco jurídico e compliance'),
};

// ============================================================
// COMERCIAL — misto (formal-acessível)
// ============================================================
const comercialDiagnostic: LibrarySeed = {
  seedKey: 'comercial-funil-conversao',
  segment: LibrarySegment.COMERCIAL,
  kind: LibraryTestKind.DIAGNOSTIC,
  title: 'Diagnóstico de Funil & Conversão',
  description: 'Análise da saúde do processo comercial do topo ao fechamento.',
  objective: 'Identificar onde leads são perdidos no funil e oportunidades de aumento de conversão.',
  categories: [
    { key: 'topo', label: 'Topo de Funil', weight: 1 },
    { key: 'qualificacao', label: 'Qualificação', weight: 1 },
    { key: 'fechamento', label: 'Fechamento', weight: 1 },
    { key: 'pos', label: 'Pós-venda', weight: 1 },
  ],
  questions: [
    { type: 'multiple_choice', text: 'Existe previsibilidade na geração de leads mensais?', weight: 2, categoryKey: 'topo',
      config: { options: [{ label: 'Nenhuma', score: 0 }, { label: 'Parcial', score: 5 }, { label: 'Total e mensurada', score: 10 }] } },
    { type: 'scale', text: 'Quão diversificadas são suas fontes de leads (indicação, ads, orgânico, eventos)?', weight: 1, categoryKey: 'topo', config: { min: 1, max: 10 } },
    { type: 'multiple_choice', text: 'Existe critério claro de qualificação (ICP) aplicado a todo lead?', weight: 2, categoryKey: 'qualificacao',
      config: { options: [{ label: 'Não', score: 0 }, { label: 'Informal', score: 5 }, { label: 'Formal e seguido', score: 10 }] } },
    { type: 'scale', text: 'Quão alinhados estão marketing e vendas no handoff de leads?', weight: 1, categoryKey: 'qualificacao', config: { min: 1, max: 10 } },
    { type: 'multiple_choice', text: 'Existe playbook documentado para fechamento?', weight: 2, categoryKey: 'fechamento',
      config: { options: [{ label: 'Não', score: 0 }, { label: 'Em construção', score: 5 }, { label: 'Documentado e treinado', score: 10 }] } },
    { type: 'scale', text: 'Conversão de proposta enviada → fechamento (1=baixíssima, 10=excelente).', weight: 2, categoryKey: 'fechamento', config: { min: 1, max: 10 } },
    { type: 'multiple_choice', text: 'Existe processo estruturado de pós-venda e expansão?', weight: 1, categoryKey: 'pos',
      config: { options: [{ label: 'Não', score: 0 }, { label: 'Pontual', score: 5 }, { label: 'Estruturado', score: 10 }] } },
    { type: 'open_text', text: 'Qual etapa do funil mais te frustra hoje?', weight: 1, categoryKey: 'fechamento' },
  ],
  baseInterpretation: STD_INTERPRETATION,
  baseReport: `Diagnóstico do funil comercial em 4 estágios. Pontos críticos sequenciais multiplicam a perda — corrigir do topo para a base é a regra.`,
  baseRecommendation: `Mapeie taxa de conversão entre etapas. Atue primeiro na etapa de maior queda relativa, não absoluta.`,
  aiAnalysisPrompt: FORMAL_PROMPT('vendas B2B e gestão comercial'),
};

// ============================================================
// LIDERANÇA — misto
// ============================================================
const liderancaDiagnostic: LibrarySeed = {
  seedKey: 'lideranca-maturidade',
  segment: LibrarySegment.LIDERANCA,
  kind: LibraryTestKind.DIAGNOSTIC,
  title: 'Maturidade em Liderança',
  description: 'Avaliação 360° da maturidade do líder em comunicação, decisão e desenvolvimento de pessoas.',
  objective: 'Identificar as maiores alavancas de desenvolvimento como líder.',
  categories: [
    { key: 'autoconhecimento', label: 'Autoconhecimento', weight: 1 },
    { key: 'comunicacao', label: 'Comunicação', weight: 1 },
    { key: 'decisao', label: 'Tomada de Decisão', weight: 1 },
    { key: 'pessoas', label: 'Desenvolvimento de Pessoas', weight: 1 },
  ],
  questions: [
    { type: 'scale', text: 'Você consegue identificar seus gatilhos emocionais em situações de pressão?', weight: 1, categoryKey: 'autoconhecimento', config: { min: 1, max: 10 } },
    { type: 'scale', text: 'Quão clara é sua comunicação de expectativas para o time?', weight: 2, categoryKey: 'comunicacao', config: { min: 1, max: 10 } },
    { type: 'multiple_choice', text: 'Você dá feedbacks construtivos com regularidade?', weight: 2, categoryKey: 'comunicacao',
      config: { options: [{ label: 'Raramente', score: 0 }, { label: 'Quando algo dá errado', score: 4 }, { label: 'Em ritual fixo (1:1)', score: 10 }] } },
    { type: 'scale', text: 'Quão rápido você toma decisões difíceis?', weight: 2, categoryKey: 'decisao', config: { min: 1, max: 10 } },
    { type: 'multiple_choice', text: 'Você delega decisões importantes ao time?', weight: 2, categoryKey: 'decisao',
      config: { options: [{ label: 'Quase nunca', score: 0 }, { label: 'Em casos pontuais', score: 5 }, { label: 'Como prática regular', score: 10 }] } },
    { type: 'multiple_choice', text: 'Existe plano de desenvolvimento individual para cada liderado direto?', weight: 2, categoryKey: 'pessoas',
      config: { options: [{ label: 'Não', score: 0 }, { label: 'Para alguns', score: 5 }, { label: 'Para todos', score: 10 }] } },
    { type: 'open_text', text: 'Qual é o feedback mais difícil que você precisa dar e ainda não deu?', weight: 1, categoryKey: 'comunicacao' },
  ],
  baseInterpretation: STD_INTERPRETATION,
  baseReport: `Maturidade de liderança avaliada em 4 dimensões. Liderança evolui de dentro para fora — autoconhecimento baixo limita as outras dimensões.`,
  baseRecommendation: `Construa um Plano de Desenvolvimento de Liderança trimestral. Combine prática (rituais, 1:1) com reflexão (mentoria, journaling).`,
  aiAnalysisPrompt: FRIENDLY_PROMPT('liderança e gestão de pessoas'),
};

// ============================================================
// PROCESSOS — formal
// ============================================================
const processosDiagnostic: LibrarySeed = {
  seedKey: 'processos-maturidade-operacional',
  segment: LibrarySegment.PROCESSOS,
  kind: LibraryTestKind.DIAGNOSTIC,
  title: 'Maturidade Operacional & de Processos',
  description: 'Avaliação do nível de padronização, automação e melhoria contínua.',
  objective: 'Identificar gargalos operacionais e oportunidades de automação.',
  categories: [
    { key: 'padronizacao', label: 'Padronização', weight: 1 },
    { key: 'automacao', label: 'Automação', weight: 1 },
    { key: 'indicadores', label: 'Indicadores', weight: 1 },
    { key: 'melhoria', label: 'Melhoria Contínua', weight: 1 },
  ],
  questions: [
    { type: 'multiple_choice', text: 'Os processos críticos têm SOP (Standard Operating Procedure) atualizado?', weight: 2, categoryKey: 'padronizacao',
      config: { options: [{ label: 'Nenhum', score: 0 }, { label: 'Alguns', score: 5 }, { label: 'Todos', score: 10 }] } },
    { type: 'scale', text: 'Quão dependentes são os processos de pessoas-chave específicas?', weight: 2, categoryKey: 'padronizacao', config: { min: 1, max: 10 } },
    { type: 'multiple_choice', text: 'Quanto da operação está automatizado (sistemas, integrações)?', weight: 2, categoryKey: 'automacao',
      config: { options: [{ label: 'Manual', score: 0 }, { label: 'Parcialmente', score: 5 }, { label: 'Altamente automatizado', score: 10 }] } },
    { type: 'multiple_choice', text: 'Existem KPIs operacionais acompanhados em ritmo definido?', weight: 2, categoryKey: 'indicadores',
      config: { options: [{ label: 'Não', score: 0 }, { label: 'Mensalmente', score: 6 }, { label: 'Semanalmente com plano de ação', score: 10 }] } },
    { type: 'scale', text: 'Quão maduro é o ciclo de melhoria contínua (PDCA, retros)?', weight: 1, categoryKey: 'melhoria', config: { min: 1, max: 10 } },
    { type: 'open_text', text: 'Qual processo manual mais consome tempo da liderança hoje?', weight: 1, categoryKey: 'automacao' },
  ],
  baseInterpretation: STD_INTERPRETATION,
  baseReport: `Maturidade operacional em 4 frentes. Padronização baixa torna automação inviável — corrija a base antes de automatizar.`,
  baseRecommendation: `Sequência recomendada: padronizar → medir → automatizar → melhorar continuamente.`,
  aiAnalysisPrompt: FORMAL_PROMPT('gestão de processos e operações'),
};

// ============================================================
// MARKETING — acessível
// ============================================================
const marketingDiagnostic: LibrarySeed = {
  seedKey: 'marketing-maturidade-digital',
  segment: LibrarySegment.MARKETING,
  kind: LibraryTestKind.DIAGNOSTIC,
  title: 'Maturidade de Marketing Digital',
  description: 'Diagnóstico das frentes de aquisição, conteúdo e mensuração.',
  objective: 'Mapear o estágio do marketing e definir prioridades dos próximos 90 dias.',
  categories: [
    { key: 'estrategia', label: 'Estratégia & Posicionamento', weight: 1 },
    { key: 'aquisicao', label: 'Aquisição', weight: 1 },
    { key: 'conteudo', label: 'Conteúdo & Marca', weight: 1 },
    { key: 'mensuracao', label: 'Mensuração', weight: 1 },
  ],
  questions: [
    { type: 'multiple_choice', text: 'Existe um posicionamento de marca documentado e consistente?', weight: 2, categoryKey: 'estrategia',
      config: { options: [{ label: 'Não', score: 0 }, { label: 'Implícito', score: 5 }, { label: 'Documentado e aplicado', score: 10 }] } },
    { type: 'scale', text: 'Quão claro é seu ICP (cliente ideal)?', weight: 1, categoryKey: 'estrategia', config: { min: 1, max: 10 } },
    { type: 'multiple_choice', text: 'Quantos canais de aquisição estão ativos e funcionando?', weight: 2, categoryKey: 'aquisicao',
      config: { options: [{ label: 'Nenhum', score: 0 }, { label: '1', score: 4 }, { label: '2 a 3', score: 7 }, { label: '4 ou mais', score: 10 }] } },
    { type: 'multiple_choice', text: 'Existe calendário de conteúdo executado com regularidade?', weight: 2, categoryKey: 'conteudo',
      config: { options: [{ label: 'Não', score: 0 }, { label: 'Esporádico', score: 4 }, { label: 'Semanal e consistente', score: 10 }] } },
    { type: 'multiple_choice', text: 'Você sabe o CAC e o LTV do seu negócio?', weight: 2, categoryKey: 'mensuracao',
      config: { options: [{ label: 'Não', score: 0 }, { label: 'Estimo', score: 5 }, { label: 'Sei com precisão', score: 10 }] } },
    { type: 'open_text', text: 'Qual é seu maior desafio de marketing hoje?', weight: 1, categoryKey: 'aquisicao' },
  ],
  baseInterpretation: STD_INTERPRETATION,
  baseReport: `Marketing avaliado em 4 dimensões. Sem posicionamento claro, o investimento em mídia rende menos.`,
  baseRecommendation: `Garanta primeiro posicionamento e ICP. Depois escolha 1 canal de aquisição e 1 motor de conteúdo. Meça CAC/LTV antes de escalar.`,
  aiAnalysisPrompt: FRIENDLY_PROMPT('marketing digital e aquisição'),
};

// ============================================================
// PRODUTIVIDADE — acessível
// ============================================================
const produtividadeDiagnostic: LibrarySeed = {
  seedKey: 'produtividade-foco-energia',
  segment: LibrarySegment.PRODUTIVIDADE,
  kind: LibraryTestKind.DIAGNOSTIC,
  title: 'Diagnóstico de Foco, Energia & Resultados',
  description: 'Avaliação dos pilares de produtividade individual de líderes e empreendedores.',
  objective: 'Identificar onde o tempo está sendo perdido e como recuperar foco estratégico.',
  categories: [
    { key: 'tempo', label: 'Gestão do Tempo', weight: 1 },
    { key: 'foco', label: 'Foco & Atenção', weight: 1 },
    { key: 'energia', label: 'Energia & Recuperação', weight: 1 },
    { key: 'resultados', label: 'Resultados', weight: 1 },
  ],
  questions: [
    { type: 'multiple_choice', text: 'Você planeja a semana antes dela começar?', weight: 2, categoryKey: 'tempo',
      config: { options: [{ label: 'Nunca', score: 0 }, { label: 'Às vezes', score: 5 }, { label: 'Toda semana', score: 10 }] } },
    { type: 'scale', text: 'Quanto da sua agenda é ocupada por reuniões que poderiam ser e-mail?', weight: 1, categoryKey: 'tempo', config: { min: 1, max: 10 } },
    { type: 'scale', text: 'Quão fácil é manter foco em blocos de 90 minutos?', weight: 2, categoryKey: 'foco', config: { min: 1, max: 10 } },
    { type: 'scale', text: 'Quão restaurador é seu sono atualmente?', weight: 2, categoryKey: 'energia', config: { min: 1, max: 10 } },
    { type: 'multiple_choice', text: 'Você tem rituais diários de recuperação (pausas, exercícios, meditação)?', weight: 1, categoryKey: 'energia',
      config: { options: [{ label: 'Nenhum', score: 0 }, { label: '1 deles', score: 5 }, { label: 'Múltiplos consistentes', score: 10 }] } },
    { type: 'multiple_choice', text: 'Você termina a semana com clareza do que entregou de mais importante?', weight: 2, categoryKey: 'resultados',
      config: { options: [{ label: 'Quase nunca', score: 0 }, { label: 'Às vezes', score: 5 }, { label: 'Sempre', score: 10 }] } },
    { type: 'open_text', text: 'O que você gostaria de parar de fazer imediatamente?', weight: 1, categoryKey: 'tempo' },
  ],
  baseInterpretation: STD_INTERPRETATION,
  baseReport: `Produtividade vista por 4 lentes integradas. Energia baixa derruba foco; foco baixo destrói gestão do tempo.`,
  baseRecommendation: `Comece pela categoria de menor score. Para a maioria, intervir na energia (sono + recuperação) gera ganhos compostos rápidos em foco e resultados.`,
  aiAnalysisPrompt: FRIENDLY_PROMPT('produtividade e alta performance'),
};

export const LIBRARY_SEEDS: LibrarySeed[] = [
  empresarialDiagnostic,
  empresarialQuick,
  rhDiagnostic,
  rhQuick,
  financeiroDiagnostic,
  financeiroQuick,
  juridicoDiagnostic,
  juridicoQuick,
  comercialDiagnostic,
  liderancaDiagnostic,
  processosDiagnostic,
  marketingDiagnostic,
  produtividadeDiagnostic,
];
