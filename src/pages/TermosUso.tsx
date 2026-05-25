import { LegalLayout, LegalSection } from "@/components/institutional/LegalLayout";

// 📝 Substitua pelos textos jurídicos reais
const ULTIMA_ATUALIZACAO = "25 de maio de 2026";

const SECOES: LegalSection[] = [
  {
    title: "Aceitação dos Termos",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ao acessar e utilizar a plataforma Obra Link, você concorda integralmente com estes Termos de Uso. Caso não concorde com qualquer disposição, recomendamos não utilizar nossos serviços. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  },
  {
    title: "Descrição do Serviço",
    body: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. O Obra Link é uma plataforma SaaS de automação de orçamentos de obras, oferecendo análise de plantas por inteligência artificial, integração com bases SINAPI e ferramentas de gestão de projeto.",
  },
  {
    title: "Cadastro e Conta de Usuário",
    body: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. O usuário é responsável por manter a confidencialidade de suas credenciais e por todas as atividades realizadas em sua conta. Excepteur sint occaecat cupidatat non proident.",
  },
  {
    title: "Uso Permitido",
    body: "Sunt in culpa qui officia deserunt mollit anim id est laborum. É vedado utilizar a plataforma para fins ilegais, violar direitos de terceiros, realizar engenharia reversa, ou inserir conteúdo malicioso. Reservamo-nos o direito de suspender contas em caso de violação.",
  },
  {
    title: "Planos e Pagamentos",
    body: "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium. Os valores, formas de pagamento e condições de renovação dos planos pagos estão descritos na página de assinatura. Cancelamentos podem ser feitos a qualquer momento, com efeito ao fim do ciclo vigente.",
  },
  {
    title: "Propriedade Intelectual",
    body: "Totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Toda a tecnologia, marca, layout e código-fonte do Obra Link são de propriedade exclusiva da empresa. Os dados inseridos por você permanecem de sua propriedade.",
  },
  {
    title: "Limitação de Responsabilidade",
    body: "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit. Os orçamentos gerados pela IA são estimativas e devem ser validados por profissional habilitado. O Obra Link não se responsabiliza por decisões tomadas exclusivamente com base nos resultados automatizados.",
  },
  {
    title: "Alterações nos Termos",
    body: "Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit. Reservamo-nos o direito de modificar estes termos a qualquer momento, mediante aviso prévio através da plataforma ou e-mail cadastrado.",
  },
  {
    title: "Foro e Legislação Aplicável",
    body: "Sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de São Paulo/SP para dirimir eventuais controvérsias.",
  },
  {
    title: "Contato",
    body: "Para dúvidas, sugestões ou solicitações relacionadas a estes Termos de Uso, entre em contato pelo e-mail: contato@obralink.com.br.",
  },
];

export default function TermosUso() {
  return (
    <LegalLayout
      title="Termos de Uso"
      subtitle="Condições gerais para utilização da plataforma Obra Link."
      lastUpdated={ULTIMA_ATUALIZACAO}
      sections={SECOES}
    />
  );
}
