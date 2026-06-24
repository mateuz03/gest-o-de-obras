import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { landingPath } from "@/config/landingSolutions";
import { blockedPath } from "@/config/solutions";
import { SheetClose } from "@/components/ui/sheet";

interface SiteMenuItem {
  label: string;
  to: string;
  matches: string[];
}

interface SiteMenuSection {
  label: string;
  items: SiteMenuItem[];
}

function matchesRoute(pathname: string, matches: string[]) {
  return matches.some((match) => pathname === match || pathname.startsWith(`${match}/`));
}

const DESKTOP_DROPDOWN_WIDTH: Record<string, string> = {
  "SoluÃ§Ãµes": "w-64",
  "ConteÃºdo": "w-64",
  "Obra Link": "w-64",
};

function getSiteMenuSections(isAuthenticated: boolean): SiteMenuSection[] {
  const projectPath = isAuthenticated ? "/dashboard" : blockedPath("gestao-de-projetos");
  const marketplacePath = isAuthenticated ? "/marketplace" : landingPath("marketplace");
  const servicePath = isAuthenticated ? "/cadastrar-profissional" : landingPath("prestar-servico");
  const storePath = isAuthenticated ? "/painel-loja" : landingPath("criar-loja");

  return [
    {
      label: "Soluções",
      items: [
        {
          label: "Gestão de Projetos",
          to: projectPath,
          matches: ["/dashboard", "/nova-analise", "/analise", "/notas-fiscais", "/sinapi", "/recurso/gestao-de-projetos"],
        },
        {
          label: "Marketplace",
          to: marketplacePath,
          matches: ["/marketplace", "/loja", "/vendedor", "/solucoes/marketplace", "/recurso/marketplace"],
        },
        {
          label: "Prestar Serviços",
          to: servicePath,
          matches: ["/cadastrar-profissional", "/profissionais", "/servicos", "/solucoes/prestar-servico", "/recurso/prestar-servico"],
        },
        {
          label: "Crie sua Loja",
          to: storePath,
          matches: ["/painel-loja", "/meus-anuncios", "/seja-parceiro", "/solucoes/criar-loja", "/recurso/criar-loja"],
        },
      ],
    },
    {
      label: "Conteúdo",
      items: [
        {
          label: "Blog",
          to: "/blog",
          matches: ["/blog"],
        },
        {
          label: "Documentos e Dicas",
          to: "/documentos",
          matches: ["/documentos"],
        },
      ],
    },
    {
      label: "Obra Link",
      items: [
        {
          label: "Quem Somos",
          to: "/sobre-nos",
          matches: ["/sobre-nos"],
        },
        {
          label: "Precisa de Suporte?",
          to: "/suporte",
          matches: ["/suporte"],
        },
        {
          label: "Termos de Uso",
          to: "/termos-de-uso",
          matches: ["/termos-de-uso"],
        },
      ],
    },
  ];
}

export function DesktopSiteMenuTabs() {
  const location = useLocation();
  const { user } = useAuth();
  const pathname = location.pathname;
  const sections = getSiteMenuSections(Boolean(user));
  const [openSection, setOpenSection] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  const clearCloseTimer = () => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleOpenSection = (sectionLabel: string) => {
    clearCloseTimer();
    setOpenSection(sectionLabel);
  };

  const scheduleCloseSection = (sectionLabel: string) => {
    clearCloseTimer();
    closeTimeoutRef.current = window.setTimeout(() => {
      setOpenSection((current) => (current === sectionLabel ? null : current));
      closeTimeoutRef.current = null;
    }, 160);
  };

  useEffect(() => {
    clearCloseTimer();
    setOpenSection(null);
  }, [pathname]);

  useEffect(() => {
    if (!openSection) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!navRef.current?.contains(event.target as Node)) {
        setOpenSection(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenSection(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openSection]);

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, []);

  return (
    <div ref={navRef} className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
      {sections.map((section) => {
        const sectionActive = section.items.some((item) => matchesRoute(pathname, item.matches));
        const isOpen = openSection === section.label;
        const isHighlighted = sectionActive || isOpen;

        return (
          <div
            key={section.label}
            className="relative"
            onMouseEnter={() => handleOpenSection(section.label)}
            onMouseLeave={() => scheduleCloseSection(section.label)}
          >
            <button
              type="button"
              aria-expanded={isOpen}
              className={`flex items-center gap-1.5 py-4 text-[15px] transition-colors ${
                isHighlighted ? "text-emerald-600" : "hover:text-emerald-600"
              }`}
              onFocus={() => handleOpenSection(section.label)}
              onClick={() =>
                setOpenSection((current) => (current === section.label ? null : section.label))
              }
            >
              {section.label}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  isOpen ? "rotate-180 text-emerald-600" : isHighlighted ? "text-emerald-600" : ""
                }`}
              />
            </button>

            <div
              className={`absolute left-0 top-full z-50 pt-2 ${
                DESKTOP_DROPDOWN_WIDTH[section.label] ?? "w-64"
              } transition-all duration-150 ${
                isOpen
                  ? "visible translate-y-0 opacity-100"
                  : "pointer-events-none invisible -translate-y-1 opacity-0"
              }`}
              onMouseEnter={() => handleOpenSection(section.label)}
              onMouseLeave={() => scheduleCloseSection(section.label)}
            >
              <div className="rounded-[20px] border border-slate-200/90 bg-white p-3 shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
                {section.items.map((item) => {
                  const itemActive = matchesRoute(pathname, item.matches);

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      aria-current={itemActive ? "page" : undefined}
                      className={`block rounded-xl px-4 py-3 text-[15px] font-semibold transition-colors ${
                        itemActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "text-slate-600 hover:bg-slate-50 hover:text-emerald-600"
                      }`}
                      onClick={() => {
                        clearCloseTimer();
                        setOpenSection(null);
                      }}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MobileSiteMenuTabs({
  closeOnSelect = false,
}: {
  closeOnSelect?: boolean;
}) {
  const location = useLocation();
  const { user } = useAuth();
  const pathname = location.pathname;
  const sections = getSiteMenuSections(Boolean(user));

  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <div key={section.label} className="space-y-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {section.label}
          </p>
          <div className="space-y-1 rounded-2xl border border-slate-200 bg-slate-50 p-2">
            {section.items.map((item) => {
              const itemActive = matchesRoute(pathname, item.matches);

              const content = (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={itemActive ? "page" : undefined}
                  className={`block rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                    itemActive
                      ? "bg-white text-emerald-700 shadow-sm"
                      : "text-slate-700 hover:bg-white hover:text-emerald-600"
                  }`}
                >
                  {item.label}
                </Link>
              );

              return closeOnSelect ? (
                <SheetClose key={item.to} asChild>
                  {content}
                </SheetClose>
              ) : (
                content
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
