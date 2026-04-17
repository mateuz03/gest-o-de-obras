import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { History, Trash2, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface UploadRow {
  id: string;
  nome_arquivo: string;
  tipo: string;
  regiao: string | null;
  mes_ano: string | null;
  qtd_itens: number;
  qtd_paginas: number | null;
  status: string;
  created_at: string;
}

export function SinapiUploadHistory({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("sinapi_uploads" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) console.error(error);
    setRows(((data as unknown) as UploadRow[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [refreshKey]);

  async function handleDelete(id: string) {
    if (!confirm("Remover este registro do histórico? (os preços já importados permanecem na base)")) return;
    const { error } = await supabase.from("sinapi_uploads" as any).delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover");
    } else {
      toast.success("Removido do histórico");
      load();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Histórico de Importações
        </CardTitle>
        <CardDescription>Arquivos SINAPI já enviados (Excel ou PDF).</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando histórico...
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhuma importação ainda. Envie sua primeira planilha ou PDF acima.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Mês/Ano</TableHead>
                  <TableHead className="text-right">Itens</TableHead>
                  <TableHead className="text-right">Págs.</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm flex items-center gap-2 max-w-[260px] truncate">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate" title={r.nome_arquivo}>{r.nome_arquivo}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.tipo === "composicao" ? "default" : "secondary"} className="text-xs capitalize">
                        {r.tipo === "composicao" ? "Composição" : "Insumo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{r.regiao || "—"}</TableCell>
                    <TableCell className="text-xs">{r.mes_ano || "—"}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{r.qtd_itens}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{r.qtd_paginas || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
