import { Store, Briefcase, ShoppingBag, type LucideIcon } from "lucide-react";
import type { SignupAccountHint } from "@/lib/authFeedback";

export interface LandingMarketing {
  name: string;
  badge: string;
  title: string;
  highlight: string;
  subtitle: string;
  benefits: string[];
  primaryCta: string;
  icon: LucideIcon;
}

export interface LandingSolution {
  slug: string;
  destination: string;
  signupAccountHint?: SignupAccountHint;
  marketing: LandingMarketing;
}

export const LANDING_SOLUTIONS: LandingSolution[] = [
  {
    slug: "marketplace",
    destination: "/marketplace",
    marketing: {
      name: "Marketplace",
      badge: "Marketplace Obra Link",
      title: "Encontre materiais e fornecedores no nosso {highlight}",
      highlight: "Marketplace",
      subtitle:
        "Acesse um ambiente com lojas, produtos e oportunidades da construcao civil para comparar ofertas com mais velocidade e centralizar suas compras.",
      benefits: [
        "Pesquise materiais, excedentes e lojas em um unico lugar",
        "Compare opcoes com mais velocidade para decidir melhor",
        "Descubra fornecedores e parceiros alinhados com a sua obra",
        "Centralize a jornada de compra dentro da plataforma",
      ],
      primaryCta: "Liberar acesso ao marketplace",
      icon: ShoppingBag,
    },
  },
  {
    slug: "prestar-servico",
    destination: "/cadastrar-profissional",
    signupAccountHint: "PF",
    marketing: {
      name: "Prestar Servicos",
      badge: "Para profissionais da construcao",
      title: "Monetize suas habilidades {highlight}",
      highlight: "prestando servicos",
      subtitle:
        "Crie seu perfil profissional, ganhe visibilidade na plataforma e seja encontrado por quem realmente precisa do seu trabalho.",
      benefits: [
        "Perfil profissional verificado e mais confiavel",
        "Receba contatos diretos de clientes da sua regiao",
        "Ganhe visibilidade nas buscas por especialidade",
        "Comece a captar novos projetos sem pagar comissao",
      ],
      primaryCta: "Comecar agora",
      icon: Briefcase,
    },
  },
  {
    slug: "criar-loja",
    destination: "/painel-loja",
    signupAccountHint: "PJ",
    marketing: {
      name: "Crie sua Loja",
      badge: "Para lojas, depositos e empreiteiros",
      title: "Crie a vitrine digital da sua empresa e {highlight}",
      highlight: "venda mais",
      subtitle:
        "Monte uma loja completa no Obra Link, exiba seu catalogo de produtos e apareca em destaque nas buscas do marketplace.",
      benefits: [
        "Vitrine profissional com a marca da sua empresa",
        "Gestao completa de produtos, precos e estoque",
        "Destaque nas buscas e mais clientes encontrando voce",
        "Painel com o desempenho da sua loja em tempo real",
      ],
      primaryCta: "Criar minha loja gratis",
      icon: Store,
    },
  },
];

export function getLandingBySlug(slug?: string): LandingSolution | undefined {
  return LANDING_SOLUTIONS.find((solution) => solution.slug === slug);
}

export function landingPath(slug: string): string {
  return `/solucoes/${slug}`;
}
