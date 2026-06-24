import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const REPORT_REASONS = [
  { value: "conteudo_enganoso", label: "Conteudo enganoso" },
  { value: "fraude", label: "Suspeita de fraude" },
  { value: "preco_irreal", label: "Preco irreal" },
  { value: "conteudo_inadequado", label: "Conteudo inadequado" },
  { value: "duplicado", label: "Anuncio/loja duplicado" },
] as const;

interface ReportDialogProps {
  targetId: string;
  targetName: string;
  targetType: "produto" | "loja";
  buttonClassName?: string;
  buttonLabel?: string;
  buttonVariant?: "ghost" | "outline" | "secondary";
}

export function ReportDialog({
  targetId,
  targetName,
  targetType,
  buttonClassName,
  buttonLabel = "Denunciar",
  buttonVariant = "ghost",
}: ReportDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0].value);
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!user) {
      toast.error("Entre na sua conta para enviar uma denuncia.");
      setOpen(false);
      return;
    }

    if (details.trim().length < 8) {
      toast.error("Descreva rapidamente o motivo da denuncia.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("marketplace_reports").insert({
        reporter_id: user.id,
        target_type: targetType,
        target_id: targetId,
        reason,
        details: details.trim(),
      });

      if (error) throw error;

      toast.success("Denuncia registrada para revisao do admin.");
      setDetails("");
      setReason(REPORT_REASONS[0].value);
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Nao foi possivel registrar a denuncia.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size="sm" className={buttonClassName}>
          <Flag className="mr-2 h-4 w-4" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Denunciar {targetType === "produto" ? "anuncio" : "loja"}</DialogTitle>
          <DialogDescription>
            Esse registro vai para a fila de moderacao do backoffice. Informe o problema com contexto suficiente para analise.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Alvo</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{targetName}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`report-reason-${targetId}`}>Motivo</Label>
            <select
              id={`report-reason-${targetId}`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {REPORT_REASONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`report-details-${targetId}`}>Detalhes</Label>
            <Textarea
              id={`report-details-${targetId}`}
              rows={5}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Explique o que foi encontrado e, se fizer sentido, cite preco, comportamento suspeito ou problema no conteudo."
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Flag className="mr-2 h-4 w-4" />}
            Enviar denuncia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
