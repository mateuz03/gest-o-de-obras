import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  FileText, 
  Download, 
  Search, 
  Box, 
  ArrowLeft, 
  FileSpreadsheet, 
  BookOpen, 
  CheckSquare 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";

// Banco de dados fictício de documentos
const DOCUMENTOS = [
  {
    id: 1,
    titulo: "Planilha de Cálculo de BDI Padrão",
    descricao: "Calcule os Custos Indiretos e o Lucro da sua obra com fórmulas já configuradas nos padrões do TCU.",
    categoria: "Planilhas",
    tipo: "XLSX",
    tamanho: "1.2 MB",
    icone: FileSpreadsheet,
    cor: "text-green-600",
    bg: "bg-green-100"
  },
  {
    id: 2,
    titulo: "Checklist de Recebimento de Materiais",
    descricao: "Não deixe passar nenhum defeito. Lista de conferência para aço, cimento, areia e acabamentos.",
    categoria: "Checklists",
    tipo: "PDF",
    tamanho: "840 KB",
    icone: CheckSquare,
    cor: "text-orange-600",
    bg: "bg-orange-100"
  },
  {
    id: 3,
    titulo: "Modelo de Contrato de Empreitada",
    descricao: "Proteja sua obra. Modelo jurídico padrão para contratação de mão de obra terceirizada.",
    categoria: "Contratos",
    tipo: "DOCX",
    tamanho: "450 KB",
    icone: FileText,
    cor: "text-blue-600",
    bg: "bg-blue-100"
  },
  {
    id: 4,
    titulo: "Guia Definitivo: Orçamentos com SINAPI",
    descricao: "Aprenda a ler os catálogos do SINAPI e a aplicar os coeficientes corretos de produtividade.",
    categoria: "E-books",
    tipo: "PDF",
    tamanho: "4.5 MB",
    icone: BookOpen,
    cor: "text-purple-600",
    bg: "bg-purple-100"
  },
  {
    id: 5,
    titulo: "Planilha de Curva ABC de Insumos",
    descricao: "Descubra quais materiais representam 80% do custo da sua obra para focar na negociação.",
    categoria: "Planilhas",
    tipo: "XLSX",
    tamanho: "2.1 MB",
    icone: FileSpreadsheet,
    cor: "text-green-600",
    bg: "bg-green-100"
  },
  {
    id: 6,
    titulo: "Diário de Obra (RDO) - Template Digital",
    descricao: "Modelo padronizado para preenchimento diário das atividades, clima e efetivo no canteiro.",
    categoria: "Templates",
    tipo: "PDF",
    tamanho: "1.5 MB",
    icone: FileText,
    cor: "text-red-600",
    bg: "bg-red-100"
  }
];

const CATEGORIAS = ["Todos", "Planilhas", "Checklists", "Contratos", "E-books", "Templates"];

export default function DocumentosDicas() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("Todos");

  // Filtra os documentos com base na busca e na categoria selecionada
  const filtrados = DOCUMENTOS.filter((doc) => {
    const matchCategoria = categoriaAtiva === "Todos" || doc.categoria === categoriaAtiva;
    const matchBusca = doc.titulo.toLowerCase().includes(busca.toLowerCase()) || 
                       doc.descricao.toLowerCase().includes(busca.toLowerCase());
    return matchCategoria && matchBusca;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12">
      
      {/* ─── HEADER ─── */}
      <Navbar /> {/* <-- A MÁGICA ACONTECE AQUI */}

      <main className="container max-w-6xl mx-auto py-12 px-4 lg:px-8">
        
        {/* ─── CABEÇALHO ─── */}
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
            Materiais e <span className="text-emerald-600">Templates</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl">
            Acelere a gestão da sua construção. Baixe gratuitamente nossas planilhas, modelos de contrato e guias práticos.
          </p>
        </div>

        {/* ─── BARRA DE BUSCA E FILTROS ─── */}
        <div className="bg-white p-2 md:p-4 rounded-xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Busca */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input 
              placeholder="Ex: Planilha de BDI..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:ring-emerald-500 w-full"
            />
          </div>

          {/* Categorias (Pills) */}
          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
            {CATEGORIAS.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoriaAtiva(cat)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  categoriaAtiva === cat 
                    ? "bg-emerald-600 text-white shadow-md" 
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* ─── GRID DE DOCUMENTOS ─── */}
        {filtrados.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-lg font-medium text-slate-900">Nenhum material encontrado.</p>
            <p className="text-slate-500">Tente buscar por outro termo ou limpar os filtros.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtrados.map((doc) => (
              <div key={doc.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col hover:shadow-md transition-all hover:-translate-y-1 group">
                
                {/* Topo do Card: Ícone e Badge */}
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl ${doc.bg} ${doc.cor} group-hover:scale-110 transition-transform`}>
                    <doc.icone className="w-7 h-7" />
                  </div>
                  <Badge variant="outline" className="text-slate-500 border-slate-200 bg-slate-50">
                    {doc.categoria}
                  </Badge>
                </div>

                {/* Título e Descrição */}
                <h3 className="text-xl font-bold text-slate-900 mb-2 leading-tight">
                  {doc.titulo}
                </h3>
                <p className="text-slate-600 text-sm mb-6 flex-1">
                  {doc.descricao}
                </p>

                {/* Rodapé do Card: Info do arquivo e Botão */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{doc.tipo}</span>
                    <span className="text-xs text-slate-500">{doc.tamanho}</span>
                  </div>
                  
                  <Button className="bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors gap-2">
                    <Download className="w-4 h-4" /> Baixar
                  </Button>
                </div>

              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}