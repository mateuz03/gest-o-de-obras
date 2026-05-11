import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Box, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  nome_completo: z.string().trim().min(2, "Informe seu nome").max(120),
  tipo_empresa: z.string().min(1, "Selecione o tipo"),
  nome_empresa: z.string().trim().min(1, "Informe a empresa").max(120),
  qtd_funcionarios: z.string().min(1, "Selecione"),
  qtd_obras: z.coerce.number().int().min(0).max(9999),
  ano_criacao: z.coerce.number().int().min(1900).max(new Date().getFullYear()),
  celular: z.string().trim().min(8, "Telefone inválido").max(30),
  email: z.string().trim().email("E-mail inválido").max(255),
});

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

export default function SolicitarAcesso() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome_completo: "",
    tipo_empresa: "",
    nome_empresa: "",
    qtd_funcionarios: "",
    qtd_obras: "",
    ano_criacao: "",
    celular: "",
    email: "",
  });

  const update = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os campos");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("access_requests").insert(parsed.data as any);
    setLoading(false);
    if (error) {
      toast.error("Erro ao enviar solicitação. Tente novamente.");
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <nav className="border-b border-slate-200 bg-white">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <Box className="h-6 w-6 text-emerald-600" />
            <span>Obra Link</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </div>
      </nav>

      <div className="container py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center max-w-6xl mx-auto">
          {/* Left */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600 mb-4">
              Solicitar convite
            </p>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight text-slate-900 mb-6">
              Pronto(a) para transformar o seu negócio?
            </h1>
            <p className="text-lg text-slate-500 leading-relaxed">
              Preencha as informações para solicitar o seu convite. Milhares de
              negócios de Arquitetura e Construção já estão utilizando o Obra
              Link para se destacar no mercado.
            </p>
          </div>

          {/* Right */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 sm:p-8 shadow-sm">
            {submitted ? (
              <div className="py-10 text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">
                  ✅ Solicitação enviada com sucesso!
                </h2>
                <p className="text-slate-600 leading-relaxed">
                  Nossa equipe avaliará o seu perfil e entraremos em contato por
                  e-mail ou WhatsApp em breve.
                </p>
                <Button asChild className="mt-6 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Link to="/">Voltar para o início</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nome_completo">Seu nome completo *</Label>
                  <Input
                    id="nome_completo"
                    value={form.nome_completo}
                    onChange={(e) => update("nome_completo", e.target.value)}
                    placeholder="Como devemos te chamar?"
                    required
                    className="bg-white mt-1.5"
                  />
                </div>

                <div>
                  <Label>Tipo da Empresa / Profissão *</Label>
                  <Select
                    value={form.tipo_empresa}
                    onValueChange={(v) => update("tipo_empresa", v)}
                  >
                    <SelectTrigger className="bg-white mt-1.5">
                      <SelectValue placeholder="Selecione uma opção" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Construtora">Construtora</SelectItem>
                      <SelectItem value="Empreiteiro">Empreiteiro</SelectItem>
                      <SelectItem value="Arquiteto">Arquiteto</SelectItem>
                      <SelectItem value="Engenheiro">Engenheiro</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="nome_empresa">Nome da empresa *</Label>
                  <Input
                    id="nome_empresa"
                    value={form.nome_empresa}
                    onChange={(e) => update("nome_empresa", e.target.value)}
                    required
                    className="bg-white mt-1.5"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Qtd. de pessoas *</Label>
                    <Select
                      value={form.qtd_funcionarios}
                      onValueChange={(v) => update("qtd_funcionarios", v)}
                    >
                      <SelectTrigger className="bg-white mt-1.5">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Apenas eu</SelectItem>
                        <SelectItem value="2-5">2 a 5</SelectItem>
                        <SelectItem value="6-15">6 a 15</SelectItem>
                        <SelectItem value="16-50">16 a 50</SelectItem>
                        <SelectItem value="51-200">51 a 200</SelectItem>
                        <SelectItem value="200+">Mais de 200</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="qtd_obras">Obras no momento *</Label>
                    <Input
                      id="qtd_obras"
                      type="number"
                      min={0}
                      value={form.qtd_obras}
                      onChange={(e) => update("qtd_obras", e.target.value)}
                      required
                      className="bg-white mt-1.5"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ano_criacao">Ano de criação *</Label>
                    <Input
                      id="ano_criacao"
                      type="number"
                      min={1900}
                      max={new Date().getFullYear()}
                      placeholder="2020"
                      value={form.ano_criacao}
                      onChange={(e) => update("ano_criacao", e.target.value)}
                      required
                      className="bg-white mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="celular">Celular (WhatsApp) *</Label>
                    <Input
                      id="celular"
                      value={form.celular}
                      onChange={(e) => update("celular", maskPhone(e.target.value))}
                      placeholder="(11) 99999-9999"
                      required
                      className="bg-white mt-1.5"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    required
                    className="bg-white mt-1.5"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base font-semibold"
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
                  ) : (
                    "Enviar Solicitação"
                  )}
                </Button>

                <p className="text-xs text-slate-500 text-center leading-relaxed pt-2">
                  Ao enviar este formulário, você concorda com os nossos{" "}
                  <a href="#" className="underline hover:text-slate-700">Termos de Uso</a>{" "}
                  e nossa{" "}
                  <a href="#" className="underline hover:text-slate-700">Política de Privacidade</a>.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
