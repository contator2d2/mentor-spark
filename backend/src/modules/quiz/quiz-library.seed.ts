import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizLibraryTemplate, QuizSegment } from '../../entities/quiz-template.entity';

interface SeedItem {
  seedKey: string;
  segment: QuizSegment;
  title: string;
  description: string;
  defaultTimeLimit?: number;
  questions: Array<{ text: string; options: Array<{ label: string; correct?: boolean }> }>;
}

/**
 * Modelos prontos da biblioteca de quizzes (idempotente — reexecuta no boot).
 * Cada item tem 5 perguntas curtas estilo Kahoot, com 4 alternativas.
 */
const SEED: SeedItem[] = [
  // ============== COMERCIAL / VENDAS ==============
  {
    seedKey: 'comercial-spin-selling-basico',
    segment: QuizSegment.COMERCIAL,
    title: 'SPIN Selling — Fundamentos',
    description: 'Teste rápido sobre o método SPIN para vendas consultivas.',
    questions: [
      { text: 'O que significa SPIN em SPIN Selling?', options: [
        { label: 'Solução, Problema, Implicação, Necessidade' },
        { label: 'Situação, Problema, Implicação, Necessidade-pagamento', correct: true },
        { label: 'Status, Pessoas, Informação, Negociação' },
        { label: 'Sucesso, Produto, Investimento, Negócio' },
      ]},
      { text: 'Qual pergunta SPIN tem MAIOR poder em vendas complexas?', options: [
        { label: 'Situação' }, { label: 'Problema' },
        { label: 'Implicação', correct: true }, { label: 'Necessidade-pagamento' },
      ]},
      { text: 'Quem desenvolveu o método SPIN?', options: [
        { label: 'Brian Tracy' }, { label: 'Neil Rackham', correct: true },
        { label: 'Zig Ziglar' }, { label: 'Jordan Belfort' },
      ]},
      { text: 'Perguntas de "Implicação" servem para:', options: [
        { label: 'Coletar dados sobre a empresa' },
        { label: 'Ampliar a percepção da gravidade do problema', correct: true },
        { label: 'Apresentar o preço' },
        { label: 'Fechar o pedido' },
      ]},
      { text: 'Em vendas complexas, o fechamento depende mais de:', options: [
        { label: 'Técnicas de pressão' },
        { label: 'Construção de valor ao longo da conversa', correct: true },
        { label: 'Descontos agressivos' },
        { label: 'Quantidade de ligações' },
      ]},
    ],
  },
  {
    seedKey: 'comercial-objecoes',
    segment: QuizSegment.COMERCIAL,
    title: 'Quebra de Objeções',
    description: 'Identifique a melhor resposta para objeções clássicas.',
    questions: [
      { text: 'Cliente diz: "Está caro". Melhor primeira resposta?', options: [
        { label: 'Posso te dar um desconto' },
        { label: 'Caro comparado a quê?', correct: true },
        { label: 'Esse é o melhor preço de mercado' },
        { label: 'Vou falar com meu gerente' },
      ]},
      { text: 'Objeção mais comum em vendas B2B?', options: [
        { label: 'Falta de necessidade' },
        { label: 'Falta de orçamento agora', correct: true },
        { label: 'Concorrência mais barata' },
        { label: 'Empresa não conhecida' },
      ]},
      { text: '"Vou pensar" geralmente significa:', options: [
        { label: 'Vai realmente refletir' },
        { label: 'Falta clareza ou autoridade para decidir', correct: true },
        { label: 'Já decidiu pelo concorrente' },
        { label: 'Está sem tempo agora' },
      ]},
      { text: 'Técnica "feel-felt-found" começa com:', options: [
        { label: 'Discordar educadamente' },
        { label: 'Validar o sentimento do cliente', correct: true },
        { label: 'Apresentar provas sociais' },
        { label: 'Oferecer um desconto' },
      ]},
      { text: 'A melhor objeção é a que:', options: [
        { label: 'Não acontece' },
        { label: 'É verbalizada pelo cliente', correct: true },
        { label: 'O vendedor já adianta' },
        { label: 'É ignorada' },
      ]},
    ],
  },

  // ============== LIDERANÇA ==============
  {
    seedKey: 'lideranca-feedback',
    segment: QuizSegment.LIDERANCA,
    title: 'Feedback Eficaz',
    description: 'Princípios de feedback que constrói times.',
    questions: [
      { text: 'Modelo SCI de feedback significa:', options: [
        { label: 'Situação, Comportamento, Impacto', correct: true },
        { label: 'Sucesso, Conhecimento, Inovação' },
        { label: 'Surpresa, Crítica, Ideia' },
        { label: 'Sistema, Cultura, Inteligência' },
      ]},
      { text: 'Feedback corretivo deve ser dado preferencialmente:', options: [
        { label: 'Em público para servir de exemplo' },
        { label: 'Em particular e o quanto antes', correct: true },
        { label: 'Por escrito formal' },
        { label: 'Apenas na avaliação anual' },
      ]},
      { text: 'Erro mais comum ao dar feedback:', options: [
        { label: 'Dar feedback positivo' },
        { label: 'Generalizar e não ser específico', correct: true },
        { label: 'Pedir feedback de volta' },
        { label: 'Agendar 1:1 semanal' },
      ]},
      { text: 'Líder que pede feedback do time demonstra:', options: [
        { label: 'Fraqueza' }, { label: 'Insegurança' },
        { label: 'Maturidade e abertura', correct: true }, { label: 'Microgerenciamento' },
      ]},
      { text: 'Feedback positivo público + corretivo privado é princípio de:', options: [
        { label: 'Ken Blanchard', correct: true },
        { label: 'Peter Drucker' }, { label: 'Jim Collins' }, { label: 'Simon Sinek' },
      ]},
    ],
  },
  {
    seedKey: 'lideranca-situacional',
    segment: QuizSegment.LIDERANCA,
    title: 'Liderança Situacional',
    description: 'Modelo de Hersey & Blanchard.',
    questions: [
      { text: 'Os 4 estilos da Liderança Situacional são:', options: [
        { label: 'Direção, Coaching, Apoio, Delegação', correct: true },
        { label: 'Autocrático, Democrático, Liberal, Coercitivo' },
        { label: 'Tóxico, Tático, Técnico, Total' },
        { label: 'Visão, Voz, Velocidade, Vitória' },
      ]},
      { text: 'Liderado iniciante e motivado: estilo ideal?', options: [
        { label: 'Direção (E1)', correct: true }, { label: 'Coaching (E2)' },
        { label: 'Apoio (E3)' }, { label: 'Delegação (E4)' },
      ]},
      { text: 'Profissional sênior e autônomo merece:', options: [
        { label: 'Direção' }, { label: 'Coaching' },
        { label: 'Apoio' }, { label: 'Delegação', correct: true },
      ]},
      { text: 'O que define o estilo a aplicar?', options: [
        { label: 'A personalidade do líder' },
        { label: 'A maturidade do liderado para a tarefa', correct: true },
        { label: 'O setor da empresa' }, { label: 'O tamanho do time' },
      ]},
      { text: 'Liderança situacional ensina que o líder deve:', options: [
        { label: 'Manter um único estilo coerente' },
        { label: 'Adaptar o estilo a cada pessoa e situação', correct: true },
        { label: 'Sempre delegar' }, { label: 'Sempre dirigir' },
      ]},
    ],
  },

  // ============== FINANCEIRO ==============
  {
    seedKey: 'financeiro-fluxo-caixa',
    segment: QuizSegment.FINANCEIRO,
    title: 'Fluxo de Caixa Empresarial',
    description: 'Conceitos essenciais de fluxo de caixa.',
    questions: [
      { text: 'Fluxo de caixa é:', options: [
        { label: 'O lucro líquido do mês' },
        { label: 'A movimentação de entradas e saídas de dinheiro', correct: true },
        { label: 'O patrimônio da empresa' },
        { label: 'A receita bruta' },
      ]},
      { text: 'Capital de giro serve para:', options: [
        { label: 'Investir em ativos fixos' },
        { label: 'Sustentar a operação diária', correct: true },
        { label: 'Pagar dividendos' },
        { label: 'Comprar máquinas' },
      ]},
      { text: 'Empresa com lucro e sem caixa pode:', options: [
        { label: 'Continuar operando indefinidamente' },
        { label: 'Quebrar', correct: true },
        { label: 'Distribuir lucros' },
        { label: 'Crescer mais rápido' },
      ]},
      { text: 'Prazo médio de recebimento (PMR) ideal:', options: [
        { label: 'O maior possível' },
        { label: 'O menor possível', correct: true },
        { label: 'Igual ao do concorrente' },
        { label: 'Não importa' },
      ]},
      { text: 'EBITDA significa:', options: [
        { label: 'Lucro antes de juros, impostos, depreciação e amortização', correct: true },
        { label: 'Lucro líquido ajustado' },
        { label: 'Receita bruta total' },
        { label: 'Margem de contribuição' },
      ]},
    ],
  },
  {
    seedKey: 'financeiro-precificacao',
    segment: QuizSegment.FINANCEIRO,
    title: 'Precificação Estratégica',
    description: 'Como definir preços lucrativos.',
    questions: [
      { text: 'Markup é:', options: [
        { label: 'Imposto sobre a venda' },
        { label: 'Multiplicador aplicado sobre o custo para chegar ao preço', correct: true },
        { label: 'Margem de lucro líquida' },
        { label: 'Custo fixo mensal' },
      ]},
      { text: 'Margem de contribuição é:', options: [
        { label: 'Receita menos custos variáveis', correct: true },
        { label: 'Lucro líquido' },
        { label: 'Receita menos todos os custos' },
        { label: 'Imposto sobre vendas' },
      ]},
      { text: 'Ponto de equilíbrio é onde:', options: [
        { label: 'A empresa começa a lucrar' },
        { label: 'Receita = custos totais', correct: true },
        { label: 'O preço de venda é mínimo' },
        { label: 'O markup é zero' },
      ]},
      { text: 'Estratégia de preço por valor (value-based) considera:', options: [
        { label: 'Apenas o custo' },
        { label: 'O valor percebido pelo cliente', correct: true },
        { label: 'O preço do concorrente' },
        { label: 'A margem padrão do setor' },
      ]},
      { text: 'Erro mais comum em precificação:', options: [
        { label: 'Cobrar muito caro' },
        { label: 'Não considerar todos os custos', correct: true },
        { label: 'Dar desconto' },
        { label: 'Aumentar preço anualmente' },
      ]},
    ],
  },

  // ============== RH ==============
  {
    seedKey: 'rh-recrutamento',
    segment: QuizSegment.RH,
    title: 'Recrutamento & Seleção',
    description: 'Boas práticas em contratação.',
    questions: [
      { text: 'Entrevista por competências foca em:', options: [
        { label: 'Hipóteses sobre o futuro' },
        { label: 'Comportamentos passados do candidato', correct: true },
        { label: 'Testes técnicos' }, { label: 'Salário pretendido' },
      ]},
      { text: 'STAR é técnica para:', options: [
        { label: 'Avaliar performance' },
        { label: 'Estruturar respostas em entrevista (Situação, Tarefa, Ação, Resultado)', correct: true },
        { label: 'Definir metas' }, { label: 'Mapear processos' },
      ]},
      { text: 'Hard skill é:', options: [
        { label: 'Habilidade interpessoal' },
        { label: 'Conhecimento técnico mensurável', correct: true },
        { label: 'Característica de personalidade' }, { label: 'Habilidade de comunicação' },
      ]},
      { text: 'Maior custo de uma má contratação está em:', options: [
        { label: 'Salário pago' },
        { label: 'Tempo perdido + clima do time + retrabalho', correct: true },
        { label: 'Rescisão trabalhista' }, { label: 'Vale-transporte' },
      ]},
      { text: 'Cultural fit deve ser avaliado considerando:', options: [
        { label: 'Personalidade idêntica ao time' },
        { label: 'Alinhamento com valores e add-fit (o que adiciona)', correct: true },
        { label: 'Idade e formação' }, { label: 'Cidade de origem' },
      ]},
    ],
  },

  // ============== MARKETING ==============
  {
    seedKey: 'marketing-funil',
    segment: QuizSegment.MARKETING,
    title: 'Funil de Marketing & Vendas',
    description: 'Conceitos de funil e jornada do cliente.',
    questions: [
      { text: 'Topo de funil (ToFu) é a etapa de:', options: [
        { label: 'Decisão' }, { label: 'Atração e descoberta', correct: true },
        { label: 'Consideração' }, { label: 'Pós-venda' },
      ]},
      { text: 'Lead qualificado por marketing chama-se:', options: [
        { label: 'SQL' }, { label: 'MQL', correct: true },
        { label: 'PQL' }, { label: 'CTA' },
      ]},
      { text: 'CAC significa:', options: [
        { label: 'Custo de Atendimento ao Cliente' },
        { label: 'Custo de Aquisição de Cliente', correct: true },
        { label: 'Centro de Análise Comercial' },
        { label: 'Conversão Ativa de Cliente' },
      ]},
      { text: 'Relação saudável entre LTV e CAC:', options: [
        { label: '1:1' }, { label: '2:1' },
        { label: '3:1 ou maior', correct: true }, { label: '0,5:1' },
      ]},
      { text: 'Conteúdo de meio de funil tem objetivo de:', options: [
        { label: 'Atrair tráfego frio' },
        { label: 'Educar e gerar consideração', correct: true },
        { label: 'Fechar a venda' }, { label: 'Reativar churned' },
      ]},
    ],
  },

  // ============== PRODUTIVIDADE ==============
  {
    seedKey: 'produtividade-foco',
    segment: QuizSegment.PRODUTIVIDADE,
    title: 'Gestão do Tempo & Foco',
    description: 'Princípios de produtividade pessoal.',
    questions: [
      { text: 'Matriz de Eisenhower divide tarefas em:', options: [
        { label: 'Urgentes/Importantes', correct: true },
        { label: 'Fáceis/Difíceis' }, { label: 'Caras/Baratas' }, { label: 'Curtas/Longas' },
      ]},
      { text: 'Técnica Pomodoro clássica usa ciclos de:', options: [
        { label: '15 min foco / 5 min pausa' },
        { label: '25 min foco / 5 min pausa', correct: true },
        { label: '45 min foco / 15 min pausa' },
        { label: '60 min foco / 10 min pausa' },
      ]},
      { text: 'Lei de Parkinson diz que o trabalho:', options: [
        { label: 'Diminui com prazos curtos' },
        { label: 'Se expande para preencher o tempo disponível', correct: true },
        { label: 'Sempre atrasa' }, { label: 'É proporcional ao salário' },
      ]},
      { text: 'Maior ladrão de produtividade hoje é:', options: [
        { label: 'Reuniões' }, { label: 'Notificações e troca de contexto', correct: true },
        { label: 'Café' }, { label: 'Conversas no corredor' },
      ]},
      { text: 'GTD ("Getting Things Done") foi criado por:', options: [
        { label: 'Stephen Covey' }, { label: 'David Allen', correct: true },
        { label: 'Tim Ferriss' }, { label: 'Cal Newport' },
      ]},
    ],
  },
];

@Injectable()
export class QuizLibrarySeedService implements OnModuleInit {
  private readonly logger = new Logger(QuizLibrarySeedService.name);

  constructor(
    @InjectRepository(QuizLibraryTemplate) private readonly repo: Repository<QuizLibraryTemplate>,
  ) {}

  async onModuleInit() {
    if (process.env.QUIZ_LIBRARY_SEED === 'false') return;
    try {
      let created = 0;
      let updated = 0;
      for (const item of SEED) {
        const existing = await this.repo.findOne({ where: { seedKey: item.seedKey } });
        if (!existing) {
          await this.repo.save(this.repo.create({
            seedKey: item.seedKey,
            segment: item.segment,
            title: item.title,
            description: item.description,
            defaultTimeLimit: item.defaultTimeLimit ?? 20,
            questions: item.questions.map((q) => ({
              text: q.text,
              options: q.options.map((o) => ({ label: o.label, correct: !!o.correct })),
            })),
            active: true,
          }));
          created++;
        } else {
          await this.repo.update(existing.id, {
            segment: item.segment,
            title: item.title,
            description: item.description,
            defaultTimeLimit: item.defaultTimeLimit ?? existing.defaultTimeLimit,
            questions: item.questions.map((q) => ({
              text: q.text,
              options: q.options.map((o) => ({ label: o.label, correct: !!o.correct })),
            })),
          });
          updated++;
        }
      }
      this.logger.log(`[QuizLibrarySeed] criados=${created} atualizados=${updated}`);
    } catch (e: any) {
      this.logger.warn(`[QuizLibrarySeed] falhou: ${e.message}`);
    }
  }
}