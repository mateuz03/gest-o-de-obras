import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  File as FileIcon,
  Box,
  Download,
  ExternalLink,
  FolderOpen,
  Inbox,
} from "lucide-react";

interface SourceFile {
  name: string;
  originalName: string;
  path: string;
  url: string;
  ext: string;
  sizeBytes: number;
  createdAt: string;
}

interface SourceFilesPanelProps {
  analysisId: string;
  userId: string;
}

function formatBytes(bytes: number) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(iso: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function pickIcon(ext: string) {
  const e = ext.toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "gif", "heic"].includes(e))
    return { Icon: ImageIcon, label: "Imagem", color: "bg-emerald-100 text-emerald-700" };
  if (e === "pdf") return { Icon: FileText, label: "PDF", color: "bg-red-100 text-red-700" };
  if (["xlsx", "xls", "csv"].includes(e))
    return { Icon: FileSpreadsheet, label: "Planilha", color: "bg-blue-100 text-blue-700" };
  if (e === "dwg") return { Icon: Box, label: "DWG", color: "bg-amber-100 text-amber-700" };
  return { Icon: FileIcon, label: e.toUpperCase() || "Arquivo", color: "bg-slate-100 text-slate-700" };
}

// Strip the "<timestamp>_" prefix added on upload for display
function originalName(name: string) {
  return name.replace(/^\d{10,}_/, "");
}

export function SourceFilesPanel({ analysisId, userId }: SourceFilesPanelProps) {
  const [files, setFiles] = useState<SourceFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const prefix = `${userId}/${analysisId}`;
        const { data, error } = await supabase.storage.from("blueprints").list(prefix, {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" },
        });
        if (error) {
          console.error("list source files error", error);
          setFiles([]);
          return;
        }
        const items = (data || []).filter((d) => d.name && !d.name.endsWith("/"));
        const mapped: SourceFile[] = items.map((it: any) => {
          const fullPath = `${prefix}/${it.name}`;
          const { data: urlData } = supabase.storage.from("blueprints").getPublicUrl(fullPath);
          const ext = (it.name.split(".").pop() || "").toLowerCase();
          return {
            name: it.name,
            originalName: originalName(it.name),
            path: fullPath,
            url: urlData.publicUrl,
            ext,
            sizeBytes: it.metadata?.size || 0,
            createdAt: it.created_at || it.updated_at || "",
          };
        });
        setFiles(mapped);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [analysisId, userId]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Arquivos Base do Orçamento</CardTitle>
        </div>
        <CardDescription>
          Rastreabilidade dos arquivos enviados à IA para gerar o quantitativo desta análise.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 px-4 border border-dashed rounded-lg bg-muted/30">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Inbox className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">Nenhum arquivo base encontrado para este orçamento</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Esta estimativa pode ter sido inserida manualmente ou criada antes do registro de
              arquivos por análise.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {files.map((f) => {
              const { Icon, label, color } = pickIcon(f.ext);
              return (
                <div
                  key={f.path}
                  className="group rounded-lg border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-md flex items-center justify-center shrink-0 ${color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm leading-tight break-words" title={f.originalName}>
                        {f.originalName}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] py-0 h-4">{label}</Badge>
                        <span className="text-[11px] text-muted-foreground">{formatBytes(f.sizeBytes)}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">{formatDate(f.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs"
                    >
                      <a href={f.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" /> Abrir
                      </a>
                    </Button>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs"
                    >
                      <a href={f.url} download={f.originalName}>
                        <Download className="h-3.5 w-3.5" /> Baixar
                      </a>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
