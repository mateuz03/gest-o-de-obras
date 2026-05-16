import { useState, useMemo } from "react";
import { Search, Filter, Download, Eye, Edit, ShieldCheck, Ban } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Dados Falsos para podermos testar a interface
const mockUsuarios = [
  { id: "1", nome: "Mateus Dias de Oliveira", email: "mateus.dias.de.oliveira@aiconstruct.app", plano: "Free", status: "Ativo", plantas: 0, data: "18/04/2026" },
  { id: "2", nome: "Angélica da Silva Cordeiro", email: "angelica.da.silva.cordeiro@aiconstruct.app", plano: "Free", status: "Ativo", plantas: 4, data: "20/04/2026" },
  { id: "3", nome: "teste 1", email: "teste.1@aiconstruct.app", plano: "Pro", status: "Inativo", plantas: 0, data: "21/04/2026" },
  { id: "4", nome: "Construtora Alpha", email: "contato@alpha.eng.br", plano: "Pro", status: "Ativo", plantas: 12, data: "10/04/2026" },
  { id: "5", nome: "João Silva", email: "joao.arq@gmail.com", plano: "Free", status: "Bloqueado", plantas: 1, data: "01/04/2026" },
];

export default function UsuariosList() {
  const [buscaUser, setBuscaUser] = useState("");
  const [filtroPlano, setFiltroPlano] = useState("Todos");
  const [filtroStatus, setFiltroStatus] = useState("Todos");

  // Filtra em tempo real a tabela conforme digitamos na busca
  const usuariosFiltrados = useMemo(() => {
    return mockUsuarios.filter(u => {
      const matchBusca = u.nome.toLowerCase().includes(buscaUser.toLowerCase()) || u.email.toLowerCase().includes(buscaUser.toLowerCase());
      const matchPlano = filtroPlano === "Todos" || u.plano === filtroPlano;
      const matchStatus = filtroStatus === "Todos" || u.status === filtroStatus;
      return matchBusca && matchPlano && matchStatus;
    });
  }, [buscaUser, filtroPlano, filtroStatus]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900">Usuários & Assinaturas</h2>
          <p className="text-sm text-slate-500 mt-1">Gerencie acessos, veja métricas de uso e altere planos.</p>
        </div>
        <Button variant="outline" className="border-slate-300 text-slate-700 bg-white">
          <Download className="w-4 h-4 mr-2" /> Exportar CSV
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm bg-white">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Buscar por nome ou e-mail..." className="pl-9 bg-slate-50 border-slate-200" value={buscaUser} onChange={(e) => setBuscaUser(e.target.value)} />
          </div>
          <div className="flex w-full md:w-auto items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select className="text-sm border border-slate-200 rounded-md bg-slate-50 px-3 py-2 text-slate-700 outline-none" value={filtroPlano} onChange={(e) => setFiltroPlano(e.target.value)}>
                <option value="Todos">Todos os Planos</option>
                <option value="Free">Free</option>
                <option value="Pro">Pro</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>
            <select className="text-sm border border-slate-200 rounded-md bg-slate-50 px-3 py-2 text-slate-700 outline-none" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
              <option value="Todos">Qualquer Status</option>
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
              <option value="Bloqueado">Bloqueado</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Plano</th>
                <th className="px-6 py-4 text-center">Plantas</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuariosFiltrados.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">Nenhum usuário encontrado.</td></tr>
              ) : (
                usuariosFiltrados.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4"><p className="font-bold text-slate-900">{u.nome}</p><p className="text-xs text-slate-400">{u.email}</p></td>
                    <td className="px-6 py-4">{u.data}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${u.plano === 'Pro' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{u.plano}</span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-700">{u.plantas}</td>
                    <td className="px-6 py-4">
                      <Badge className={
                        u.status === 'Ativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        u.status === 'Bloqueado' ? 'bg-red-50 text-red-700 border-red-200' : 
                        'bg-slate-50 text-slate-500 border-slate-200'
                      }>{u.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-1.5 text-slate-400 hover:text-emerald-600 rounded" title="Ver Detalhes"><Eye className="w-4 h-4" /></button>
                        <button className="p-1.5 text-slate-400 hover:text-indigo-600 rounded" title="Editar"><Edit className="w-4 h-4" /></button>
                        <button className="p-1.5 text-slate-400 hover:text-red-600 rounded" title="Bloquear"><Ban className="w-4 h-4" /></button>
                      </div>
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