export interface BlogPostData {
  id: number;
  slug: string;
  categoria: string;
  tipo: string;
  titulo: string;
  resumo: string;
  conteudo: string;
  autor: string;
  data: string;
  tempoLeitura: string;
  destaque: boolean;
  imagem: string;
}

export const BLOG_POSTS: BlogPostData[] = [
  {
    id: 1,
    slug: "como-otimizar-cronograma-obra",
    titulo: "Como otimizar o cronograma da sua obra",
    categoria: "Gestão de Obras",
    tipo: "Guia Prático",
    resumo: "Dicas práticas para otimizar o cronograma e evitar atrasos.",
    autor: "Engenheiro Silva",
    data: "15/05/2026",
    tempoLeitura: "8 min",
    destaque: true,
    imagem: "https://via.placeholder.com/800x400?text=Cronograma",
    conteudo: `
      <h2>Introdução</h2>
      <p>O cronograma é o coração de qualquer obra. Um cronograma bem estruturado pode economizar até 30% dos custos e evitar atrasos significativos.</p>

      <h2>1. Divida o projeto em fases menores</h2>
      <p>Em vez de trabalhar com blocos grandes de tempo, divida o projeto em fases menores e controláveis:</p>
      <ul>
        <li>Fundação (7-10 dias)</li>
        <li>Estrutura (15-20 dias)</li>
        <li>Acabamentos (30-40 dias)</li>
      </ul>

      <h2>2. Identifique o caminho crítico</h2>
      <p>Utilize técnicas como PERT (Program Evaluation and Review Technique) para identificar quais atividades são críticas e não podem ter atrasos.</p>

      <h2>3. Considere buffers de tempo</h2>
      <p>Adicione 10-15% de tempo extra para contingências. Isso evita que pequenos atrasos se tornem problemas maiores.</p>

      <h2>4. Use ferramentas de gestão</h2>
      <p>Plataformas como Microsoft Project, Asana, Monday.com e até planilhas bem estruturadas ajudam a acompanhar o progresso em tempo real.</p>

      <h2>5. Comunique com a equipe regularmente</h2>
      <p>Reuniões semanais para revisar o cronograma e ajustar conforme necessário.</p>

      <h2>Conclusão</h2>
      <p>Um cronograma bem otimizado é a chave para o sucesso de qualquer obra. Invista tempo planejando e você economizará tempo executando.</p>
    `
  },
  {
    id: 2,
    slug: "tendencias-bim-2026",
    titulo: "Tendências em BIM para 2026",
    categoria: "Tecnologia BIM",
    tipo: "Tendência",
    resumo: "As principais tendências de BIM que vão dominar o mercado.",
    autor: "Arquiteto Costa",
    data: "12/05/2026",
    tempoLeitura: "6 min",
    destaque: true,
    imagem: "https://via.placeholder.com/800x400?text=BIM",
    conteudo: `
      <h2>O que é BIM e por que é importante?</h2>
      <p>Building Information Modeling (BIM) revolucionou a forma como projetamos e construímos edifícios. Em 2026, essas tendências devem dominar:</p>

      <h2>1. IA integrada ao BIM</h2>
      <p>Inteligência artificial está sendo integrada para detectar conflitos automaticamente, otimizar recursos e prever custos com maior precisão.</p>

      <h2>2. BIM em nuvem</h2>
      <p>Colaboração em tempo real com equipes distribuídas globalmente será a norma, não exceção.</p>

      <h2>3. BIM e sustentabilidade</h2>
      <p>Análise de ciclo de vida dos materiais e otimização de consumo de energia diretamente no modelo 3D.</p>

      <h2>4. Realidade aumentada (AR) em canteiros</h2>
      <p>Visualizar o projeto final diretamente no celular no local da obra será rotina.</p>

      <h2>5. Integração com IoT</h2>
      <p>Sensores conectados ao modelo BIM permitirão monitoramento em tempo real da construção.</p>

      <h2>Conclusão</h2>
      <p>BIM é mais que uma ferramenta; é uma metodologia que transforma a indústria da construção. Ficar atualizado nessas tendências é essencial para não ficar para trás.</p>
    `
  },
  {
    id: 3,
    slug: "gestao-suprimentos-grandes-obras",
    titulo: "Gestão de suprimentos em grandes obras",
    categoria: "Suprimentos",
    tipo: "Artigo Técnico",
    resumo: "Sistema eficiente para controlar suprimentos em projetos grandes.",
    autor: "Gerenciador Oliveira",
    data: "10/05/2026",
    tempoLeitura: "10 min",
    destaque: false,
    imagem: "https://via.placeholder.com/800x400?text=Suprimentos",
    conteudo: `
      <h2>Introdução</h2>
      <p>A gestão inadequada de suprimentos pode aumentar os custos da obra em até 40%. Este artigo apresenta estratégias comprovadas.</p>

      <h2>1. Mapeamento de fornecedores</h2>
      <p>Crie uma base de dados com pelo menos 3 fornecedores para cada material crítico. Isso garante opções e negocia melhores preços.</p>

      <h2>2. Previsão de demanda</h2>
      <p>Utilize dados históricos e o cronograma para prever quando cada material será necessário. Antecipe compras de itens com longo tempo de entrega.</p>

      <h2>3. Controle de estoque</h2>
      <p>Mantenha estoque mínimo mas eficiente. Muito estoque consome recursos; pouco causa atrasos.</p>

      <h2>4. Negociação de preços</h2>
      <p>Compre em volume, solicite descontos por pagamento à vista e estabeleça parcerias de longo prazo.</p>

      <h2>5. Rastreamento de materiais</h2>
      <p>Implemente sistemas de código de barras ou RFID para rastrear materiais do fornecedor até o ponto de uso.</p>

      <h2>6. Qualidade garantida</h2>
      <p>Inspecione cada entrega. Materiais com defeito podem inutilizar dias de trabalho.</p>

      <h2>Conclusão</h2>
      <p>Uma gestão eficiente de suprimentos é fundamental para manter a obra dentro do cronograma e orçamento.</p>
    `
  },
  {
    id: 4,
    slug: "sinapi-guia-completo",
    titulo: "SINAPI - Guia completo para orçamentistas",
    categoria: "Produtividade",
    tipo: "Artigo Técnico",
    resumo: "Tudo que você precisa saber sobre SINAPI e como utilizá-lo corretamente.",
    autor: "Especialista em Orçamentação",
    data: "08/05/2026",
    tempoLeitura: "12 min",
    destaque: false,
    imagem: "https://via.placeholder.com/800x400?text=SINAPI",
    conteudo: `
      <h2>O que é SINAPI?</h2>
      <p>SINAPI (Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil) é o banco de dados oficial de preços e custos de construção no Brasil, mantido pela Caixa Econômica Federal.</p>

      <h2>Por que usar SINAPI?</h2>
      <ul>
        <li>Preços baseados em pesquisas reais de mercado</li>
        <li>Aceito por órgãos públicos e financeiras</li>
        <li>Atualizado regularmente</li>
        <li>Cobertura nacional com variações regionais</li>
      </ul>

      <h2>Como acessar SINAPI?</h2>
      <p>SINAPI está disponível em www.caixa.gov.br. Você pode baixar a tabela completa em Excel ou acessar via API.</p>

      <h2>Estrutura de dados SINAPI</h2>
      <p>Cada item SINAPI contém: código, descrição, unidade, preço material, preço mão de obra, BDI e composições.</p>

      <h2>Dicas de uso</h2>
      <ol>
        <li>Sempre use a versão atualizada (mês/ano correto)</li>
        <li>Considere ajustes regionais de preço</li>
        <li>Aplique BDI adequado ao tipo de obra</li>
        <li>Decomponha itens em seus insumos básicos</li>
      </ol>

      <h2>Conclusão</h2>
      <p>Dominar SINAPI é essencial para orçamentistas modernos. A precisão dos orçamentos impacta diretamente a viabilidade dos projetos.</p>
    `
  },
];