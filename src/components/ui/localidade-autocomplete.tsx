import { useState, useEffect } from "react";
import { Check, MapPin, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Localidade {
  id: string | number;
  nome: string;
  uf: string;
}

interface LocalidadeAutocompleteProps {
  value: string;
  onChange: (value: string, uf?: string) => void;
  placeholder?: string;
}

export function LocalidadeAutocomplete({
  value,
  onChange,
  placeholder = "Ex: São Paulo - SP, Sorocaba - SP...",
}: LocalidadeAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [debounceBusca, setDebounceBusca] = useState("");
  const [sugestoes, setSugestoes] = useState<Localidade[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. Debounce para não inundar a API a cada caractere
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounceBusca(busca);
    }, 300);

    return () => clearTimeout(timer);
  }, [busca]);

  // 2. Busca dinâmica na API do IBGE
  useEffect(() => {
    if (debounceBusca.trim().length < 2) {
      setSugestoes([]);
      return;
    }

    async function buscarCidades() {
      setLoading(true);
      try {
        // Mudamos para o endpoint de municípios filtrando por query limpa
        const url = `https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome`;
        const response = await fetch(url);
        const data = await response.json();

        // Como o IBGE não aceita filtro de texto muito quebrado na URL de forma estável,
        // filtramos localmente os 10 melhores resultados para garantir performance instantânea
        const termo = debounceBusca.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        const filtradas = data
          .filter((item: any) => {
            const nomeSemAcento = item.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return nomeSemAcento.includes(termo);
          })
          .slice(0, 6)
          .map((item: any) => ({
            id: item.id,
            nome: item.nome,
            uf: item.microrregiao.mesorregiao.UF.sigla,
          }));

        setSugestoes(filtradas);
      } catch (error) {
        console.error("Erro ao buscar cidades no IBGE:", error);
      } finally {
        setLoading(false);
      }
    }

    buscarCidades();
  }, [debounceBusca]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* O PopoverTrigger agora abraça diretamente o Input principal do formulário */}
      <PopoverTrigger asChild>
        <div className="relative w-full cursor-pointer">
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
          <Input
            placeholder={placeholder}
            value={value}
            readOnly // Evita que o teclado mobile quebre o layout ao abrir o popover
            onClick={() => setOpen(true)}
            className="pl-9 cursor-pointer bg-white border-slate-200 focus:border-emerald-500 w-full"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-emerald-600 z-10" />
          )}
        </div>
      </PopoverTrigger>
      
      {/* Caixa suspensa contendo o campo de digitação real e os resultados */}
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-2 bg-white rounded-xl shadow-xl border border-slate-200 z-[100]" 
        align="start"
        sideOffset={5}
      >
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Digite o nome da cidade..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-9 text-sm pl-8 border-slate-100 focus-visible:ring-emerald-500"
            autoFocus
          />
        </div>

        <div className="max-h-[200px] overflow-y-auto space-y-0.5">
          {busca.trim().length < 2 && (
            <p className="p-3 text-xs text-slate-400 text-center">
              Digite pelo menos 2 letras para buscar...
            </p>
          )}

          {!loading && busca.trim().length >= 2 && congestaoInexistente(sugestoes) && (
            <p className="p-3 text-xs text-slate-400 text-center">
              Nenhuma localidade encontrada.
            </p>
          )}

          {sugestoes.map((local) => {
            const labelCompleto = `${local.nome} - ${local.uf}`;
            return (
              <button
                key={local.id}
                type="button"
                onClick={() => {
                  onChange(labelCompleto, local.uf);
                  setBusca(""); // Limpa a busca interna para a próxima vez
                  setOpen(false); // Fecha o dropdown
                }}
                className={cn(
                  "w-full text-left flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
                  value === labelCompleto
                    ? "bg-emerald-50 text-emerald-900 font-medium"
                    : "text-slate-700 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-2">
                  <span>{local.nome}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-bold uppercase">
                    {local.uf}
                  </span>
                </div>
                {value === labelCompleto && (
                  <Check className="h-4 w-4 text-emerald-600" />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Auxiliar simples para checar array vazio
function congestaoInexistente(arr: any[]) {
  return !arr || arr.length === 0;
}