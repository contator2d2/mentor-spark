No momento, a edição de demandas (como alterar o título, descrição ou prazo após a criação) não está visível na interface de detalhes. Vou implementar um botão de edição que abre um modal com o mesmo formulário da criação, permitindo que você atualize as informações da demanda.

### Alterações propostas:
- **No Frontend (`src/pages/app/DemandDetailPage.tsx`):**
    - Adicionar um estado para controlar a abertura do modal de edição.
    - Implementar um modal (`Dialog`) contendo o formulário de edição (Título, Departamento, Tipo, Prioridade, Descrição, Objetivo, Prazo e Responsáveis).
    - Adicionar um botão de "Editar" (ícone de lápis) no cabeçalho da demanda.
    - Criar a função `handleUpdateDemand` para enviar os dados atualizados para o backend via `PATCH /demands/:id`.
- **Componentes UI:**
    - Utilizar os componentes já existentes (`Input`, `Textarea`, `Select`, `Popover`) para manter a consistência visual.

### Detalhes Técnicos:
- O modal será pré-preenchido com os dados atuais da demanda.
- A função de salvamento utilizará a rota `PATCH /demands/${id}`, que já é suportada pelo backend (conforme evidenciado pelo uso em outras partes do código para mudar status).
- Responsáveis serão selecionáveis via o mesmo componente de `Popover` e `Checkbox` usado na tela de criação.

Assim que aprovado, implementarei essas melhorias para que você possa ajustar suas demandas conforme necessário.