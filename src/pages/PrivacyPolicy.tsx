import React from "react";
import { useBranding } from "@/contexts/BrandingContext";

const PrivacyPolicy = () => {
  const { brand } = useBranding();
  const name = brand?.brandName || "Plataforma";

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Política de Privacidade</h1>
        
        <div className="space-y-4 text-muted-foreground">
          <p>
            Bem-vindo ao {name}. Sua privacidade é muito importante para nós. Esta política descreve como
            coletamos, usamos e protegemos suas informações pessoais.
          </p>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">1. Coleta de Informações</h2>
            <p>
              Coletamos informações que você nos fornece diretamente ao criar uma conta, usar nossa plataforma
              ou entrar em contato com o suporte. Isso inclui nome, e-mail e dados de perfil.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">2. Uso das Informações</h2>
            <p>
              Usamos seus dados para fornecer, manter e melhorar nossos serviços, além de personalizar sua
              experiência como mentor ou mentorado.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">3. Compartilhamento de Dados</h2>
            <p>
              Não vendemos seus dados pessoais. Podemos compartilhar informações com prestadores de serviços
              necessários para operar a plataforma (como hospedagem e autenticação).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">4. Segurança</h2>
            <p>
              Implementamos medidas técnicas e organizacionais para proteger seus dados contra acesso não autorizado
              ou perda.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">5. Seus Direitos</h2>
            <p>
              Você tem o direito de acessar, corrigir ou excluir seus dados pessoais a qualquer momento através das
              configurações da sua conta.
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

export default PrivacyPolicy;