import { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle2, Copy, QrCode, Clock } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatBRL, type PixPurpose, type PlanOption } from "@/config/marketplacePlans";

interface PixCheckoutDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  purpose: PixPurpose;
  plan: PlanOption;
  targetId?: string | null;
  title: string;
  description: string;
  onPaid?: () => void;
}

type Charge = {
  payment_id: string;
  valor: number;
  qr_code: string | null;
  qr_code_base64: string | null;
  ticket_url: string | null;
  expires_at: string;
};

export function PixCheckoutDialog({
  open, onOpenChange, purpose, plan, targetId, title, description, onPaid,
}: PixCheckoutDialogProps) {
  const [loading, setLoading] = useState(false);
  const [charge, setCharge] = useState<Charge | null>(null);
  const [paid, setPaid] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) {
      setCharge(null);
      setPaid(false);
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    gerarCobranca();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function gerarCobranca() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-pix-charge", {
        body: { purpose, plan: plan.key, target_id: targetId ?? undefined },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error("falha");
      setCharge(data as Charge);
      iniciarPolling((data as Charge).payment_id);
    } catch {
      toast.error("Não foi possível gerar o Pix. Tente novamente.");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  function iniciarPolling(paymentId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from("pix_payments").select("status").eq("id", paymentId).maybeSingle();
      if (data?.status === "paid") {
        if (pollRef.current) clearInterval(pollRef.current);
        setPaid(true);
        toast.success("Pagamento confirmado! Destaque ativado.");
        onPaid?.();
      }
    }, 4000);
  }

  const copiar = () => {
    if (charge?.qr_code) {
      navigator.clipboard.writeText(charge.qr_code);
      toast.success("Código Pix copiado!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {loading || !charge ? (
          <div className="flex flex-col items-center py-10 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-3" />
            Gerando cobrança Pix...
          </div>
        ) : paid ? (
          <div className="flex flex-col items-center py-10 text-center">
            <CheckCircle2 className="h-14 w-14 text-emerald-600 mb-3" />
            <h3 className="text-lg font-bold text-slate-900">Pagamento confirmado!</h3>
            <p className="text-slate-500 text-sm mt-1">Seu destaque já está ativo.</p>
            <Button className="mt-5 bg-emerald-600 hover:bg-emerald-700" onClick={() => onOpenChange(false)}>
              Concluir
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
              <span className="text-sm text-slate-600">Valor</span>
              <span className="font-bold text-slate-900">{formatBRL(charge.valor)}</span>
            </div>

            {charge.qr_code_base64 ? (
              <div className="flex justify-center">
                <img
                  src={`data:image/png;base64,${charge.qr_code_base64}`}
                  alt="QR Code Pix"
                  className="h-52 w-52 rounded-lg border border-slate-200"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-slate-400">
                <QrCode className="h-12 w-12 mb-2" />
                <span className="text-sm">Use o código copia e cola abaixo.</span>
              </div>
            )}

            {charge.qr_code && (
              <Button variant="outline" className="w-full" onClick={copiar}>
                <Copy className="h-4 w-4 mr-2" /> Copiar código Pix
              </Button>
            )}

            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              Expira em 15 minutos. A confirmação é automática.
            </div>
            <div className="flex items-center justify-center text-xs text-slate-400">
              <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> Aguardando pagamento...
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
