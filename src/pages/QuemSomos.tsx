import { Target, Users } from "lucide-react";

export default function QuemSomos() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-12 font-sans px-4">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-slate-900 mb-6">A Tecnologia a favor da Construção</h1>
        <p className="text-lg text-slate-600 mb-12">
          O Obra Link nasceu para resolver uma das maiores dores do mercado: a falta de previsibilidade e conexão entre quem gerencia a obra e quem fornece os materiais.
        </p>
        
        <div className="grid md:grid-cols-2 gap-8 text-left mt-12">
          <div className="bg-slate-50 p-8 rounded-2xl">
            <Target className="w-8 h-8 text-emerald-600 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">Nossa Missão</h3>
            <p className="text-slate-600">Digitalizar processos manuais, oferecendo orçamentos baseados em dados reais (SINAPI) e um marketplace direto com fornecedores da região.</p>
          </div>
          <div className="bg-slate-50 p-8 rounded-2xl">
            <Users className="w-8 h-8 text-emerald-600 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">Nosso Foco</h3>
            <p className="text-slate-600">Engenheiros, construtoras e lojistas que buscam eficiência, redução de custos e transparência na gestão de compras.</p>
          </div>
        </div>
      </div>
    </div>
  );
}