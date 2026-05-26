// Estrutura central de FAQs do Obra Link
// Mantenha aqui todas as perguntas. Edite/integre com API no futuro sem tocar nas telas.

export type FaqItem = {
  q: string;
  a: string;
};

export type FaqCategory = {
  id: string;
  title: string;
  description?: string;
  items: FaqItem[];
};

// ─── LANDING PAGE ────────────────────────────────────────────────
// Foco em conversão: 4-6 perguntas que quebram objeções de cadastro.
export const landingFaq: FaqItem[] = [
  {
    q: "Como funciona o Obra Link na prática?",
    a: "Você envia a planta da obra (PDF, imagem ou DWG) e nossa IA gera em minutos um orçamento detalhado com quantitativos, preços SINAPI da sua região, cronograma e memorial descritivo — pronto para apresentar ao cliente.",
  },
  {
    q: "Para quem é indicado?",
    a: "Construtoras, engenheiros, arquitetos, mestres de obra e profissionais autônomos que querem orçar mais rápido, fechar mais contratos e parar de perder fim de semana montando planilha no Excel.",
  },
  {
    q: "Quanto tempo eu economizo?",
    a: "Um orçamento que levaria 2 a 5 dias manualmente fica pronto em menos de 10 minutos. Profissionais nossos relatam até 80% de redução no tempo de elaboração, com mais precisão e padronização.",
  },
  {
    q: "É seguro? Meus projetos ficam protegidos?",
    a: "Sim. Toda comunicação é criptografada (TLS/SSL), seus arquivos ficam em servidores isolados e seguimos a LGPD. Apenas você acessa seus projetos — nada é compartilhado sem sua autorização.",
  },
  {
    q: "Preciso pagar para testar?",
    a: "Não. Você faz seu cadastro gratuitamente e tem análises de cortesia para validar a ferramenta com uma obra real antes de assinar qualquer plano. Sem cartão de crédito.",
  },
  {
    q: "Como solicito meu acesso?",
    a: "Clique em \"Solicitar acesso\" no topo da página, preencha seus dados em 2 minutos e nossa equipe libera seu ambiente em até 1 dia útil, já com onboarding personalizado.",
  },
];

// ─── CENTRAL DE AJUDA (APP) ──────────────────────────────────────
// Categorizado para navegação e busca.
export const helpCenterFaq: FaqCategory[] = [
  {
    id: "cadastro-acesso",
    title: "Cadastro e Acesso",
    description: "Como começar, criar sua conta e gerenciar seu login.",
    items: [
      {
        q: "Como solicito meu acesso à plataforma?",
        a: "Acesse a página inicial, clique em 'Solicitar acesso' e preencha o formulário com seus dados profissionais. Nossa equipe libera seu ambiente em até 1 dia útil.",
      },
      {
        q: "Posso cadastrar como Pessoa Física e Pessoa Jurídica?",
        a: "Sim. Na tela de cadastro existe um seletor no topo. Escolha PF para autônomos (com CPF) ou PJ para empresas (com CNPJ e Inscrição Estadual).",
      },
      {
        q: "Esqueci minha senha. Como recupero?",
        a: "Na tela de login, clique em 'Esqueci minha senha'. Você receberá um e-mail com link de redefinição válido por 1 hora.",
      },
      {
        q: "Posso ter mais de um usuário na mesma conta?",
        a: "Sim. Planos empresariais permitem múltiplos usuários com diferentes níveis de permissão (admin, usuário comum). Fale com o suporte para configurar.",
      },
      {
        q: "Como altero meus dados cadastrais?",
        a: "Acesse 'Perfil' no menu superior, ajuste os campos desejados e salve. CPF/CNPJ exigem confirmação por e-mail por segurança.",
      },
    ],
  },
  {
    id: "funcionalidades",
    title: "Funcionalidades",
    description: "Tudo sobre análises, orçamentos, cronograma e memorial.",
    items: [
      {
        q: "Quais formatos de planta são suportados?",
        a: "Aceitamos PDF, JPG, PNG e DWG. Limite de 50MB para DWG e 20MB para os demais formatos. Plantas em escala e boa resolução geram resultados mais precisos.",
      },
      {
        q: "Como funciona a integração com o SINAPI?",
        a: "Você faz upload da planilha oficial do SINAPI da sua região. A IA vincula cada insumo identificado ao código SINAPI mais próximo por similaridade de descrição.",
      },
      {
        q: "Qual a margem de precisão da análise?",
        a: "Com escala definida e área informada, a precisão fica entre 85-95%. Sem escala, a margem de erro pode chegar a 30%. Recomendamos calibração manual sempre que possível.",
      },
      {
        q: "Como funciona o BDI configurável?",
        a: "Você define os percentuais de administração central, lucro, impostos e outros encargos. O BDI é aplicado automaticamente sobre o custo direto de cada item.",
      },
      {
        q: "Posso editar o orçamento gerado pela IA?",
        a: "Sim. Toda linha do orçamento é editável: quantidade, preço unitário, descrição e categoria. As alterações ficam versionadas para auditoria.",
      },
      {
        q: "Como compartilho o orçamento com o cliente?",
        a: "Cada análise gera um link público (/share/:id) que mostra o orçamento simplificado, sem expor dados sensíveis. Você também pode exportar em PDF ou Excel.",
      },
      {
        q: "Posso usar para obras de grande porte?",
        a: "Sim. O sistema suporta múltiplos pavimentos e diversas tipologias. Para obras muito complexas, recomendamos dividir a análise por etapas ou blocos.",
      },
      {
        q: "O cronograma Gantt é editável?",
        a: "Sim. As datas iniciais são estimadas pela IA com base na área (m²) e tipologia, mas você pode arrastar e ajustar cada etapa conforme sua realidade de obra.",
      },
    ],
  },
  {
    id: "marketplace",
    title: "Marketplace e Profissionais",
    description: "Compra de materiais, lojistas parceiros e prestadores de serviço.",
    items: [
      {
        q: "Como funciona o Marketplace de materiais?",
        a: "A partir do orçamento gerado, você visualiza lojistas parceiros da sua região com preços e disponibilidade reais. Pode cotar direto pelo sistema.",
      },
      {
        q: "Sou lojista. Como recebo cotações?",
        a: "Sempre que uma obra na sua região (dentro do raio de atuação configurado) gerar uma lista compatível com seu catálogo, você recebe notificação no painel e no WhatsApp.",
      },
      {
        q: "Como os profissionais são validados?",
        a: "Cada prestador preenche cadastro detalhado com especialidade, referências e documentação. Construtoras avaliam o serviço após a conclusão, gerando reputação pública.",
      },
      {
        q: "Como faço para virar parceiro lojista?",
        a: "Acesse 'Seja Parceiro' no menu, preencha o formulário com dados da loja e nosso time comercial entra em contato em até 2 dias úteis.",
      },
    ],
  },
  {
    id: "planos-pagamento",
    title: "Planos e Pagamento",
    description: "Assinatura, cobrança, notas fiscais e cancelamento.",
    items: [
      {
        q: "Quantas análises posso fazer gratuitamente?",
        a: "As primeiras análises são gratuitas, sem cartão de crédito. Após isso, oferecemos planos mensais e anuais com diferentes volumes de processamento.",
      },
      {
        q: "Os planos têm fidelidade ou multa de cancelamento?",
        a: "Não. Você pode cancelar ou pausar a assinatura a qualquer momento, sem taxas ocultas. Acreditamos no valor que entregamos.",
      },
      {
        q: "Quais formas de pagamento são aceitas?",
        a: "Cartão de crédito (todas as bandeiras), boleto bancário e Pix. Para planos anuais oferecemos parcelamento em até 12x sem juros.",
      },
      {
        q: "Como emito a nota fiscal?",
        a: "As notas são emitidas automaticamente a cada cobrança e enviadas no e-mail cadastrado. Também ficam disponíveis em 'Perfil > Faturas'.",
      },
    ],
  },
  {
    id: "suporte-tecnico",
    title: "Suporte Técnico",
    description: "Erros, lentidão, integrações e ajuda com a plataforma.",
    items: [
      {
        q: "Minha análise travou ou demorou demais. O que fazer?",
        a: "Análises normais levam de 2 a 10 minutos. Se passou de 20 minutos, recarregue a página — o resultado costuma estar pronto. Persistindo, abra um chamado no suporte.",
      },
      {
        q: "A IA não identificou bem os ambientes. Como melhorar?",
        a: "Garanta que a planta esteja em escala correta, com áreas legíveis e legenda visível. Plantas escaneadas tortas ou de baixa resolução prejudicam a leitura.",
      },
      {
        q: "Quais navegadores são compatíveis?",
        a: "Chrome, Edge, Firefox e Safari nas versões mais recentes. Recomendamos Chrome para melhor desempenho em projetos grandes.",
      },
      {
        q: "Posso usar pelo celular?",
        a: "Sim. A plataforma é responsiva. Para análises pesadas e edição de orçamento, recomendamos desktop ou tablet em modo paisagem.",
      },
    ],
  },
  {
    id: "privacidade-seguranca",
    title: "Privacidade e Segurança",
    description: "Como protegemos seus dados, projetos e informações dos clientes.",
    items: [
      {
        q: "Meus dados e plantas ficam seguros?",
        a: "Sim. Comunicação criptografada (TLS/SSL), dados em servidores isolados, backup diário e conformidade total com a LGPD.",
      },
      {
        q: "Vocês compartilham meus projetos com terceiros?",
        a: "Nunca. Seus arquivos só são acessados por você e por usuários autorizados na sua conta. Não vendemos nem cedemos dados a parceiros comerciais.",
      },
      {
        q: "Como exerço meus direitos pela LGPD?",
        a: "Solicite acesso, correção ou exclusão dos seus dados pelo e-mail do nosso encarregado (DPO), disponível na Política de Privacidade. Respondemos em até 15 dias.",
      },
      {
        q: "Posso excluir minha conta e tudo o que enviei?",
        a: "Sim. Em 'Perfil > Encerrar conta', você solicita a exclusão definitiva. Removemos todos os seus dados em até 30 dias, salvo obrigação legal de retenção.",
      },
    ],
  },
];
