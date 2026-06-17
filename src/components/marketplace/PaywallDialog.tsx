import { useState } from "react";
import { Sparkles, Check, Rocket } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PixCheckoutDialog } from "./PixCheckoutDialog";
import { PLANO_PRO, PRO_BENEFITS, formatBRL } from "@/config/marketplacePlans";
import { trackMarketplaceEvent } from "@/lib/marketplaceAnalytics";

interface PaywallDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpgraded?: () => void;
}

export function PaywallDialog({ open, onOpenChange, onUpgraded }: PaywallDialogProps) {
  const [checkout, setCheckout] = useState(false);

  const assinar = () => {
    trackMarketplaceEvent({ eventType: "feature_click", targetType: "plano", metadata: { plan: "pro" } });
    setCheckout(true);
  };

  return (
    <>
      <Dialog open={open && !checkout} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
              <Sparkles className="h-6 w-6 text-emerald-600" />
            </div>
            <DialogTitle className="text-center text-xl">Quer vender mais?</DialogTitle>
            <DialogDescription className="text-center">
              Você atingiu o limite do plano gratuito. Mude para o{" "}
              <span className="font-semibold text-slate-900">plano Profissional</span> e publique
              materiais ilimitados para milhares de compradores.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-slate-900">{formatBRL(PLANO_PRO.valor)}</span>
              <span className="text-slate-500 text-sm">/ mês</span>
            </div>
            <ul className="mt-3 space-y-2">
              {PRO_BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {b}
                </li>
              ))}
            </ul>
          </div>

          <Button onClick={assinar} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
            <Rocket className="h-4 w-4 mr-2" /> Assinar Agora
          </Button>
          <button onClick={() => onOpenChange(false)} className="text-sm text-slate-400 hover:text-slate-600">
            Agora não
          </button>
        </DialogContent>
      </Dialog>

      <PixCheckoutDialog
        open={checkout}
        onOpenChange={(v) => { setCheckout(v); if (!v) onOpenChange(false); }}
        purpose="plano_pro"
        plan={PLANO_PRO}
        title="Assinar Plano Profissional"
        description="Pague via Pix e libere publicações ilimitadas na hora."
        onPaid={() => { onUpgraded?.(); }}
      />
    </>
  );
}
