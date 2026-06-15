import { Store, Briefcase, ShoppingBag, type LucideIcon } from "lucide-react";

/**
 * Landing Pages Dinâmicas (Captura & Conversão)
 * ---------------------------------------------
 * Fonte única de verdade das TRÊS telas de apresentação exibidas para
 * VISITANTES (não logados) que tentam acessar uma solução de negócio.
 *
 * Em vez de jogar o visitante para um login genérico ou uma tela de erro,
 * o Route Guard / Navbar o direciona para `/solucoes/:slug`, uma página
 * explicativa focada em conversão.
 *
 * - `slug`        → usado na rota `/solucoes/:slug`.
 * - `destination` → rota privada real para onde o usuário vai APÓS logar/cadastrar
 *                   (memória de intenção / deep link).
 * - `marketing`   → conteúdo dinâmico renderizado pela página única reaproveitável.
 */

export interface LandingMarketing {
  /** Nome curto da solução (chip / SEO). */
  name: string;
  /** Selo exibido acima do título. */
  badge: string;
  /** Título de impacto. Use `{highlight}` para destacar parte do texto. */
  title: string;
  /** Palavra/expressão destacada dentro do título. */
  highlight: string;
  /** Subtítulo de apoio. */
  subtitle: string;
  /** 3 a 4 benefícios curtos e objetivos. */
  benefits: string[];
  /** Texto do CTA primário. */
  primaryCta: string;
  /** Ícone ilustrativo. */
  icon: LucideIcon;
}

export interface LandingSolution {
  slug: string;
  /** Rota privada de destino pós-login. */
  destination: string;
  marketing: LandingMarketing;
}

export const LANDING_SOLUTIONS: LandingSolution[] = [
  {
    slug: "marketplace",
    destination: "/meus-anuncios",
    marketing: {
      name: "Marketplace",
      badge: "Marketplace Obra Link",
      title: "Venda para milhares de clientes no nosso {highlight}",
      highlight: "Marketplace",
      subtitle:
        "Anuncie materiais de construção e excedentes de obra para uma base ativa de compradores que já estão procurando exatamente o que você vende.",
      benefits: [
        "Apareça para milhares de compradores qualificados todos os dias",
        "Publique seus anúncios em poucos minutos, sem burocracia",
        "Receba contatos diretos de clientes interessados",
        "Destaque suas ofertas e venda muito mais rápido",
      ],
      primaryCta: "Criar conta grátis",
      icon: ShoppingBag,
    },
  },
  {
    slug: "prestar-servico",
    destination: "/cadastrar-profissional",
    marketing: {
      name: "Prestar Serviços",
      badge: "Para profissionais da construção",
      title: "Monetize suas habilidades {highlight}",
      highlight: "prestando serviços",
      subtitle:
        "Crie seu perfil profissional, ganhe visibilidade na plataforma e seja encontrado por quem realmente precisa do seu trabalho.",
      benefits: [
        "Perfil profissional verificado e mais confiável",
        "Receba contatos diretos de clientes da sua região",
        "Ganhe visibilidade nas buscas por especialidade",
        "Comece a captar novos projetos sem pagar comissão",
      ],
      primaryCta: "Começar agora",
      icon: Briefcase,
    },
  },
  {
    slug: "criar-loja",
    destination: "/painel-loja",
    marketing: {
      name: "Crie sua Loja",
      badge: "Para lojas, depósitos e empreiteiros",
      title: "Crie a vitrine digital da sua empresa e {highlight}",
      highlight: "venda mais",
      subtitle:
        "Monte uma loja completa no Obra Link, exiba seu catálogo de produtos e apareça em destaque nas buscas do marketplace.",
      benefits: [
        "Vitrine profissional com a marca da sua empresa",
        "Gestão completa de produtos, preços e estoque",
        "Destaque nas buscas e mais clientes encontrando você",
        "Painel com o desempenho da sua loja em tempo real",
      ],
      primaryCta: "Criar minha loja grátis",
      icon: Store,
    },
  },
];

/** Busca os metadados de uma landing page pelo slug. */
export function getLandingBySlug(slug?: string): LandingSolution | undefined {
  return LANDING_SOLUTIONS.find((s) => s.slug === slug);
}

/** Caminho da landing page de uma solução. */
export function landingPath(slug: string): string {
  return `/solucoes/${slug}`;
}
