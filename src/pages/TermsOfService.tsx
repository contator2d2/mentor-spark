import React from "react";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Termos de Serviço</h1>
        
        <div className="space-y-4 text-muted-foreground">
          <p>
            Ao utilizar o Mentor Gleego, você concorda com os seguintes termos e condições. Leia-os atentamente.
          </p>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar ou usar nossa plataforma, você concorda em cumprir estes Termos de Serviço e todas as leis
              e regulamentos aplicáveis.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">2. Uso da Plataforma</h2>
            <p>
              A plataforma destina-se a facilitar mentorias e gestão de alunos. Você é responsável por manter a
              confidencialidade de sua conta e senha.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">3. Conduta do Usuário</h2>
            <p>
              Você concorda em não usar a plataforma para fins ilegais ou que violem os direitos de terceiros.
              Respeito e profissionalismo são fundamentais na comunidade Mentor Gleego.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">4. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo e software da plataforma são de propriedade do Mentor Gleego ou de seus licenciadores,
              protegidos por leis de direitos autorais.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">5. Limitação de Responsabilidade</h2>
            <p>
              O Mentor Gleego não será responsável por quaisquer danos indiretos, incidentais ou punitivos decorrentes
              do uso ou incapacidade de usar o serviço.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">6. Alterações nos Termos</h2>
            <p>
              Reservamo-nos o direito de modificar estes termos a qualquer momento. O uso continuado da plataforma
              após alterações constitui aceitação dos novos termos.
            </p>
          </section>

          <p className="pt-4 text-sm">Última atualização: 30 de maio de 2026</p>
        </div>

        <div className="pt-8">
          <a href="/" className="text-primary hover:underline">Voltar para a página inicial</a>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
