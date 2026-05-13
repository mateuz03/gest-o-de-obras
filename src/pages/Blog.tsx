import { BookOpen, Construction, TrendingUp } from "lucide-react";

export default function Blog() {
  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 font-sans px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Blog Obra Link</h1>
        <p className="text-lg text-slate-600 mb-12">Novidades, dicas de gestão e tendências da construção civil.</p>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Card 1 */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <Construction className="w-8 h-8 text-emerald-600 mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Como otimizar orçamentos com SINAPI</h2>
            <p className="text-slate-600 mb-4">Descubra como a automação está reduzindo o tempo de orçamentação em até 80%.</p>
            <span className="text-emerald-600 font-medium cursor-pointer hover:underline">Ler artigo completo →</span>
          </div>
          {/* Card 2 */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <TrendingUp className="w-8 h-8 text-emerald-600 mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Previsibilidade em Obras B2B</h2>
            <p className="text-slate-600 mb-4">Estratégias para evitar o estouro de cronogramas e orçamentos usando dados.</p>
            <span className="text-emerald-600 font-medium cursor-pointer hover:underline">Ler artigo completo →</span>
          </div>
        </div>
      </div>
    </div>
  );
}