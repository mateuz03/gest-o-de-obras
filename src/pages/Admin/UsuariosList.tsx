import { useState, useMemo, useEffect } from "react";
import { 
  Search, Filter, Download, Eye, Edit, ShieldCheck, Ban, Loader2, Save, AlertTriangle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Tipagem para os usuários
interface Usuario {
  id: string;
  nome: string;
  email: string;
  plano: string;
  status: string;
  plantas: number;
  data: string;
}

// Dados Falsos para podermos testar a interface
const mockUsuarios: Usuario[] = [
  { id: "1", nome: "Mateus Dias de Oliveira", email: "mateus.dias.de.oliveira@aiconstruct.app", plano: "Free", status: "Ativo", plantas: 0, data: "18/04/2026" },
  { id: "2", nome: "Angélica da Silva Cordeiro", email: "angelica.da.silva.cordeiro@aiconstruct.app", plano: "Free", status: "Ativo", plantas: 4, data: "20/04/2026" },
  { id: "3", nome: "teste 1", email: "teste.1@aiconstruct.app", plano: "Pro", status: "Inativo", plantas: 0, data: "21/04/2026" },
  { id: "4", nome: "Construtora Alpha", email: "contato@alpha.eng.br", plano: "Pro", status: "Ativo", plantas: 12, data: "10/04/2026" },
  { id: "5", nome: "João Silva", email: "joao.arq@gmail.com", plano: "Free", status: "Bloqueado", plantas: 1, data: "01/04/2026" },
];

export default function UsuariosList() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Filtro
  const [buscaUser, setBuscaUser] = useState("");
  const [campoBusca, setCampoBusca] = useState("Todos"); // Busca Avançada
  const [filtroPlano, setFiltroPlano] = useState("Todos");
  const [filtroStatus, setFiltroStatus] = useState("Todos");

  // Estados dos Modais
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [usuarioBloqueando, setUsuarioBloqueando] = useState<Usuario | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Simula o carregamento inicial da API (Substituir por Supabase depois)
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      // await supabase.from('profiles').select('*');
      setTimeout(() => {
        setUsuarios(mockUsuarios);
        setLoading(false);
      }, 800);
    };
    fetchUsers();
  }, []);

  // Filtra em tempo real a tabela conforme digitamos na busca
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter(u => {
      let matchBusca = false;
      const termo = buscaUser.toLowerCase();

      if (campoBusca === "Todos") {
        matchBusca = u.nome.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo);
      } else if (campoBusca === "Nome") {
        matchBusca = u.nome.toLowerCase().includes(termo);
      } else if (campoBusca === "Email") {
        matchBusca = u.email.toLowerCase().includes(termo);
      }

      const matchPlano = filtroPlano === "Todos" || u.plano === filtroPlano;
      const matchStatus = filtroStatus === "Todos" || u.status === filtroStatus;
      
      return matchBusca && matchPlano && matchStatus;
    });
  }, [buscaUser, campoBusca, filtroPlano, filtroStatus, usuarios]);

  // Função Real de Exportação CSV
  const exportarCSV = () => {
    if (usuariosFiltrados.length === 0) {
      toast.error("Não há dados para exportar.");
      return;
    }

    const headers = ["ID", "Nome", "E-mail", "Plano", "Status", "Plantas Analisadas", "Data de Cadastro"];
    const rows = usuariosFiltrados.map(u => 
      [u.id, `"${u.nome}"`, `"${u.email}"`, u.plano, u.status, u.plantas, u.data]
    );

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `usuarios_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`${usuariosFiltrados.length} usuários exportados com sucesso!`);
  };

  // Ações de Edição e Bloqueio
  const handleSalvarEdicao = async () => {
    if (!usuarioEditando) return;
    setSalvando(true);
    
    // Simula update no Supabase
    setTimeout(() => {
      setUsuarios(prev => prev.map(u => u.id === usuarioEditando.id ? usuarioEditando : u));
      toast.success("Dados do usuário atualizados com sucesso.");
      setSalvando(false);
      setUsuarioEditando(null);
    }, 1000);
  };

  const handleConfirmarBloqueio = async () => {
    if (!usuarioBloqueando) return;
    setSalvando(true);
    
    setTimeout(() => {
      setUsuarios(prev => prev.map(u => u.id === usuarioBloqueando.id ? { ...u, status: "Bloqueado" } : u));
      toast.warning(`Usuário ${usuarioBloqueando.nome} foi bloqueado.`);
      setSalvando(false);
      setUsuarioBloqueando(null);
    }, 800);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-extrabold text-slate-900">Usuários & Assinaturas</h2>
            {/* Indicador de Contagem */}
            {!loading && (
              <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-medium">
                {usuariosFiltrados.length} de {usuarios.length}
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">Gerencie acessos, veja métricas de uso e altere planos.</p>
        </div>
        <Button 
          variant="outline" 
          className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-colors" 
          onClick={exportarCSV}
          disabled={loading || usuariosFiltrados.length === 0}
        >
          <Download className="w-4 h-4 mr-2" /> Exportar CSV
        </Button>
      </div>

      {/* FILTROS E BUSCA */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardContent className="p-4 flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex w-full lg:w-auto items-center gap-2">
            {/* Busca Avançada (Seletor de Coluna) */}
            <select 
              className="text-sm border border-slate-200 rounded-md bg-slate-50 px-3 py-2.5 text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
              value={campoBusca}
              onChange={(e) => setCampoBusca(e.target.value)}
            >
              <option value="Todos">Buscar em Tudo</option>
              <option value="Nome">Apenas Nome</option>
              <option value="Email">Apenas E-mail</option>
            </select>
            
            <div className="relative w-full lg:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Digite para buscar..." 
                className="pl-9 bg-slate-50 border-slate-200" 
                value={buscaUser} 
                onChange={(e) => setBuscaUser(e.target.value)} 
              />
            </div>
          </div>

          <div className="flex w-full lg:w-auto items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select 
                className="text-sm border border-slate-200 rounded-md bg-slate-50 px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500" 
                value={filtroPlano} 
                onChange={(e) => setFiltroPlano(e.target.value)}
              >
                <option value="Todos">Todos os Planos</option>
                <option value="Free">Free</option>
                <option value="Pro">Pro</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>
            <select 
              aria-label="Filtrar por status" 
              className="text-sm border border-slate-200 rounded-md bg-slate-50 px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500" 
              value={filtroStatus} 
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <option value="Todos">Qualquer Status</option>
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
              <option value="Bloqueado">Bloqueado</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* TABELA DE USUÁRIOS */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Data Cadastro</th>
                <th className="px-6 py-4">Plano</th>
                <th className="px-6 py-4 text-center">Plantas Analisadas</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
                    <p className="text-slate-500">Carregando usuários...</p>
                  </td>
                </tr>
              ) : usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Nenhum usuário encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{u.nome}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </td>
                    <td className="px-6 py-4">{u.data}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${u.plano === 'Pro' ? 'bg-amber-100 text-amber-700' : u.plano === 'Enterprise' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                        {u.plano}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-700">{u.plantas}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={
                        u.status === 'Ativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        u.status === 'Bloqueado' ? 'bg-red-50 text-red-700 border-red-200' : 
                        'bg-slate-50 text-slate-500 border-slate-200'
                      }>
                        {u.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded transition-colors" 
                          title="Editar/Ver Detalhes" 
                          onClick={() => setUsuarioEditando({ ...u })}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors" 
                          title="Bloquear" 
                          disabled={u.status === "Bloqueado"}
                          onClick={() => setUsuarioBloqueando(u)}
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── MODAL DE EDIÇÃO ─── */}
      <Dialog open={!!usuarioEditando} onOpenChange={(open) => !open && !salvando && setUsuarioEditando(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Detalhes do Usuário
            </DialogTitle>
          </DialogHeader>
          
          {usuarioEditando && (
            <div className="grid gap-4 py-4">
              <div className="space-y-1 text-sm">
                <p className="font-bold text-slate-900">{usuarioEditando.nome}</p>
                <p className="text-slate-500">{usuarioEditando.email}</p>
                <p className="text-slate-400 text-xs mt-2">Cadastrado em {usuarioEditando.data} • {usuarioEditando.plantas} plantas analisadas</p>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4 mt-2">
                <Label htmlFor="plano" className="text-right font-bold text-slate-700">Plano</Label>
                <select 
                  id="plano"
                  className="col-span-3 text-sm border border-slate-200 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                  value={usuarioEditando.plano}
                  onChange={(e) => setUsuarioEditando({...usuarioEditando, plano: e.target.value})}
                >
                  <option value="Free">Free</option>
                  <option value="Pro">Pro</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right font-bold text-slate-700">Status</Label>
                <select 
                  id="status"
                  className="col-span-3 text-sm border border-slate-200 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                  value={usuarioEditando.status}
                  onChange={(e) => setUsuarioEditando({...usuarioEditando, status: e.target.value})}
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                  <option value="Bloqueado">Bloqueado</option>
                </select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setUsuarioEditando(null)} disabled={salvando}>Cancelar</Button>
            <Button onClick={handleSalvarEdicao} disabled={salvando} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── ALERT DIALOG DE BLOQUEIO ─── */}
      <AlertDialog open={!!usuarioBloqueando} onOpenChange={(open) => !open && !salvando && setUsuarioBloqueando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Bloquear Usuário?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a bloquear o acesso de <strong>{usuarioBloqueando?.nome}</strong>. 
              Esta ação revogará imediatamente o login e a capacidade do usuário de gerar novos orçamentos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={salvando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleConfirmarBloqueio(); }} 
              disabled={salvando}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Confirmar Bloqueio"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}