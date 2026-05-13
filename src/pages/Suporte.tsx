import { Mail, MessageCircle, HelpCircle } from "lucide-react";

export default function Suporte() {
  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 font-sans px-4">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Como podemos ajudar?</h1>
        <p className="text-lg text-slate-600 mb-12">Nossa equipe de suporte está pronta para tirar suas dúvidas.</p>
        
        <div className="grid md:grid-cols-2 gap-6 text-left">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <MessageCircle className="w-8 h-8 text-emerald-600 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">WhatsApp</h3>
            <p className="text-slate-600 mb-6">Atendimento rápido para dúvidas sobre a plataforma e assinaturas.</p>
            <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg transition-colors">
              Iniciar Conversa
            </button>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <Mail className="w-8 h-8 text-emerald-600 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">E-mail</h3>
            <p className="text-slate-600 mb-6">Para suporte técnico, envio de documentações ou parcerias maiores.</p>
            <button className="w-full border-2 border-slate-200 hover:border-emerald-600 hover:text-emerald-600 text-slate-700 font-medium py-3 rounded-lg transition-colors">
              suporte@obralink.com
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}