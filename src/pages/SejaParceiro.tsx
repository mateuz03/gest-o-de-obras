import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { Box, ArrowRight, Users, PackageCheck, BarChart3, Check, Star, ShieldCheck, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";

const schema = z.object({
  nome_loja: z.string().trim().min(2, "Informe o nome da loja").max(120),
  cnpj: z.string().trim().min(14, "CNPJ inválido").max(20),
  endereco: z.string().trim().min(5, "Endereço obrigatório").max(200),
  cidade: z.string().trim().max(100).optional().or(z.literal("")),
  estado: z.string().trim().max(2).optional().or(z.literal("")),
  responsavel: z.string().trim().min(2, "Informe o responsável").max(120),
  whatsapp: z.string().trim().min(8, "WhatsApp inválido").max(20),
  email: z.string().trim().email("E-mail inválido").max(255).optional().or(z.literal("")),
  plano: z.enum(["basico", "profissional", "enterprise"]),
});

const planos = [
  {
    id: "basico" as const,
    nome: "Básico",
    preco: "R$ 99",
    periodo: "/mês",
    destaque: false,
    features: ["Até 50 produtos no catálogo", "Perfil de loja público", "Suporte por e-mail"],
  },
  {
    id: "profissional" as const,
    nome: "Profissional",
    preco: "R$ 199",
    periodo: "/mês",
    destaque: true,
    features: ["Produtos ilimitados", "Selo Verificado ✓", "Relatórios de procura", "Suporte prioritário"],
  },
  {
    id: "enterprise" as const,
    nome: "Enterprise",
    preco: "Personalizado",
    periodo: "",
    destaque: false,
    features: ["Destaque prioritário no Marketplace", "Gerente de conta dedicado", "API de integração de catálogo"],
  },
];

const maskPhone = (v: string) =>
  v.replace(/\D/g, "").slice(0, 11)
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");

const maskCNPJ = (v: string) =>
  v.replace(/\D/g, "").slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");

export default function SejaParceiro() {
  const [open, setOpen] = useState(false);
  const [planoSelecionado, setPlanoSelecionado] = useState<"basico" | "profissional" | "enterprise">("profissional");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome_loja: "",
    cnpj: "",
    endereco: "",
    cidade: "",
    estado: "",
    responsavel: "",
    whatsapp: "",
    email: "",
  });

  // --- FUNÇÕES AJUDANTES (Agora no escopo correto!) ---
  const formatarApenasLetras = (texto: string) => {
    const apenasLetras = texto.replace(/[0-9]/g, ""); // Bloqueia números
    if (!apenasLetras) return "";
    return apenasLetras
      .split(" ")
      .map(p => ["de", "da", "do", "das", "dos", "e"].includes(p.toLowerCase()) ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");
  };

  const formatarComNumeros = (texto: string) => {
    if (!texto) return "";
    return texto
      .split(" ")
      .map(p => ["de", "da", "do", "das", "dos", "e"].includes(p.toLowerCase()) ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");
  };
  // ----------------------------------------------------

  const openForm = (plano: "basico" | "profissional" | "enterprise") => {
    setPlanoSelecionado(plano);
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ ...form, plano: planoSelecionado });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os campos");
      return;
    }
    
    setLoading(true);
    
    const { error } = await supabase.from("fornecedores_leads").insert([{
      nome_loja: parsed.data.nome_loja,
      cnpj: parsed.data.cnpj,
      whatsapp: parsed.data.whatsapp,
      cidade: parsed.data.cidade,
      plano_escolhido: parsed.data.plano,
      status: 'novo'
    }]);
    
    setLoading(false);
    
    if (error) {
      console.error("Erro no Supabase:", error);
      toast.error("Erro ao enviar cadastro. Tente novamente.");
      return;
    }
    
    toast.success("Cadastro enviado! Nossa equipe entrará em contato em breve.");
    setOpen(false);
    setForm({ nome_loja: "", cnpj: "", endereco: "", cidade: "", estado: "", responsavel: "", whatsapp: "", email: "" });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 text-white">
        <div className="container py-20 lg:py-28">
          <div className="max-w-3xl">
            <Badge className="mb-4 bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
              Para fornecedores e lojas de materiais
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
              Venda os seus materiais diretamente para os{" "}
              <span className="text-emerald-400">maiores projetos</span> da sua região.
            </h1>
            <p className="text-lg text-slate-300 max-w-2xl mb-8">
              Conecte sua loja a centenas de construtoras, arquitetos e empreiteiros que orçam obras
              diariamente no Obra Link. Apareça no carrinho dos projetos certos, na hora certa.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => openForm("profissional")} className="bg-emerald-500 hover:bg-emerald-600 text-white h-12 px-8">
                Cadastrar minha Loja <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 px-8 bg-white/10 border-white/20 text-white hover:bg-white/20">
                <a href="#planos">Ver planos</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="container py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-bold mb-3">Por que vender no Obra Link?</h2>
          <p className="text-slate-600">Um canal de vendas B2B desenhado para o setor da construção civil.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Users, titulo: "Público Qualificado", desc: "Apenas gestores de obra ativos com orçamentos em andamento. Zero curiosos." },
            { icon: PackageCheck, titulo: "Gestão de Catálogo Simples", desc: "Suba seu catálogo via planilha e atualize preços a qualquer momento, sem complicação." },
            { icon: BarChart3, titulo: "Relatórios de Procura", desc: "Veja quais materiais estão sendo mais buscados na sua região e ajuste seu estoque." },
          ].map((b, i) => (
            <Card key={i} className="border-slate-200 hover:shadow-lg transition-shadow bg-white">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                  <b.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{b.titulo}</h3>
                <p className="text-sm text-slate-600">{b.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="bg-white border-y border-slate-200 py-16">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge className="mb-3 bg-emerald-50 text-emerald-700 border border-emerald-200">Planos & Preços</Badge>
            <h2 className="text-3xl font-bold mb-3">Escolha o plano ideal para sua loja</h2>
            <p className="text-slate-600">Sem fidelidade. Cancele quando quiser.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {planos.map((p) => (
              <Card
                key={p.id}
                className={
                  p.destaque
                    ? "border-2 border-emerald-500 shadow-xl relative bg-white"
                    : "border-slate-200 bg-white"
                }
              >
                {p.destaque && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-emerald-600 text-white border-0">
                      <Star className="h-3 w-3 mr-1" /> Mais popular
                    </Badge>
                  </div>
                )}
                <CardContent className="p-8 flex flex-col h-full">
                  <h3 className="text-xl font-bold mb-1">{p.nome}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-extrabold">{p.preco}</span>
                    <span className="text-slate-500">{p.periodo}</span>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <Check className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => openForm(p.id)}
                    className={
                      p.destaque
                        ? "w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "w-full bg-slate-900 hover:bg-slate-800 text-white"
                    }
                  >
                    {p.id === "enterprise" ? "Falar com vendas" : "Cadastrar minha Loja"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 mt-8 text-sm text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Pagamento mensal seguro · Sem taxa de adesão · Cancelamento a qualquer momento</span>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="container py-16 text-center">
        <h2 className="text-3xl font-bold mb-3">Pronto para vender mais?</h2>
        <p className="text-slate-600 mb-6 max-w-xl mx-auto">
          Cadastre sua loja em menos de 2 minutos. Nosso time entra em contato para finalizar a ativação.
        </p>
        <Button size="lg" onClick={() => openForm("profissional")} className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 px-10">
          Cadastrar minha Loja <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </section>

      {/* Modal de cadastro */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar minha Loja</DialogTitle>
            <DialogDescription>
              Plano selecionado: <strong className="text-emerald-700">{planos.find(p => p.id === planoSelecionado)?.nome}</strong>. Preencha os dados abaixo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4 mt-2">
            
            {/* INÍCIO DOS CAMPOS DO FORMULÁRIO */}
            <div className="space-y-4">
              
              <div>
                <Label>Nome da Loja *</Label>
                <Input 
                  required
                  value={form.nome_loja} 
                  onChange={(e) => setForm({...form, nome_loja: formatarApenasLetras(e.target.value)})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>CNPJ *</Label>
                  <Input 
                    required
                    placeholder="00.000.000/0000-00"
                    value={form.cnpj} 
                    onChange={(e) => setForm({...form, cnpj: maskCNPJ(e.target.value)})} 
                  />
                </div>
                <div>
                  <Label>WhatsApp *</Label>
                  <Input
                    required
                    placeholder="(00) 00000-0000"
                    value={form.whatsapp}
                    onChange={(e) => setForm({...form, whatsapp: maskPhone(e.target.value)})}
                  />
                </div>
              </div>

              <div>
                <Label>Endereço completo *</Label>
                <Input 
                  required
                  value={form.endereco} 
                  onChange={(e) => setForm({...form, endereco: formatarComNumeros(e.target.value)})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cidade *</Label>
                  <Input 
                    required
                    value={form.cidade} 
                    onChange={(e) => setForm({...form, cidade: formatarApenasLetras(e.target.value)})} 
                  />
                </div>
                <div>
                  <Label>UF *</Label>
                  <Input 
                    required
                    maxLength={2}
                    placeholder="SP"
                    value={form.estado} 
                    onChange={(e) => setForm({...form, estado: e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase()})} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Responsável *</Label>
                  <Input 
                    required
                    value={form.responsavel} 
                    onChange={(e) => setForm({...form, responsavel: formatarApenasLetras(e.target.value)})} 
                  />
                </div>
                <div>
                  <Label>E-mail *</Label>
                  <Input 
                    required
                    type="email"
                    placeholder="contato@loja.com"
                    value={form.email} 
                    onChange={(e) => setForm({...form, email: e.target.value.toLowerCase().trim()})} 
                  />
                </div>
              </div>
            </div>
            {/* FIM DOS CAMPOS DO FORMULÁRIO */}

            <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar Cadastro"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}