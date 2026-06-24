import { ScrollArea } from "@/components/ui/scroll-area";

export interface LegalSection {
  title: string;
  body: string;
}

interface LegalLayoutProps {
  title: string;
  subtitle?: string;
  lastUpdated: string;
  sections: LegalSection[];
  highlight?: React.ReactNode;
}

export function LegalHeader() {
  return null;
}

export function LegalLayout({ title, subtitle, lastUpdated, sections, highlight }: LegalLayoutProps) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
      <main className="container max-w-3xl py-10">
        <header className="mb-8 border-b border-slate-200 pb-6">
          <h1 className="text-4xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-2 text-slate-600">{subtitle}</p>}
          <p className="mt-3 text-sm text-slate-500">
            Última atualização: <span className="font-medium text-slate-700">{lastUpdated}</span>
          </p>
        </header>

        {highlight && <div className="mb-8">{highlight}</div>}

        <ScrollArea className="h-[70vh] rounded-lg border border-slate-200 bg-white p-6 sm:p-8 scroll-smooth">
          <article className="prose prose-slate max-w-none">
            {sections.map((s, i) => (
              <section key={i} className="mb-8 last:mb-0">
                <h2 className="mb-3 text-lg font-bold text-slate-900">
                  {i + 1}. {s.title}
                </h2>
                <p className="text-[15px] leading-relaxed text-slate-700 whitespace-pre-line">
                  {s.body}
                </p>
              </section>
            ))}
          </article>
        </ScrollArea>
      </main>
    </div>
  );
}
