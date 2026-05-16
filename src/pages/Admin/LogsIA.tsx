import { useState, useMemo } from "react";
import { 
  TerminalSquare, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Filter, 
  Clock, 
  Cpu,
  Code
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Mock de logs de requisições da IA
const mockLogs = [
  { id: "req_001", user: "usr_84f2", func: "analyze-blueprint", status: "Erro", erro: "Timeout na IA", tempo: "45.2s", tokens: 0, data: "22/04/2026 14:32" },
  { id: "req_002", user: "usr_19ac", func: "analyze-blueprint", status: "Erro", erro: "Planta ilegível", tempo: "12.4s", tokens: 150, data: "22/04/2026 13:58" },
  { id: "req_003", user: "usr_72de", func: "analyze-blueprint", status: "Erro", erro: "Falha na escala", tempo: "8.1s", tokens: 800, data: "22/04/2026 12:41" },
  { id: "req_004", user: "usr_55ba", func: "extract-materials", status: "Sucesso", erro: "-", tempo: "4.2s", tokens: 1200, data: "21/04/2026 18:06" },
  { id: "req_005", user: "usr_99zx", func: "analyze-blueprint", status: "Sucesso", erro: "-", tempo: "15.7s", tokens: 4500, data: "21/04/2026 15:22" },
  { id: "req_006", user: "usr_42bb", func: "estimate-costs", status: "Sucesso", erro: "-", tempo: "3.1s", tokens: 850, data: "21/04/2026 10:05" },
];

export default function LogsIA() {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");

  const logsFiltrados = useMemo(() => {
    return mockLogs.filter(log => {
      const matchBusca = log.user.toLowerCase().includes(busca.toLowerCase()) || log.func.toLowerCase().includes(busca.toLowerCase()) || log.id.toLowerCase().includes(busca.toLowerCase());
      const matchStatus = filtroStatus === "Todos" || log.status === filtroStatus;
      return matchBusca && matchStatus;
    });
  }, [busca, filtroStatus]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* ─── CABEÇALHO ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <TerminalSquare className="w-8 h-8 text-emerald-600" />
            Logs e Monitoramento de IA
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Rastreie requisições, detecte falhas em plantas e monitore o consumo de tokens.
          </p>
        </div>
      </div>

      {/* ─── KPIS DE DESEMPENHO ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Taxa de Sucesso</p>
              <h3 className="text-2xl font-black text-slate-900">94.2%</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tempo Médio (Latência)</p>
              <h3 className="text-2xl font-black text-slate-900">8.4s</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <Cpu className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tokens Consumidos (24h)</p>
              <h3 className="text-2xl font-black text-slate-900">1.2M</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── FILTROS E BUSCA ─── */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar por ID, Usuário ou Função..." 
              className="pl-9 bg-slate-50 border-slate-200"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="flex w-full md:w-auto items-center gap-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              className="text-sm border border-slate-200 rounded-md bg-slate-50 px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <option value="Todos">Todos os Status</option>
              <option value="Sucesso">Sucesso</option>
              <option value="Erro">Erro / Falha</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* ─── TABELA DE LOGS ─── */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Data / Hora</th>
                <th className="px-6 py-4">ID Req / Usuário</th>
                <th className="px-6 py-4">Função IA</th>
                <th className="px-6 py-4 text-center">Tempo</th>
                <th className="px-6 py-4 text-center">Tokens</th>
                <th className="px-6 py-4">Status / Detalhe</th>
                <th className="px-6 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {logsFiltrados.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-sans text-sm">Nenhum log encontrado.</td></tr>
              ) : (
                logsFiltrados.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">{log.data}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{log.id}</p>
                      <p className="text-slate-400">{log.user}</p>
                    </td>
                    <td className="px-6 py-4 text-indigo-600 font-medium">{log.func}</td>
                    <td className="px-6 py-4 text-center">{log.tempo}</td>
                    <td className="px-6 py-4 text-center">{log.tokens.toLocaleString()}</td>
                    <td className="px-6 py-4 font-sans">
                      {log.status === 'Sucesso' ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">200 OK</Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 bg-red-50 border-red-100 font-medium flex items-center gap-1 w-fit">
                          <AlertTriangle className="w-3 h-3" /> {log.erro}
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-emerald-600">
                        <Code className="w-4 h-4 mr-2" /> JSON
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}