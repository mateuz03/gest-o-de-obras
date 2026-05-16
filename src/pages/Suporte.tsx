import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Mail, 
  MessageCircle, 
  Box, 
  ArrowLeft, 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  LifeBuoy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

const FAQ = [
  {
    pergunta: "Como funciona a atualização de preços do SINAPI?",
    resposta: "Nossa base de dados é sincronizada com os índices oficiais do SINAPI. Sempre que uma nova tabela é liberada pela Caixa Econômica, o sistema atualiza automaticamente os custos de referência dos insumos na sua região."
  },
  {
    pergunta: "Sou lojista. Como recebo as cotações das construtoras?",
    resposta: "Sempre que uma obra na sua região (dentro do seu raio de atuação) gerar uma lista de materiais compatível com o seu catálogo, você receberá uma notificação no painel do Obra Link e um aviso no WhatsApp."
  },
  {
    pergunta: "Os planos possuem fidelidade ou multa de cancelamento?",
    resposta: "Não. Acreditamos na liberdade e no valor que entregamos. Você pode cancelar ou pausar a sua assinatura a qualquer momento, sem taxas ocultas ou burocracia."
  },
  {
    pergunta: "Como os prestadores de serviço são validados?",
    resposta: "Os profissionais preenchem um cadastro detalhado com especialidade e referências. Construtoras e engenheiros podem avaliar o serviço prestado após a conclusão da obra, gerando um ecossistema seguro e baseado em reputação."
  }
];

export default function Suporte() {
  const navigate = useNavigate();
  const [faqAberto, setFaqAberto] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setFaqAberto(faqAberto === index ? null : index);
  };

  return (
<div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12">      
      {/* ─── HEADER ─── */}
      <Navbar /> {/* <-- A MÁGICA ACONTECE AQUI */}

      <main className="container max-w-5xl mx-auto py-12 px-4 lg:px-8">
        
        {/* ─── CABEÇALHO ─── */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-6">
            <LifeBuoy className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
            Como podemos te ajudar hoje?
          </h1>
          <p className="text-lg text-slate-600">
            Nossa equipe está pronta para resolver qualquer problema e garantir que a sua obra não pare. Escolha um canal de atendimento abaixo.
          </p>
        </div>

        {/* ─── CANAIS DE CONTATO ─── */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          
          {/* Card WhatsApp */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all text-center group">
            <MessageCircle className="w-10 h-10 text-emerald-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">WhatsApp</h3>
            <p className="text-slate-600 mb-6 text-sm">
              Atendimento rápido (Seg a Sex, 8h às 18h). Ideal para dúvidas curtas e onboarding.
            </p>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-5 rounded-xl">
              Iniciar Conversa
            </Button>
          </div>

          {/* Card E-mail */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all text-center group">
            <Mail className="w-10 h-10 text-emerald-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">E-mail</h3>
            <p className="text-slate-600 mb-6 text-sm">
              Envio de documentações, parcerias B2B maiores e report de bugs detalhados.
            </p>
            <Button variant="outline" className="w-full border-2 border-slate-200 hover:border-emerald-600 hover:text-emerald-600 hover:bg-emerald-50 text-slate-700 font-medium py-5 rounded-xl transition-colors">
              suporte@obralink.com
            </Button>
          </div>

          {/* Card Base de Conhecimento */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all text-center group">
            <BookOpen className="w-10 h-10 text-emerald-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">Central de Ajuda</h3>
            <p className="text-slate-600 mb-6 text-sm">
              Acesse nossos tutoriais e aprenda a extrair o máximo do sistema e planilhas.
            </p>
            <Button variant="outline" className="w-full border-2 border-slate-200 hover:border-emerald-600 hover:text-emerald-600 hover:bg-emerald-50 text-slate-700 font-medium py-5 rounded-xl transition-colors" onClick={() => navigate("/documentos")}>
              Ver Documentação
            </Button>
          </div>

        </div>

        {/* ─── FAQ ─── */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Dúvidas Frequentes</h2>
            <p className="text-slate-600">Respostas rápidas para as perguntas mais comuns.</p>
          </div>

          <div className="space-y-4">
            {FAQ.map((item, index) => (
              <div 
                key={index} 
                className={`bg-white border rounded-xl overflow-hidden transition-all duration-200 ${
                  faqAberto === index ? "border-emerald-500 shadow-sm" : "border-slate-200"
                }`}
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                >
                  <span className="font-semibold text-slate-900 pr-4">{item.pergunta}</span>
                  {faqAberto === index ? (
                    <ChevronUp className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  )}
                </button>
                
                <div 
                  className={`px-6 pb-6 text-slate-600 leading-relaxed transition-all duration-200 ${
                    faqAberto === index ? "block" : "hidden"
                  }`}
                >
                  {item.resposta}
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}