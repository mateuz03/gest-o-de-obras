import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  MessageCircle,
  BookOpen,
  LifeBuoy,
  Search,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Navbar from "@/components/Navbar";
import { helpCenterFaq, type FaqCategory } from "@/data/faq";

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function Suporte() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");

  const filtered: FaqCategory[] = useMemo(() => {
    const q = normalize(query.trim());
    const base =
      activeCat === "all"
        ? helpCenterFaq
        : helpCenterFaq.filter((c) => c.id === activeCat);
    if (!q) return base;
    return base
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (it) => normalize(it.q).includes(q) || normalize(it.a).includes(q),
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [query, activeCat]);

  const totalResults = filtered.reduce((sum, c) => sum + c.items.length, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12">
      <Navbar />

      <main className="container max-w-6xl mx-auto py-12 px-4 lg:px-8">
        {/* ─── CABEÇALHO ─── */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-6">
            <LifeBuoy className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
            Central de Ajuda
          </h1>
          <p className="text-lg text-slate-600">
            Encontre respostas rápidas sobre cadastro, funcionalidades,
            pagamentos e segurança. Se preferir, fale direto com nosso time.
          </p>
        </div>

        {/* ─── CANAIS DE CONTATO (compactos) ─── */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <ContactCard
            icon={<MessageCircle className="w-5 h-5" />}
            title="WhatsApp"
            desc="Seg a Sex, 8h às 18h"
            cta="Iniciar conversa"
            onClick={() => window.open("https://wa.me/", "_blank")}
            primary
          />
          <ContactCard
            icon={<Mail className="w-5 h-5" />}
            title="E-mail"
            desc="suporte@obralink.com"
            cta="Enviar e-mail"
            onClick={() => (window.location.href = "mailto:suporte@obralink.com")}
          />
          <ContactCard
            icon={<BookOpen className="w-5 h-5" />}
            title="Documentação"
            desc="Tutoriais e guias"
            cta="Acessar"
            onClick={() => navigate("/documentos")}
          />
        </div>

        {/* ─── BUSCA ─── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 mb-8 shadow-sm">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por palavra-chave (ex: SINAPI, cancelar, LGPD...)"
              className="pl-12 h-12 text-base border-slate-200 focus-visible:ring-emerald-500"
              aria-label="Buscar nas perguntas frequentes"
            />
          </div>

          {/* Chips de categoria */}
          <div className="flex flex-wrap gap-2 mt-4">
            <CategoryChip
              label="Todas"
              active={activeCat === "all"}
              onClick={() => setActiveCat("all")}
            />
            {helpCenterFaq.map((cat) => (
              <CategoryChip
                key={cat.id}
                label={cat.title}
                active={activeCat === cat.id}
                onClick={() => setActiveCat(cat.id)}
              />
            ))}
          </div>

          {query && (
            <p className="text-sm text-slate-500 mt-4">
              {totalResults === 0
                ? "Nenhum resultado encontrado."
                : `${totalResults} resultado(s) encontrado(s).`}
            </p>
          )}
        </div>

        {/* ─── LISTA DE FAQs POR CATEGORIA ─── */}
        <div className="space-y-10">
          {filtered.length === 0 ? (
            <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl">
              <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">
                Não encontramos perguntas com esse termo.
              </p>
              <p className="text-slate-500 text-sm mt-1">
                Tente outra palavra ou fale com o suporte.
              </p>
            </div>
          ) : (
            filtered.map((cat) => (
              <section key={cat.id} aria-labelledby={`cat-${cat.id}`}>
                <div className="mb-4">
                  <h2
                    id={`cat-${cat.id}`}
                    className="text-2xl font-bold text-slate-900"
                  >
                    {cat.title}
                  </h2>
                  {cat.description && (
                    <p className="text-slate-500 text-sm mt-1">
                      {cat.description}
                    </p>
                  )}
                </div>

                <Accordion type="single" collapsible className="space-y-3">
                  {cat.items.map((item, i) => (
                    <AccordionItem
                      key={`${cat.id}-${i}`}
                      value={`${cat.id}-${i}`}
                      className="rounded-xl border border-slate-200 bg-white px-6 data-[state=open]:border-emerald-500 data-[state=open]:shadow-sm"
                    >
                      <AccordionTrigger className="text-left font-semibold text-slate-900 hover:no-underline">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-slate-600 leading-relaxed">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            ))
          )}
        </div>

        {/* ─── CTA FINAL ─── */}
        <div className="mt-16 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-8 sm:p-10 text-center text-white shadow-md">
          <h3 className="text-2xl sm:text-3xl font-bold mb-2">
            Ainda tem dúvidas?
          </h3>
          <p className="text-emerald-50 mb-6 max-w-xl mx-auto">
            Nosso time de suporte responde em até 1 dia útil. Estamos aqui para
            destravar sua obra.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold"
              onClick={() => window.open("https://wa.me/", "_blank")}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Falar no WhatsApp
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              onClick={() => (window.location.href = "mailto:suporte@obralink.com")}
            >
              <Mail className="w-4 h-4 mr-2" />
              Enviar e-mail
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ─── COMPONENTES AUXILIARES ─── */

function ContactCard({
  icon,
  title,
  desc,
  cta,
  onClick,
  primary,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  cta: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between gap-4 hover:border-emerald-500 hover:shadow-sm transition-all">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="text-sm text-slate-500 truncate">{desc}</p>
        </div>
      </div>
      <Button
        size="sm"
        onClick={onClick}
        className={
          primary
            ? "bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0"
            : "bg-slate-100 hover:bg-slate-200 text-slate-800 flex-shrink-0"
        }
      >
        {cta}
      </Button>
    </div>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "px-3 py-1.5 rounded-full text-sm font-medium transition-colors " +
        (active
          ? "bg-emerald-600 text-white"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200")
      }
    >
      {label}
    </button>
  );
}
