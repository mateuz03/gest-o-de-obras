import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpenText,
  Briefcase,
  FolderKanban,
  LifeBuoy,
  Megaphone,
  ShieldCheck,
  ShoppingBag,
  Store,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";

interface HubCard {
  title: string;
  description: string;
  to: string;
  cta: string;
  icon: typeof FolderKanban;
}

function HubLinkCard({
  title,
  description,
  to,
  cta,
  icon: Icon,
}: HubCard) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-xl text-slate-900">{title}</CardTitle>
          <p className="text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" className="w-full justify-between border-slate-200">
          <Link to={to}>
            {cta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Inicio() {
  const { user, accountType } = useAuth();
  const { isAdmin, isAdminLoading } = useAdminRole(user?.id);

  const mainCards: HubCard[] = [
    {
      title: "Gestao de Projetos",
      description: "Acompanhe projetos, orcamentos, analises e a operacao do dia a dia em um painel unico.",
      to: "/dashboard",
      cta: "Abrir painel de projetos",
      icon: FolderKanban,
    },
    {
      title: "Marketplace",
      description: "Consulte materiais, lojas e oportunidades de compra sem sair do ecossistema da plataforma.",
      to: "/marketplace",
      cta: "Explorar marketplace",
      icon: ShoppingBag,
    },
    {
      title: "Meus Anuncios",
      description: "Gerencie publicacoes, acompanhe desempenho e mantenha suas ofertas sempre atualizadas.",
      to: "/meus-anuncios",
      cta: "Gerenciar anuncios",
      icon: Megaphone,
    },
    accountType === "CNPJ"
      ? {
          title: "Minha Loja",
          description: "Controle sua vitrine, produtos e a presenca da sua empresa dentro do marketplace.",
          to: "/painel-loja",
          cta: "Abrir painel da loja",
          icon: Store,
        }
      : {
          title: "Prestar Servicos",
          description: "Atualize seu perfil profissional e facilite o recebimento de novos contatos e propostas.",
          to: "/cadastrar-profissional",
          cta: "Abrir perfil profissional",
          icon: Briefcase,
        },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="container py-10">
          <div className="max-w-3xl space-y-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
              Area principal
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
              Bem-vindo de volta ao Obra Link
            </h1>
            <p className="text-base leading-7 text-slate-500">
              Use esta central para entrar direto nas ferramentas da sua rotina, retomar o que estava
              em andamento e navegar entre a area privada e o conteudo publico sem ficar preso em um
              fluxo unico.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
                <Link to="/nova-analise">Criar nova analise</Link>
              </Button>
              <Button asChild variant="outline" className="border-slate-200">
                <Link to="/">Ver landing page</Link>
              </Button>
            </div>
            <p className="text-sm text-slate-400">
              Conta atual: {accountType === "CNPJ" ? "Pessoa Juridica" : "Pessoa Fisica"}
              {user?.email ? ` • ${user.email}` : ""}
            </p>
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="container space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-slate-900">Ferramentas ativas</h2>
            <p className="text-sm text-slate-500">
              Escolha o ponto de entrada que faz mais sentido para o seu momento.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {mainCards.map((card) => (
              <HubLinkCard key={card.title} {...card} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-8">
        <div className="container space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-slate-900">Conteudo e suporte</h2>
            <p className="text-sm text-slate-500">
              O conteudo publico continua disponivel mesmo depois do login.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <HubLinkCard
              title="Blog"
              description="Acesse artigos, novidades e materiais para apoiar decisoes do dia a dia."
              to="/blog"
              cta="Ler blog"
              icon={BookOpenText}
            />
            <HubLinkCard
              title="Documentos e Dicas"
              description="Veja guias praticos, documentos e orientacoes para a operacao da obra."
              to="/documentos"
              cta="Abrir conteudos"
              icon={BookOpenText}
            />
            <HubLinkCard
              title="Suporte"
              description="Fale com o time quando precisar de ajuda operacional ou tecnica."
              to="/suporte"
              cta="Abrir suporte"
              icon={LifeBuoy}
            />
            <HubLinkCard
              title="Termos de Uso"
              description="Consulte regras, diretrizes e condicoes da plataforma quando precisar."
              to="/termos-de-uso"
              cta="Ver termos"
              icon={ShieldCheck}
            />
          </div>
        </div>
      </section>

      {!isAdminLoading && isAdmin ? (
        <section className="py-8">
          <div className="container">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-6 py-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                    Acesso administrativo
                  </p>
                  <h2 className="text-2xl font-semibold text-slate-900">Painel de moderacao</h2>
                  <p className="text-sm leading-6 text-slate-600">
                    Entre no backoffice para moderar lojas, usuarios, anuncios e acompanhar a operacao da plataforma.
                  </p>
                </div>
                <Button asChild className="bg-slate-900 text-white hover:bg-slate-800">
                  <Link to="/admin">Abrir painel admin</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
