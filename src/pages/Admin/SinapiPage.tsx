import { useEffect, useState } from "react";
import { Database, FileSpreadsheet, FileText, Loader2, RefreshCw, UploadCloud } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SinapiPdfUpload } from "@/components/SinapiPdfUpload";
import { SinapiUploadHistory } from "@/components/SinapiUploadHistory";
import { SinapiUploader } from "@/components/SinapiUploader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UploadSummary {
  nome_arquivo: string;
  regiao: string | null;
  mes_ano: string | null;
  qtd_itens: number;
  status: string;
  created_at: string;
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SinapiPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [totalUploads, setTotalUploads] = useState(0);
  const [latestUpload, setLatestUpload] = useState<UploadSummary | null>(null);

  async function carregar(forced = false) {
    if (forced) setRefreshing(true);
    else setLoading(true);

    try {
      const [{ count: rowsCount, error: rowsError }, { count: uploadsCount, error: uploadsError }, latestResult] = await Promise.all([
        supabase.from("referencia_sinapi").select("codigo", { count: "exact", head: true }),
        supabase.from("sinapi_uploads").select("id", { count: "exact", head: true }),
        supabase
          .from("sinapi_uploads")
          .select("nome_arquivo, regiao, mes_ano, qtd_itens, status, created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (rowsError) throw rowsError;
      if (uploadsError) throw uploadsError;
      if (latestResult.error) throw latestResult.error;

      setTotalRows(rowsCount ?? 0);
      setTotalUploads(uploadsCount ?? 0);
      setLatestUpload((latestResult.data as UploadSummary | null) ?? null);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível carregar o status da base SINAPI.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, [refreshKey]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Backoffice de dados</p>
          <h2 className="mt-1 text-3xl font-extrabold text-slate-900">Base SINAPI</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Governança da base de preços que abastece orçamento, matching e análise de materiais em todo o ecossistema.
          </p>
        </div>
        <Button variant="outline" className="border-slate-200 bg-white" onClick={() => void carregar(true)} disabled={refreshing}>
          {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Atualizar visão
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <InfoCard
              icon={Database}
              title="Itens indexados"
              value={totalRows.toLocaleString("pt-BR")}
              helper="Linhas disponíveis na referência nacional"
            />
            <InfoCard
              icon={UploadCloud}
              title="Importações registradas"
              value={totalUploads.toLocaleString("pt-BR")}
              helper="Histórico consolidado de cargas"
            />
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Última carga</p>
                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {latestUpload?.nome_arquivo ?? "Nenhuma importação"}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`border ${
                      latestUpload?.status === "concluido"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    {latestUpload?.status ?? "Sem status"}
                  </Badge>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-slate-500">
                  <p>Referência: {latestUpload?.mes_ano || "—"}</p>
                  <p>Região: {latestUpload?.regiao || "—"}</p>
                  <p>Processado em: {formatDateTime(latestUpload?.created_at)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="p-6">
              <Tabs defaultValue="csv" className="w-full">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Ingestão</p>
                    <h3 className="mt-1 text-xl font-bold text-slate-900">Atualização operacional da base</h3>
                  </div>
                  <TabsList className="grid w-full max-w-xl grid-cols-2">
                    <TabsTrigger value="csv" className="gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      CSV / XLSX
                    </TabsTrigger>
                    <TabsTrigger value="pdf" className="gap-2">
                      <FileText className="h-4 w-4" />
                      PDF Oficial
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="csv" className="mt-6">
                  <SinapiUploader onImported={() => setRefreshKey((value) => value + 1)} />
                </TabsContent>

                <TabsContent value="pdf" className="mt-6">
                  <SinapiPdfUpload onImported={() => setRefreshKey((value) => value + 1)} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <SinapiUploadHistory refreshKey={refreshKey} />
        </>
      )}
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  value,
  helper,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  helper: string;
}) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
          </div>
          <div className="rounded-2xl bg-slate-100 p-3">
            <Icon className="h-5 w-5 text-slate-600" />
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-500">{helper}</p>
      </CardContent>
    </Card>
  );
}
