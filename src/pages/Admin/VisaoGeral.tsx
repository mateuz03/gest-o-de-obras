import { Users, FileText, Activity, Wallet, Database, UploadCloud, AlertTriangle, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function VisaoGeral() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Centro de Comando</p>
          <h2 className="text-3xl font-extrabold text-slate-900">Painel de Controle do Administrador</h2>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
          <ShieldCheck className="w-4 h-4 mr-2" /> Ver saúde do sistema
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm"><CardContent className="p-5"><div className="flex justify-between items-start"><div><p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total de Usuários</p><h3 className="text-2xl font-black text-slate-900">124 ativos</h3></div><div className="p-2 bg-slate-100 rounded-lg"><Users className="w-5 h-5 text-slate-600" /></div></div><p className="text-xs font-medium text-emerald-600 mt-3 flex items-center gap-1">↗ +12,4% nos últimos 30 dias</p></CardContent></Card>
        <Card className="border-slate-200 shadow-sm"><CardContent className="p-5"><div className="flex justify-between items-start"><div><p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Análises Realizadas</p><h3 className="text-2xl font-black text-slate-900">772</h3></div><div className="p-2 bg-slate-100 rounded-lg"><FileText className="w-5 h-5 text-slate-600" /></div></div><p className="text-xs text-slate-500 mt-3 font-medium">plantas processadas</p></CardContent></Card>
        <Card className="border-slate-200 shadow-sm"><CardContent className="p-5"><div className="flex justify-between items-start"><div><p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Consumo Supabase/API</p><h3 className="text-2xl font-black text-slate-900">45%</h3></div><div className="p-2 bg-slate-100 rounded-lg"><Activity className="w-5 h-5 text-slate-600" /></div></div><div className="w-full h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden"><div className="h-full bg-emerald-500 w-[45%]"></div></div><p className="text-xs font-medium text-emerald-600 mt-2">Status estável</p></CardContent></Card>
        <Card className="border-slate-200 shadow-sm"><CardContent className="p-5"><div className="flex justify-between items-start"><div><p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">MRR / Receita Estimada</p><h3 className="text-2xl font-black text-slate-900">R$ 4.500,00</h3></div><div className="p-2 bg-slate-100 rounded-lg"><Wallet className="w-5 h-5 text-slate-600" /></div></div><p className="text-xs text-slate-500 mt-3 font-medium">base recorrente mensal</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200 shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-8">
              <div><h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Database className="w-5 h-5 text-emerald-600" /> Gestão da Base de Preços (SINAPI)</h3><p className="text-sm text-slate-500 mt-1">Última atualização: 15 de Abril de 2026 (Base SP)</p></div>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-9"><UploadCloud className="w-4 h-4 mr-2" /> Importar CSV/XLSX</Button>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div><p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Itens Indexados</p><p className="text-2xl font-black text-slate-900">48.920</p></div>
              <div><p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Região Ativa</p><p className="text-2xl font-black text-slate-900">SP</p></div>
              <div><p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Match Médio</p><p className="text-2xl font-black text-slate-900">91,8%</p></div>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-emerald-900">Base pronta para orçamentação híbrida</p>
                <p className="text-xs text-emerald-700 mt-1">Uploads são processados fora da IA para preservar precisão matemática.</p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 font-bold">
                Operacional
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-1"><AlertTriangle className="w-5 h-5 text-amber-500" /> Logs de Erro da IA</h3>
            <p className="text-sm text-slate-500 mb-6">Falhas recentes na função analyze-blueprint</p>
            <div className="space-y-4">
              {[ { data: "22/04/2026 14:32", erro: "Timeout na IA" }, { data: "22/04/2026 13:58", erro: "Planta ilegível" }, { data: "22/04/2026 12:41", erro: "Falha na escala" }].map((log, i) => (
                <div key={i} className="flex items-center justify-between text-sm"><span className="text-slate-600">{log.data}</span><Badge variant="outline" className="text-red-600 bg-red-50 border-red-100 font-medium">{log.erro}</Badge></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}