import { FileText, Download } from "lucide-react";

export default function DocumentosDicas() {
  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 font-sans px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Documentos e Dicas</h1>
        <p className="text-lg text-slate-600 mb-12">Materiais gratuitos para ajudar no dia a dia da sua obra.</p>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Item 1 */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-100 p-3 rounded-lg text-emerald-600"><FileText className="w-6 h-6" /></div>
              <div>
                <h3 className="font-bold text-slate-900">Checklist de Recebimento de Materiais</h3>
                <p className="text-sm text-slate-500">PDF • 2MB</p>
              </div>
            </div>
            <button className="flex items-center gap-2 text-emerald-600 hover:bg-emerald-50 px-4 py-2 rounded-md font-medium transition-colors">
              <Download className="w-4 h-4" /> Baixar
            </button>
          </div>
          {/* Item 2 */}
          <div className="flex items-center justify-between p-6 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-100 p-3 rounded-lg text-emerald-600"><FileText className="w-6 h-6" /></div>
              <div>
                <h3 className="font-bold text-slate-900">Planilha de Cálculo de BDI Padrão</h3>
                <p className="text-sm text-slate-500">XLSX • 1MB</p>
              </div>
            </div>
            <button className="flex items-center gap-2 text-emerald-600 hover:bg-emerald-50 px-4 py-2 rounded-md font-medium transition-colors">
              <Download className="w-4 h-4" /> Baixar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}