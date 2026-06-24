import { lazy, type LazyExoticComponent, type ComponentType } from "react";
import {
  FolderKanban,
  ScanLine,
  FileText,
  User,
  Store,
  Megaphone,
  Briefcase,
  type LucideIcon,
} from "lucide-react";
import type { SignupAccountHint } from "@/lib/authFeedback";

/**
 * Arquitetura de Navegação Condicional
 * ------------------------------------
 * Este arquivo é a ÚNICA fonte de verdade das "Soluções Internas" (área privada).
 *
 * - `path`        → rota usada no React Router.
 * - `slug`        → identificador estável usado na Tela de Bloqueio (`/recurso/:slug`).
 * - `component`   → carregado via React.lazy, então o código das telas privadas
 *                   só é baixado quando o usuário logado realmente acessa a rota
 *                   (isolamento de código por segurança).
 * - `marketing`   → conteúdo da Tela de Explicação exibida para visitantes.
 */

export interface SolutionMarketing {
  /** Título curto da solução (ex.: "Gestão de Projetos"). */
  name: string;
  /** Frase de impacto exibida no topo da tela de bloqueio. */
  tagline: string;
  /** Parágrafo explicando o valor do recurso. */
  description: string;
  /** Lista de benefícios destacados. */
  benefits: string[];
  /** Ícone ilustrativo. */
  icon: LucideIcon;
}

export interface SolutionRoute {
  slug: string;
  path: string;
  signupAccountHint?: SignupAccountHint;
  /** Componente da tela privada (lazy). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: LazyExoticComponent<ComponentType<any>>;
  marketing: SolutionMarketing;
}

// ── Telas privadas (carregadas sob demanda) ──────────────────────────────
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const NovaAnalise = lazy(() => import("@/pages/NovaAnalise"));
const AnaliseResultado = lazy(() => import("@/pages/AnaliseResultado"));
const NotasFiscais = lazy(() => import("@/pages/NotasFiscais"));
const Perfil = lazy(() => import("@/pages/Perfil"));
const CadastrarProfissional = lazy(() => import("@/pages/CadastrarProfissional"));
const PainelLojista = lazy(() => import("@/pages/PainelLojista"));
const MeusAnuncios = lazy(() => import("@/pages/MeusAnuncios"));

/**
 * Mapa de Soluções Internas.
 * A ordem aqui também define a ordem nos menus.
 */
export const SOLUTION_ROUTES: SolutionRoute[] = [
  {
    slug: "gestao-de-projetos",
    path: "/dashboard",
    component: Dashboard,
    marketing: {
      name: "Gestão de Projetos",
      tagline: "Todos os seus orçamentos e obras em um só painel",
      description:
        "Centralize análises, custos e cronogramas. Acompanhe o andamento de cada projeto com indicadores em tempo real e histórico completo de versões.",
      benefits: [
        "Painel com KPIs financeiros e de produtividade",
        "Histórico e versionamento de todas as análises",
        "Alertas inteligentes de risco e atraso",
      ],
      icon: FolderKanban,
    },
  },
  {
    slug: "nova-analise",
    path: "/nova-analise",
    component: NovaAnalise,
    marketing: {
      name: "Análise de Plantas com IA",
      tagline: "De 3 dias para 5 minutos no levantamento de quantitativos",
      description:
        "Envie sua planta em PDF, imagem ou DWG e deixe a IA identificar elementos construtivos, conciliar com a SINAPI e gerar um orçamento completo.",
      benefits: [
        "Visão computacional Gemini 2.5 Pro",
        "Conciliação automática com a tabela SINAPI regional",
        "Orçamento + memorial + cronograma gerados em minutos",
      ],
      icon: ScanLine,
    },
  },
  {
    slug: "analise",
    path: "/analise/:id",
    component: AnaliseResultado,
    marketing: {
      name: "Resultado da Análise",
      tagline: "Orçamentos rastreáveis, item por item",
      description:
        "Visualize o orçamento gerado com memória de cálculo completa, edite quantitativos e exporte em PDF ou Excel.",
      benefits: [
        "Memória de cálculo transparente por linha",
        "Edição assistida de quantitativos",
        "Exportação em PDF, Excel e link do cliente",
      ],
      icon: FileText,
    },
  },
  {
    slug: "notas-fiscais",
    path: "/notas-fiscais",
    component: NotasFiscais,
    marketing: {
      name: "Notas Fiscais (OCR)",
      tagline: "Extraia itens e valores de NFs automaticamente",
      description:
        "Faça upload das notas fiscais da obra e a IA extrai fornecedores, itens e valores para o controle de custos real.",
      benefits: [
        "Extração automática via OCR inteligente",
        "Controle de custos planejado x realizado",
        "Organização por fornecedor e categoria",
      ],
      icon: FileText,
    },
  },
  {
    slug: "perfil",
    path: "/perfil",
    component: Perfil,
    marketing: {
      name: "Configurações do Perfil",
      tagline: "Gerencie seus dados e preferências",
      description:
        "Acesse e atualize as informações da sua conta, dados profissionais e preferências da plataforma.",
      benefits: [
        "Dados pessoais e profissionais",
        "Preferências e segurança da conta",
        "Gestão do tipo de conta (CPF/CNPJ)",
      ],
      icon: User,
    },
  },
  {
    slug: "cadastrar-profissional",
    path: "/cadastrar-profissional",
    signupAccountHint: "PF",
    component: CadastrarProfissional,
    marketing: {
      name: "Prestar Serviços",
      tagline: "Receba contatos de novos clientes",
      description:
        "Cadastre seu perfil profissional e seja encontrado por quem precisa dos seus serviços na construção civil.",
      benefits: [
        "Perfil profissional verificado",
        "Contatos diretos de clientes",
        "Mais visibilidade na plataforma",
      ],
      icon: Briefcase,
    },
  },
  {
    slug: "painel-loja",
    path: "/painel-loja",
    signupAccountHint: "PJ",
    component: PainelLojista,
    marketing: {
      name: "Gerenciar Minha Loja",
      tagline: "Sua vitrine de materiais no marketplace",
      description:
        "Crie e gerencie a loja da sua empresa, cadastre produtos e apareça em destaque nas buscas do marketplace.",
      benefits: [
        "Vitrine profissional para sua empresa",
        "Gestão completa de produtos e preços",
        "Destaque nas buscas de lojas",
      ],
      icon: Store,
    },
  },
  {
    slug: "meus-anuncios",
    path: "/meus-anuncios",
    component: MeusAnuncios,
    marketing: {
      name: "Meus Anúncios",
      tagline: "Venda materiais de forma rápida e avulsa",
      description:
        "Publique anúncios de materiais, acompanhe o desempenho e destaque suas ofertas para vender mais rápido.",
      benefits: [
        "Publicação de anúncios em minutos",
        "Opção de destaque para mais visibilidade",
        "Gestão simples dos seus anúncios",
      ],
      icon: Megaphone,
    },
  },
];

/** Busca os metadados de uma solução pelo slug. */
export function getSolutionBySlug(slug?: string): SolutionRoute | undefined {
  return SOLUTION_ROUTES.find((s) => s.slug === slug);
}

/** Caminho da tela de bloqueio para uma solução. */
export function blockedPath(slug: string): string {
  return `/recurso/${slug}`;
}
