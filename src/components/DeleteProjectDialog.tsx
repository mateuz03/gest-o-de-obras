import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
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
import { toast } from "sonner";
import { deleteAnalysisCompletely } from "@/lib/deleteProject";

interface DeleteProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysisId: string;
  projectName: string;
  userId?: string;
  onDeleted?: () => void;
}

export function DeleteProjectDialog({
  open,
  onOpenChange,
  analysisId,
  projectName,
  userId,
  onDeleted,
}: DeleteProjectDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteAnalysisCompletely(analysisId, userId);
      toast.success("Projeto excluído com sucesso.");
      onOpenChange(false);
      onDeleted?.();
    } catch (e: any) {
      console.error(e);
      toast.error(`Falha ao excluir: ${e?.message || "erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" /> Excluir projeto
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-600">
            Tem certeza que deseja excluir o projeto{" "}
            <span className="font-semibold text-slate-900">{projectName}</span>? Esta ação apagará
            permanentemente o orçamento, cronograma e arquivos associados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
