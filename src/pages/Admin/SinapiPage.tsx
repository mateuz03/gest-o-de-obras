import { useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import { 
  Database, 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  FileSpreadsheet,
  Calendar,
  MapPin,
  Search,
  RefreshCw
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// 3. Histórico extraído para array (Facilita a futura troca pelo Supabase)
const mockImports = [
  {
    id: "1",
    arquivo: "SINAPI_Custo_Ref_042026_SP.xlsx",
    autor: "Admin (Você)",
    dataUpload: "15/04/2026 às 14:30",
    itens: "48.920",
    regiao: "São Paulo (SP)",
    referencia: "Abril 2026 - Não Desonerado",
    status: "Concluído"
  },
  {
    id: "2",
    arquivo: "SINAPI_Custo_Ref_032026_SP.csv",
    autor: "Sistema Automático",
    dataUpload: "10/03/2026 às 02:00",
    itens: "48.815",
    regiao: "São Paulo (SP)",
    referencia: "Março 2026 - Não Desonerado",
    status: "Concluído"
  },
  {
    id: "3",
    arquivo: "SINAPI_Custo_Ref_022026_SP_corrompido.xlsx",
    autor: "Admin (Você)",
    dataUpload: "12/02/2026 às 11:15",
    itens: "-",
    regiao: "-",
    referencia: "-",
    status: "Falha"
  }
];

export default function SinapiPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [busca, setBusca] = useState(""); // 1. Estado da busca
  const fileInputRef = useRef<HTMLInputElement>(null); // 2. Ref para o input de arquivo

  // 5. Processamento refatorado com async/await e try/catch
  const processarArquivo = async (file: File) => {
    setIsUploading(true);
    try {
      // Simula o tempo de upload/parse da Edge Function
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      // 🔴 Bug corrigido: alert nativo substituído por toast
      toast.success(`Planilha "${file.name}" processada com sucesso! Base atualizada.`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar a planilha. Verifique a formatação do arquivo.");
    } finally {
      setIsUploading(false);
      // Limpa o input para permitir enviar o mesmo arquivo novamente, se necessário
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processarArquivo(file);
    }
  };

  // 1. Filtragem dinâmica baseada no estado de busca
  const importacoesFiltradas = useMemo(() => {
    return mockImports.filter((item) =>
      item.arquivo.toLowerCase().includes(busca.toLowerCase()) ||
      item.autor.toLowerCase().includes(busca.toLowerCase())
    );
  }, [busca]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* ─── CABEÇALHO ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <Database className="w-8 h-8 text-emerald-600" />
            Base de Preços (SINAPI)
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Importe, gerencie e audite os insumos e composições da base nacional.
          </p>
        </div>
      </div>

      {/* ─── STATUS ATUAL DA BASE ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card Principal: Saúde */}
        <Card className="md:col-span-2 border-emerald-200 bg-emerald-50 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
            <Database className="w-48 h-48 -mr-10 -mt-10 text-emerald-600" />
          </div>
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <Badge className="bg-emerald-600 text-white font-bold hover:bg-emerald-700">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Base Operacional
              </Badge>
              <span className="text-xs text-emerald-800 font-medium">Sincronização 100% via IA</span>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <FileSpreadsheet className="w-3 h-3" /> Itens Indexados
                </p>
                <p className="text-3xl font-black text-slate-900">48.920</p>
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Região Ativa
                </p>
                <p className="text-3xl font-black text-slate-900">SP</p>
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Ref. Mês
                </p>
                <p className="text-3xl font-black text-slate-900">Abr/26</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Upload */}
        <Card 
          className="border-slate-200 bg-white shadow-sm hover:border-emerald-500 transition-colors cursor-pointer group" 
          onClick={() => fileInputRef.current?.click()} // 2. Aciona o input real
        >
          <CardContent className="p-6 flex flex-col items-center justify-center h-full text-center relative">
            {/* Input real invisível */}
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              className="hidden" 
            />
            
            {isUploading ? (
              <>
                <RefreshCw className="w-12 h-12 text-emerald-500 mb-4 animate-spin" />
                <h3 className="font-bold text-slate-900 mb-1">Processando Planilha...</h3>
                <p className="text-xs text-slate-500">Mapeando colunas e atualizando valores.</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-slate-50 group-hover:bg-emerald-50 rounded-full flex items-center justify-center mb-4 transition-colors">
                  <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                </div>
                <h3 className="font-bold text-slate-900 mb-1">Importar Nova Base</h3>
                <p className="text-xs text-slate-500 max-w-[200px]">Clique ou arraste o arquivo CSV/XLSX oficial da Caixa Econômica.</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── HISTÓRICO DE IMPORTAÇÕES ─── */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">Histórico de Atualizações</h3>
            <p className="text-sm text-slate-500 mt-1">Acompanhe as últimas inserções na base de dados.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar arquivo ou autor..." 
              className="pl-9 bg-slate-50 border-slate-200 h-9 w-64" 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Arquivo Processado</th>
                <th className="px-6 py-4">Data do Upload</th>
                <th className="px-6 py-4 text-center">Itens Processados</th>
                <th className="px-6 py-4">Região / Mês ref.</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {importacoesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Nenhuma importação encontrada.
                  </td>
                </tr>
              ) : (
                importacoesFiltradas.map((item) => (
                  <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors ${item.status === "Falha" ? "bg-red-50/20" : ""}`}>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{item.arquivo}</p>
                      <p className="text-xs text-slate-400">Enviado por: {item.autor}</p>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-500">{item.dataUpload}</td>
                    <td className="px-6 py-4 text-center font-bold text-slate-700">{item.itens}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">{item.regiao}</span>
                        <span className="text-xs text-slate-400">{item.referencia}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {item.status === "Concluído" ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Concluído</Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 bg-red-50 border-red-100 flex items-center gap-1 w-fit">
                          <AlertTriangle className="w-3 h-3" /> Falha no Parse
                        </Badge>
                      )}
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