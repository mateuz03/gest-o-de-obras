import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, MapPin, ArrowRight, Sparkles, Heart, Zap } from "lucide-react";
import { LegalHeader } from "@/components/institutional/LegalLayout";

// 🔧 Configurável: troque pelo link real do Gupy/LinkedIn
const VAGAS_EXTERNAS_URL = "https://www.linkedin.com/company/obra-link/jobs/";

interface Vaga {
  id: string;
  titulo: string;
  departamento: string;
  alocacao: "Remoto" | "Híbrido" | "Presencial";
  local?: string;
}

const vagas: Vaga[] = [
  { id: "1", titulo: "Engenheiro(a) de Software Sênior", departamento: "Engenharia", alocacao: "Remoto" },
  { id: "2", titulo: "Product Designer Pleno", departamento: "Produto", alocacao: "Híbrido", local: "São Paulo" },
  { id: "3", titulo: "Engenheiro(a) Civil — Especialista SINAPI", departamento: "Conteúdo Técnico", alocacao: "Remoto" },
  { id: "4", titulo: "Customer Success Specialist", departamento: "Sucesso do Cliente", alocacao: "Híbrido", local: "São Paulo" },
  { id: "5", titulo: "Data Scientist — IA Aplicada", departamento: "Engenharia / IA", alocacao: "Remoto" },
  { id: "6", titulo: "Executivo(a) de Vendas B2B", departamento: "Comercial", alocacao: "Presencial", local: "São Paulo" },
];

const valores = [
  { icon: Heart, titulo: "Propósito de verdade", desc: "Cada entrega destrava produtividade para o setor que mais move a economia do país." },
  { icon: Zap, titulo: "Autonomia e ritmo", desc: "Time enxuto, decisões rápidas e a liberdade de ser dono do que você faz." },
  { icon: Sparkles, titulo: "Crescimento contínuo", desc: "Verba de educação, feedback aberto e espaço para aprender e evoluir todo dia." },
];

const alocacaoColor: Record<Vaga["alocacao"], string> = {
  Remoto: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Híbrido: "bg-blue-50 text-blue-700 border-blue-200",
  Presencial: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function Carreira() {
  return (
    <div className="min-h-screen bg-slate-50">
      <LegalHeader />

      {/* Hero */}
      <section className="border-b border-slate-200 bg-white">
        <div className="container max-w-4xl py-16 text-center">
          <Badge className="mb-4 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Faça parte do time</Badge>
          <h1 className="text-4xl font-bold text-slate-900 sm:text-5xl">
            Ajude a construir o futuro de quem constrói o Brasil
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            No Obra Link, tecnologia e engenharia se encontram para resolver problemas reais do
            canteiro de obras. Aqui você trabalha com autonomia, vê seu impacto rápido e cresce
            ao lado de gente que gosta de fazer simples o que parecia complicado.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-emerald-600 text-white hover:bg-emerald-700">
              <a href={VAGAS_EXTERNAS_URL} target="_blank" rel="noopener noreferrer">
                Ver Vagas no LinkedIn <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="mailto:carreiras@obralink.com.br?subject=Envio%20de%20Currículo">
                Enviar Currículo
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Valores */}
      <section className="container max-w-5xl py-16">
        <h2 className="mb-8 text-center text-2xl font-bold text-slate-900">Nossa cultura</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {valores.map(({ icon: Icon, titulo, desc }) => (
            <Card key={titulo} className="border-slate-200">
              <CardContent className="p-6">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                  <Icon className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-slate-900">{titulo}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Vagas */}
      <section className="border-t border-slate-200 bg-white">
        <div className="container max-w-4xl py-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Vagas abertas</h2>
              <p className="text-sm text-slate-500">{vagas.length} oportunidades no momento</p>
            </div>
          </div>

          <div className="space-y-3">
            {vagas.map((v) => (
              <a
                key={v.id}
                href={VAGAS_EXTERNAS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
              >
                <Card className="border-slate-200 transition-all hover:border-emerald-300 hover:shadow-md">
                  <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="rounded-lg bg-slate-100 p-2.5">
                        <Briefcase className="h-5 w-5 text-slate-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 group-hover:text-emerald-700">
                          {v.titulo}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                          <span>{v.departamento}</span>
                          {v.local && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" /> {v.local}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={alocacaoColor[v.alocacao]}>
                        {v.alocacao}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-emerald-600" />
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>

          <div className="mt-10 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-slate-600">
              Não encontrou uma vaga ideal? Envie seu currículo e entraremos em contato quando algo surgir.
            </p>
            <Button asChild className="mt-4 bg-emerald-600 text-white hover:bg-emerald-700">
              <a href="mailto:carreiras@obralink.com.br?subject=Banco%20de%20Talentos">
                Enviar Currículo
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
