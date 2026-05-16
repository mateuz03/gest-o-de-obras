import { useState } from "react";
import { 
  Users, 
  FileText, 
  Activity, 
  Wallet, 
  Database, 
  AlertTriangle, 
  Eye, 
  Ban, 
  Settings, 
  ShieldCheck,
  UploadCloud,
  TerminalSquare
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const [abaAtiva, setAbaAtiva] = useState("visao_geral");

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-900">
      
      {/* ─── SIDEBAR (MENU LATERAL) ─── */}
      <aside className="w-64 bg-[#0f172a] text-slate-300 flex flex-col min-h-screen">
        {/* Logo Admin */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-lg leading-tight">Obra Link</h1>
            <p className="text-sm font-medium text-emerald-500">Admin</p>
          </div>
        </div>

        {/* Navegação */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          <button 
            onClick={() => setAbaAtiva("visao_geral")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${abaAtiva === "visao_geral" ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 hover:text-white"}`}
          >
            <BoxIcon className="w-5 h-5" /> Visão Geral
          </button>
          <button 
            onClick={() => setAbaAtiva("usuarios")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${abaAtiva === "usuarios" ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 hover:text-white"}`}
          >
            <Users className="w-5 h-5" /> Usuários & Assinaturas
          </button>
          <button 
            onClick={() => setAbaAtiva("sinapi")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${abaAtiva === "sinapi" ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 hover:text-white"}`}
          >
            <Database className="w-5 h-5" /> Base de Dados (SINAPI)
          </button>
          <button 
            onClick={() => setAbaAtiva("logs_ia")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${abaAtiva === "logs_ia" ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 hover:text-white"}`}
          >
            <TerminalSquare className="w-5 h-5" /> Logs de IA
          </button>
          <button 
            onClick={() => setAbaAtiva("config")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${abaAtiva === "config" ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 hover:text-white"}`}
          >
            <Settings className="w-5 h-5" /> Configurações do Sistema
          </button>
        </nav>

        {/* Status do Sistema no rodapé do menu */}
        <div className="p-4 m-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-white">Sistema operacional</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Monitoramento interno de usuários, custos e automações IA.
          </p>
        </div>
      </aside>

      {/* ─── CONTEÚDO PRINCIPAL ─── */}
      <main className="flex-1 p-8 overflow-y-auto">
        
        {abaAtiva === "visao_geral" && (
          <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
            
            {/* Header da Página */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Centro de Comando</p>
                <h2 className="text-3xl font-extrabold text-slate-900">Painel de Controle do Administrador</h2>
              </div>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                <ShieldCheck className="w-4 h-4 mr-2" /> Ver saúde do sistema
              </Button>
            </div>

            {/* ─── LINHA 1: CARDS DE MÉTRICAS (KPIs) ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total de Usuários</p>
                      <h3 className="text-2xl font-black text-slate-900">124 ativos</h3>
                    </div>
                    <div className="p-2 bg-slate-100 rounded-lg"><Users className="w-5 h-5 text-slate-600" /></div>
                  </div>
                  <p className="text-xs font-medium text-emerald-600 mt-3 flex items-center gap-1">
                    ↗ +12,4% nos últimos 30 dias
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Análises Realizadas</p>
                      <h3 className="text-2xl font-black text-slate-900">772</h3>
                    </div>
                    <div className="p-2 bg-slate-100 rounded-lg"><FileText className="w-5 h-5 text-slate-600" /></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3 font-medium">plantas processadas</p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Consumo Supabase/API</p>
                      <h3 className="text-2xl font-black text-slate-900">45%</h3>
                    </div>
                    <div className="p-2 bg-slate-100 rounded-lg"><Activity className="w-5 h-5 text-slate-600" /></div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[45%]"></div>
                  </div>
                  <p className="text-xs font-medium text-emerald-600 mt-2">Status estável</p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">MRR / Receita Estimada</p>
                      <h3 className="text-2xl font-black text-slate-900">R$ 4.500,00</h3>
                    </div>
                    <div className="p-2 bg-slate-100 rounded-lg"><Wallet className="w-5 h-5 text-slate-600" /></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3 font-medium">base recorrente mensal</p>
                </CardContent>
              </Card>
            </div>

            {/* ─── LINHA 2: SINAPI E LOGS DE IA ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Bloco SINAPI (Ocupa 2 colunas) */}
              <Card className="lg:col-span-2 border-slate-200 shadow-sm bg-white">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-8">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Database className="w-5 h-5 text-emerald-600" /> Gestão da Base de Preços (SINAPI)
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">Última atualização: 15 de Abril de 2026 (Base SP)</p>
                    </div>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-9">
                      <UploadCloud className="w-4 h-4 mr-2" /> Importar CSV/XLSX
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Itens Indexados</p>
                      <p className="text-2xl font-black text-slate-900">48.920</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Região Ativa</p>
                      <p className="text-2xl font-black text-slate-900">SP</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Match Médio</p>
                      <p className="text-2xl font-black text-slate-900">91,8%</p>
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-emerald-900">Base pronta para orçamentação híbrida</p>
                      <p className="text-xs text-emerald-700 mt-1">Uploads são processados fora da IA para preservar precisão matemática e reduzir custo de tokens.</p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 font-bold">
                      Operacional
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Bloco Logs IA (Ocupa 1 coluna) */}
              <Card className="border-slate-200 shadow-sm bg-white">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-5 h-5 text-amber-500" /> Logs de Erro da IA
                  </h3>
                  <p className="text-sm text-slate-500 mb-6">Falhas recentes na função analyze-blueprint</p>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-medium pb-2 border-b border-slate-100">
                      <span>Data/Hora</span>
                      <span>Tipo de Erro</span>
                    </div>
                    
                    {/* Mock de Erros */}
                    {[
                      { data: "22/04/2026 14:32", erro: "Timeout na IA" },
                      { data: "22/04/2026 13:58", erro: "Planta ilegível" },
                      { data: "22/04/2026 12:41", erro: "Falha na escala" },
                      { data: "21/04/2026 18:06", erro: "Arquivo corrompido" },
                    ].map((log, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{log.data}</span>
                        <Badge variant="outline" className="text-red-600 bg-red-50 border-red-100 font-medium">
                          {log.erro}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* ─── LINHA 3: TABELA DE USUÁRIOS RECENTES ─── */}
            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-slate-600" /> Usuários Recentes
                </h3>
                <p className="text-sm text-slate-500 mt-1">Últimos cadastros e situação operacional da conta.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4">Nome/Email</th>
                      <th className="px-6 py-4">Plano</th>
                      <th className="px-6 py-4 text-center">Plantas Analisadas</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">teste 1</p>
                        <p className="text-xs text-slate-400">teste.1@aiconstruct.app</p>
                      </td>
                      <td className="px-6 py-4 font-medium">Pro</td>
                      <td className="px-6 py-4 text-center font-medium">0</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="text-slate-500 bg-slate-100 border-slate-200">Inativo</Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-md hover:bg-emerald-50 transition-colors"><Eye className="w-4 h-4" /></button>
                          <button className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"><Ban className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                    
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">Mateus dias de oliveira</p>
                        <p className="text-xs text-slate-400">mateus.dias.de.oliveira@aiconstruct.app</p>
                      </td>
                      <td className="px-6 py-4 font-medium">Free</td>
                      <td className="px-6 py-4 text-center font-medium">0</td>
                      <td className="px-6 py-4">
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">Ativo</Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-md hover:bg-emerald-50 transition-colors"><Eye className="w-4 h-4" /></button>
                          <button className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"><Ban className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">Angélica da Silva Cordeiro</p>
                        <p className="text-xs text-slate-400">angelica.da.silva.cordeiro@aiconstruct.app</p>
                      </td>
                      <td className="px-6 py-4 font-medium">Free</td>
                      <td className="px-6 py-4 text-center font-medium">4</td>
                      <td className="px-6 py-4">
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">Ativo</Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-md hover:bg-emerald-50 transition-colors"><Eye className="w-4 h-4" /></button>
                          <button className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"><Ban className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>

          </div>
        )}

        {abaAtiva === "usuarios" && <div className="text-slate-500">Tela de Usuários em construção...</div>}
        {abaAtiva === "sinapi" && <div className="text-slate-500">Tela da Base SINAPI em construção...</div>}
        {abaAtiva === "logs_ia" && <div className="text-slate-500">Tela de Logs em construção...</div>}
        {abaAtiva === "config" && <div className="text-slate-500">Tela de Configurações em construção...</div>}

      </main>
    </div>
  );
}

// Ícone customizado para o botão de Visão Geral (para ficar parecido com o seu print)
function BoxIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  );
}