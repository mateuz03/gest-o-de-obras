import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, TrendingDown, TrendingUp, Minus, Crown, Award, Wallet, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Tier = "premium" | "padrao" | "economica";

interface OptionData {
  tier: Tier | string;
  nome: string;
  preco_unitario: number;
  durabilidade_anos: number;
  pros: string;
  contras: string;
  subtotal_novo: number;
  subtotal_atual: number;
  diferenca_material: number;
  diferenca_com_bdi: number;
  novo_total_obra: number;
  pct_impacto_total: number;
  sinapi_ref: { codigo: string; descricao: string; unidade: string; preco_total: number } | null;
}

interface CardData {
  item_descricao: string;
  unidade: string;
  quantidade: number;
  preco_atual_unit: number;
  categoria_inferida: string;
  termo_busca_manual: string;
  opcoes: OptionData[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemDescricao: string;
  unidade?: string;
  quantidade?: number;
  precoAtualUnit?: number;
  totalObra: number;
  bdiPercent: number;
}

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const tierMeta: Record<string, { label: string; icon: typeof Crown; color: string; bg: string }> = {
  premium: { label: "Premium", icon: Crown, color: "text-amber-600", bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900" },
  padrao: { label: "Padrão", icon: Award, color: "text-primary", bg: "bg-primary/5 border-primary/30" },
  economica: { label: "Econômica", icon: Wallet, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900" },
};

export function MaterialPerformanceCard({
  open, onOpenChange, itemDescricao, unidade = "un", quantidade = 1,
  precoAtualUnit = 0, totalObra, bdiPercent,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CardData | null>(null);

  useEffect(() => {
    if (!open || !itemDescricao) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setData(null);
      try {
        const { data: resp, error } = await supabase.functions.invoke("material-performance-card", {
          body: {
            item_descricao: itemDescricao,
            unidade,
            quantidade,
            preco_atual_unit: precoAtualUnit,
            total_obra: totalObra,
            bdi_percent: bdiPercent,
          },
        });
        if (cancelled) return;
        if (error) throw error;
        if (resp?.error) throw new Error(resp.error);
        setData(resp as CardData);
      } catch (e: any) {
        if (!cancelled) toast.error(e?.message || "Falha ao carregar comparativo.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [open, itemDescricao, unidade, quantidade, precoAtualUnit, totalObra, bdiPercent]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Card de Performance — {itemDescricao}
          </DialogTitle>
          <DialogDescription>
            Comparativo Premium / Padrão / Econômica com impacto no orçamento total da obra.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-3" />
            <span className="text-muted-foreground">Analisando alternativas com IA...</span>
          </div>
        )}

        {!loading && data && (
          <div className="space-y-4">
            {/* Header summary */}
            <div className="flex flex-wrap gap-2 items-center text-sm bg-muted/40 rounded-lg p-3">
              {data.categoria_inferida && (
                <Badge variant="secondary" className="capitalize">{data.categoria_inferida}</Badge>
              )}
              <span className="text-muted-foreground">Quantidade da obra:</span>
              <span className="font-medium">{data.quantidade} {data.unidade}</span>
              <span className="text-muted-foreground ml-3">Preço unitário atual:</span>
              <span className="font-medium">{formatCurrency(data.preco_atual_unit)}</span>
              <span className="text-muted-foreground ml-3">Total da obra (com BDI):</span>
              <span className="font-mono font-semibold">{formatCurrency(totalObra)}</span>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {data.opcoes.map((opt, i) => {
                const meta = tierMeta[opt.tier] || tierMeta.padrao;
                const Icon = meta.icon;
                const diff = opt.diferenca_com_bdi;
                const isCheaper = diff < -0.01;
                const isMore = diff > 0.01;
                return (
                  <div key={i} className={`rounded-lg border-2 p-4 space-y-3 ${meta.bg}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-5 w-5 ${meta.color}`} />
                        <span className={`font-semibold ${meta.color}`}>{meta.label}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">{opt.durabilidade_anos} anos</Badge>
                    </div>

                    <div>
                      <p className="text-sm font-medium leading-snug">{opt.nome}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatCurrency(opt.preco_unitario)} / {data.unidade}
                      </p>
                    </div>

                    <div className="border-t pt-3 space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Subtotal item</span>
                        <span className="font-mono">{formatCurrency(opt.subtotal_novo)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Impacto na obra</span>
                        <div className="flex items-center gap-1">
                          {isCheaper && <TrendingDown className="h-3.5 w-3.5 text-emerald-600" />}
                          {isMore && <TrendingUp className="h-3.5 w-3.5 text-destructive" />}
                          {!isCheaper && !isMore && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
                          <span className={`text-sm font-bold font-mono ${isCheaper ? "text-emerald-600" : isMore ? "text-destructive" : ""}`}>
                            {diff > 0 ? "+" : ""}{formatCurrency(diff)}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground text-right">
                        ({opt.pct_impacto_total > 0 ? "+" : ""}{opt.pct_impacto_total.toFixed(2)}% do total)
                      </p>
                    </div>

                    <div className="border-t pt-3 space-y-1.5 text-xs">
                      <p><span className="font-medium text-emerald-700">Prós:</span> {opt.pros}</p>
                      <p><span className="font-medium text-destructive">Contras:</span> {opt.contras}</p>
                    </div>

                    {opt.sinapi_ref && (
                      <div className="border-t pt-2 text-[11px] text-muted-foreground">
                        <span className="font-medium">SINAPI:</span> {opt.sinapi_ref.codigo} — {formatCurrency(opt.sinapi_ref.preco_total)}/{opt.sinapi_ref.unidade}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2 justify-between items-center pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                💡 Simulação read-only. Para aplicar a troca, edite o item no orçamento.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(data.termo_busca_manual)}`, "_blank")}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Buscar manual de instalação
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
