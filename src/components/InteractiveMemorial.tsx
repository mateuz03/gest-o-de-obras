import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  Download,
  Info,
  Settings2,
  ShieldCheck,
  Timer,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AnalysisResult, BudgetItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type MemorialItem = BudgetItem & {
  category: string;
};

type MaterialAlternative = {
  id: string;
  label: string;
  unitPrice: number;
  durability: string;
  warranty: string;
};

interface InteractiveMemorialProps {
  analysisResult?: AnalysisResult;
  totalObra?: number;
}

const fallbackItems: MemorialItem[] = [
  {
    item: "REV-001",
    descricao: "Piso Porcelanato Esmaltado 60x60",
    fornecedor: "Mock",
    marca: "Linha Standard",
    quantidade: 120,
    unidade: "m²",
    preco_unitario: 118,
    preco_total: 14160,
    origem_preco: "mock",
    category: "Revestimentos",
  },
  {
    item: "ESQ-004",
    descricao: "Janela de Alumínio com Vidro Temperado",
    fornecedor: "Mock",
    marca: "Linha Premium",
    quantidade: 8,
    unidade: "un",
    preco_unitario: 920,
    preco_total: 7360,
    origem_preco: "mock",
    category: "Esquadrias",
  },
  {
    item: "HID-012",
    descricao: "Misturador Monocomando para Banheiro",
    fornecedor: "Mock",
    marca: "Linha B2B",
    quantidade: 6,
    unidade: "un",
    preco_unitario: 540,
    preco_total: 3240,
    origem_preco: "mock",
    category: "Hidráulica",
  },
];

const categoryAliases: Record<string, string> = {
  revestimento: "Revestimentos",
  acabamento: "Revestimentos",
  piso: "Revestimentos",
  esquadria: "Esquadrias",
  janela: "Esquadrias",
  porta: "Esquadrias",
  hidraulica: "Hidráulica",
  hidráulica: "Hidráulica",
  louca: "Hidráulica",
  louça: "Hidráulica",
  metais: "Hidráulica",
};

function toNumber(value: number | string | undefined | null): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseFloat(value.replace(".", "").replace(",", ".")) || 0;
  return 0;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function normalizeCategory(stageName: string, itemDescription: string): string {
  const source = `${stageName} ${itemDescription}`.toLowerCase();
  const match = Object.entries(categoryAliases).find(([keyword]) => source.includes(keyword));
  return match?.[1] || stageName || "Materiais";
}

function getSpecs(item: MemorialItem) {
  const description = item.descricao.toLowerCase();
  if (description.includes("porcelanato") || description.includes("piso")) {
    return { durability: "15 anos", warranty: "5 anos", currentStandard: "Padrão Médio: Porcelanato" };
  }
  if (description.includes("janela") || description.includes("porta") || description.includes("esquadria")) {
    return { durability: "20 anos", warranty: "8 anos", currentStandard: "Padrão Médio: Alumínio" };
  }
  if (description.includes("misturador") || description.includes("torneira") || description.includes("registro")) {
    return { durability: "12 anos", warranty: "3 anos", currentStandard: "Padrão Médio: Metais Cromados" };
  }
  return { durability: "10 anos", warranty: "2 anos", currentStandard: "Padrão Médio: Material especificado" };
}

function getAlternatives(item: MemorialItem): MaterialAlternative[] {
  const currentUnitPrice = toNumber(item.preco_unitario) || toNumber(item.preco_total) / Math.max(toNumber(item.quantidade), 1);
  const description = item.descricao.toLowerCase();

  if (description.includes("porcelanato") || description.includes("piso")) {
    return [
      { id: "eco-ceramica", label: "Padrão Econômico: Cerâmica Branca", unitPrice: currentUnitPrice * 0.7, durability: "8 anos", warranty: "2 anos" },
      { id: "alto-retificado", label: "Padrão Alto: Porcelanato Retificado Grande Formato", unitPrice: currentUnitPrice * 1.42, durability: "20 anos", warranty: "7 anos" },
    ];
  }

  if (description.includes("janela") || description.includes("porta") || description.includes("esquadria")) {
    return [
      { id: "eco-aluminio", label: "Padrão Econômico: Alumínio Natural", unitPrice: currentUnitPrice * 0.78, durability: "15 anos", warranty: "5 anos" },
      { id: "alto-pvc", label: "Padrão Alto: PVC Acústico Premium", unitPrice: currentUnitPrice * 1.35, durability: "25 anos", warranty: "10 anos" },
    ];
  }

  return [
    { id: "eco-base", label: "Padrão Econômico: Linha Essencial", unitPrice: currentUnitPrice * 0.74, durability: "7 anos", warranty: "1 ano" },
    { id: "alto-premium", label: "Padrão Alto: Linha Premium", unitPrice: currentUnitPrice * 1.38, durability: "18 anos", warranty: "6 anos" },
  ];
}

export function InteractiveMemorial({ analysisResult, totalObra = 0 }: InteractiveMemorialProps) {
  const [selectedItem, setSelectedItem] = useState<MemorialItem | null>(null);
  const [selectedAlternativeId, setSelectedAlternativeId] = useState<string>("");

  const itemsByCategory = useMemo(() => {
    const sourceItems = analysisResult?.macro_etapas?.flatMap((stage) =>
      stage.itens.map((item) => ({
        ...item,
        category: normalizeCategory(stage.nome, item.descricao),
      })),
    );

    const items = sourceItems?.length ? sourceItems : fallbackItems;
    return items.reduce<Record<string, MemorialItem[]>>((acc, item) => {
      acc[item.category] = [...(acc[item.category] || []), item];
      return acc;
    }, {});
  }, [analysisResult]);

  const alternatives = selectedItem ? getAlternatives(selectedItem) : [];
  const selectedAlternative = alternatives.find((alternative) => alternative.id === selectedAlternativeId) || null;
  const currentTotal = selectedItem ? toNumber(selectedItem.preco_total) : 0;
  const quantity = selectedItem ? Math.max(toNumber(selectedItem.quantidade), 1) : 1;
  const alternativeTotal = selectedAlternative ? selectedAlternative.unitPrice * quantity : 0;
  const impact = selectedAlternative ? alternativeTotal - currentTotal : 0;
  const obraTotalBase = totalObra || Number(analysisResult?.resumo_final?.total_geral) || 180000;
  const impactPercent = obraTotalBase > 0 ? (impact / obraTotalBase) * 100 : 0;
  const specs = selectedItem ? getSpecs(selectedItem) : null;

  const openPanel = (item: MemorialItem) => {
    setSelectedItem(item);
    setSelectedAlternativeId("");
  };

  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-4 shadow-sm md:p-5">
      <div className="mb-5 flex flex-col gap-1">
        <Badge variant="secondary" className="w-fit border border-border bg-muted text-foreground">
          Memorial Interativo
        </Badge>
        <h3 className="text-xl font-bold text-foreground">Simulação paramétrica de materiais</h3>
        <p className="text-sm text-muted-foreground">Avalie especificações, alternativas e impacto financeiro antes de alterar o orçamento.</p>
      </div>

      <div className="space-y-5">
        {Object.entries(itemsByCategory).map(([category, items]) => (
          <div key={category} className="space-y-2">
            <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
              <h4 className="text-sm font-bold uppercase tracking-wide text-foreground">{category}</h4>
              <span className="text-xs font-medium text-muted-foreground">{items.length} itens</span>
            </div>
            <div className="divide-y divide-border rounded-lg border border-border bg-card">
              {items.map((item, index) => (
                <button
                  key={`${category}-${item.item}-${index}`}
                  type="button"
                  onClick={() => openPanel(item)}
                  className="group flex w-full cursor-pointer items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-muted"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{item.descricao}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {toNumber(item.quantidade)} {item.unidade} · {item.marca || "Sem marca definida"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-bold text-foreground">{formatCurrency(toNumber(item.preco_total))}</span>
                    <Settings2 className="h-4 w-4 text-accent opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedItem && specs && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label={`Performance de ${selectedItem.descricao}`}
              className="fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col border-l border-border bg-card shadow-2xl sm:w-[440px] lg:w-[30vw] lg:min-w-[420px]"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
            >
              <header className="border-b border-border p-5 pr-14">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="absolute right-4 top-4 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Fechar painel"
                >
                  <X className="h-4 w-4" />
                </button>
                <Badge className="mb-3 bg-accent text-accent-foreground hover:bg-accent">{selectedItem.category}</Badge>
                <h2 className="text-xl font-bold leading-tight text-foreground">{selectedItem.descricao}</h2>
                <p className="mt-2 text-sm text-muted-foreground">Valor atual: {formatCurrency(currentTotal)}</p>
              </header>

              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                <section className="rounded-lg border border-border bg-background p-4">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
                    <Info className="h-4 w-4 text-accent" />
                    Especificações Técnicas
                  </h3>
                  <div className="grid gap-3">
                    <div className="flex items-center gap-3 rounded-md bg-card p-3">
                      <Timer className="h-5 w-5 text-accent" />
                      <div>
                        <p className="text-xs text-muted-foreground">Durabilidade Estimada</p>
                        <p className="text-sm font-bold text-foreground">{selectedAlternative?.durability || specs.durability}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-md bg-card p-3">
                      <ShieldCheck className="h-5 w-5 text-accent" />
                      <div>
                        <p className="text-xs text-muted-foreground">Garantia do Fabricante</p>
                        <p className="text-sm font-bold text-foreground">{selectedAlternative?.warranty || specs.warranty}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full justify-start border-border text-foreground">
                      <Download className="mr-2 h-4 w-4" />
                      Ver Manual de Instalação (PDF)
                    </Button>
                  </div>
                </section>

                <section className="rounded-lg border border-accent/20 bg-accent/5 p-4">
                  <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-foreground">
                    <BadgeCheck className="h-4 w-4 text-accent" />
                    Simulador de Substituição
                  </h3>
                  <p className="mb-4 text-xs text-muted-foreground">Atual: {specs.currentStandard}</p>
                  <Select value={selectedAlternativeId} onValueChange={setSelectedAlternativeId}>
                    <SelectTrigger className="bg-card">
                      <SelectValue placeholder="Selecionar alternativa de material" />
                    </SelectTrigger>
                    <SelectContent>
                      {alternatives.map((alternative) => (
                        <SelectItem key={alternative.id} value={alternative.id}>
                          {alternative.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <AnimatePresence mode="wait">
                    {selectedAlternative && (
                      <motion.div
                        key={selectedAlternative.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18 }}
                        className={cn(
                          "mt-4 rounded-lg border p-4",
                          impact <= 0 ? "border-accent/25 bg-accent/10" : "border-destructive/25 bg-destructive/10",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn("rounded-full p-2", impact <= 0 ? "bg-accent text-accent-foreground" : "bg-destructive text-destructive-foreground")}>
                            {impact <= 0 ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className={cn("text-base font-bold", impact <= 0 ? "text-accent" : "text-destructive")}>
                              {impact <= 0 ? "Economia de " : "Custo Adicional de "}
                              {formatCurrency(Math.abs(impact))}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-foreground">
                              {impactPercent > 0 ? "+" : ""}{impactPercent.toFixed(1)}% no Custo Total da Obra
                            </p>
                            <p className="mt-2 text-xs text-muted-foreground">
                              Novo subtotal do item: {formatCurrency(alternativeTotal)}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>
              </div>

              <footer className="border-t border-border p-5">
                <Button
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                  disabled={!selectedAlternative}
                  onClick={() => toast.success("Substituição simulada. Aplicação real ficará disponível na próxima versão.")}
                >
                  Aplicar Substituição no Orçamento
                </Button>
              </footer>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}