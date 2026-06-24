import { useRef, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { validateUploadedFile } from "@/lib/upload/validateFile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, ImageOff, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

export const PRESET_COVERS = [
  "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1496307653780-42ee777d4833?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1431576901776-e539bd916ba2?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1565108391713-c8b1ad9d5e64?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1429497419816-9ca5cfb4571a?auto=format&fit=crop&w=800&q=80",
];

interface CoverPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysisId: string;
  currentCover?: string | null;
  onSaved: (newUrl: string | null) => void;
}

export function CoverPickerDialog({
  open,
  onOpenChange,
  analysisId,
  currentCover,
  onSaved,
}: CoverPickerDialogProps) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(currentCover ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!user) return;

    const validation = await validateUploadedFile(file, {
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
      maxSizeBytes: 5 * 1024 * 1024,
    });

    if (!validation.valid) {
      toast.error(validation.error || "Imagem invalida.");
      return;
    }

    setUploading(true);
    try {
      const safeName = validation.sanitizedName || file.name;
      const ext = safeName.split(".").pop() || "jpg";
      const path = `${user.id}/${analysisId}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("project-covers")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("project-covers").getPublicUrl(path);
      setSelected(data.publicUrl);
      toast.success("Imagem carregada. Clique em Salvar para aplicar.");
    } catch (error: any) {
      toast.error(`Falha no upload: ${error?.message || "tente novamente"}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("analyses")
        .update({ cover_image_url: selected })
        .eq("id", analysisId);

      if (error) throw error;

      onSaved(selected);
      toast.success("Capa atualizada");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Erro ao salvar: ${error?.message || ""}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Imagem de capa do projeto</DialogTitle>
          <DialogDescription>
            Escolha uma imagem da galeria ou faca upload de uma capa personalizada.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="gallery" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="gallery">Galeria</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="mt-4">
            <div className="grid max-h-[420px] grid-cols-3 gap-3 overflow-y-auto pr-1">
              {PRESET_COVERS.map((url) => {
                const isSelected = selected === url;

                return (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setSelected(url)}
                    className={cn(
                      "group relative aspect-video overflow-hidden rounded-lg border-2 transition-all",
                      isSelected
                        ? "border-emerald-500 ring-2 ring-emerald-200"
                        : "border-transparent hover:border-slate-300",
                    )}
                  >
                    <img src={url} alt="Capa" loading="lazy" className="h-full w-full object-cover" />
                    {isSelected ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/30">
                        <div className="rounded-full bg-emerald-500 p-1.5">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="upload" className="mt-4">
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center transition-colors hover:border-emerald-400 hover:bg-emerald-50/30"
              >
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                ) : (
                  <Upload className="h-8 w-8 text-slate-400" />
                )}
                <p className="text-sm font-medium text-slate-700">
                  {uploading ? "Enviando..." : "Clique para enviar uma imagem"}
                </p>
                <p className="text-xs text-slate-500">JPG, PNG ou WEBP ate 5MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleFile(file);
                  }
                  event.target.value = "";
                }}
              />

              {selected ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-600">Pre-visualizacao:</p>
                  <div className="aspect-video overflow-hidden rounded-lg border border-slate-200">
                    <img src={selected} alt="Pre-visualizacao" className="h-full w-full object-cover" />
                  </div>
                </div>
              ) : null}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          {currentCover ? (
            <Button
              variant="outline"
              onClick={() => setSelected(null)}
              className="mr-auto text-slate-600"
            >
              <ImageOff className="mr-2 h-4 w-4" /> Remover capa
            </Button>
          ) : null}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || uploading}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar capa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
