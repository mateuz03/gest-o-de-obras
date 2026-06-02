import { Sparkles, Check, TrendingUp, Eye, MessageCircle, Crown, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  PLANOS_ANUNCIO,
  PLANO_LOJA,
  buildDestaqueWhatsappLink,
  type FeaturePlan,
} from "@/lib/featured";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "anuncio" para Pessoa Física, "loja" para Pessoa Jurídica */
  variant: "anuncio" | "loja";
  /** Nome do anúncio ou da loja, usado na mensagem do WhatsApp */
  itemNome?: string;
}

const BENEFICIOS_ANUNCIO = [
  { icon: TrendingUp, texto: "Apareça no topo do feed e venda até 5x mais rápido" },
  { icon: Eye, texto: "Selo de “Destaque” e card diferenciado para chamar atenção" },
  { icon: MessageCircle, texto: "Receba mais contatos diretos de compradores" },
];

const BENEFICIOS_LOJA = [
  { icon: TrendingUp, texto: "Sua loja no topo das buscas do diretório" },
  { icon: Crown, texto: "Selo de “Loja em Destaque” com design premium" },
  { icon: MessageCircle, texto: "Receba contatos diretos e aumente suas vendas" },
];

function PlanCard({
  plano,
  onSelect,
}: {
  plano: FeaturePlan;
  onSelect: (plano: FeaturePlan) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(plano)}
      className={`relative flex flex-col items-start rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
        plano.destaque
          ? "border-amber-300 bg-gradient-to-br from-amber-50 to-white ring-1 ring-amber-200"
          : "border-slate-200 bg-white hover:border-emerald-300"
      }`}
    >
      {plano.destaque && (
        <Badge className="absolute -top-2 right-3 bg-amber-500 text-white hover:bg-amber-500">
          Mais popular
        </Badge>
      )}
      <span className="text-sm font-semibold text-slate-900">{plano.nome}</span>
      <span className="mt-1 text-2xl font-extrabold text-slate-900">{plano.preco}</span>
      <span className="text-xs text-slate-500">por {plano.duracao}</span>
    </button>
  );
}

export function UpgradeDialog({ open, onOpenChange, variant, itemNome }: UpgradeDialogProps) {
  const isLoja = variant === "loja";
  const beneficios = isLoja ? BENEFICIOS_LOJA : BENEFICIOS_ANUNCIO;
  const planos = isLoja ? [PLANO_LOJA] : PLANOS_ANUNCIO;

  const handleSelect = (plano: FeaturePlan) => {
    const alvo = isLoja ? "minha loja" : "meu anúncio";
    const nome = itemNome ? ` "${itemNome}"` : "";
    const mensagem =
      `Olá! Vim pelo Obra Link e quero destacar ${alvo}${nome}.\n\n` +
      `Plano escolhido: ${plano.nome} — ${plano.preco} (${plano.duracao}).\n` +
      `Como faço o pagamento via Pix para ativar o destaque?`;
    window.open(buildDestaqueWhatsappLink(mensagem), "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden p-0">
        {/* Cabeçalho premium */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 px-6 pb-5 pt-6 text-white">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-200 ring-1 ring-amber-300/30">
            {isLoja ? <Crown className="h-3.5 w-3.5" /> : <Rocket className="h-3.5 w-3.5" />}
            {isLoja ? "Plano Loja em Destaque" : "Turbine seu anúncio"}
          </div>
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-xl font-extrabold text-white">
              {isLoja
                ? "Coloque sua loja em destaque"
                : "Destaque seu anúncio e venda mais rápido"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-200">
              {isLoja
                ? "Apareça no topo das buscas e atraia mais compradores para sua vitrine."
                : "Apareça no topo do feed e tenha um card que chama atenção."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Benefícios */}
          <ul className="space-y-3">
            {beneficios.map((b, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm leading-snug text-slate-700">{b.texto}</span>
              </li>
            ))}
          </ul>

          {/* Planos */}
          <div className={`grid gap-3 ${planos.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {planos.map((p) => (
              <PlanCard key={p.id} plano={p} onSelect={handleSelect} />
            ))}
          </div>

          {/* CTA principal */}
          <Button
            onClick={() => handleSelect(planos[planos.length - 1])}
            className="w-full bg-[#25D366] text-base font-semibold text-white hover:bg-[#128C7E]"
            size="lg"
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            {isLoja ? "Quero destacar minha loja" : "Quero destacar meu anúncio"}
          </Button>

          <p className="text-center text-xs text-slate-400">
            <Sparkles className="mr-1 inline h-3 w-3" />
            Pagamento via Pix pelo WhatsApp. Ativamos seu destaque em seguida.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
