import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Save, Settings, ShieldAlert, Store, Wrench } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SettingRow {
  key: string;
  value: {
    enabled?: boolean;
    message?: string;
  };
}

const DEFAULT_MESSAGE = "A plataforma está temporariamente em manutenção. Tente novamente em instantes.";

export default function Configuracoes() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmMaintenance, setConfirmMaintenance] = useState(false);

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState(DEFAULT_MESSAGE);
  const [sellerOnboardingOpen, setSellerOnboardingOpen] = useState(true);

  async function carregar() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("key, value")
        .in("key", ["maintenance_mode", "seller_onboarding"]);

      if (error) throw error;

      const rows = ((data as SettingRow[]) ?? []).reduce<Record<string, SettingRow["value"]>>((acc, row) => {
        acc[row.key] = row.value || {};
        return acc;
      }, {});

      setMaintenanceMode(rows.maintenance_mode?.enabled === true);
      setMaintenanceMessage(rows.maintenance_mode?.message || DEFAULT_MESSAGE);
      setSellerOnboardingOpen(rows.seller_onboarding?.enabled !== false);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível carregar as configurações globais.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  const dirty = useMemo(() => {
    return true;
  }, [maintenanceMode, maintenanceMessage, sellerOnboardingOpen]);

  async function persistir() {
    if (!user) return;
    if (!maintenanceMessage.trim()) {
      toast.error("Informe a mensagem exibida durante a manutenção.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("system_settings")
        .upsert([
          {
            key: "maintenance_mode",
            value: {
              enabled: maintenanceMode,
              message: maintenanceMessage.trim(),
            },
            updated_by: user.id,
            description: "Bloqueia o acesso de usuários não administradores.",
          },
          {
            key: "seller_onboarding",
            value: {
              enabled: sellerOnboardingOpen,
            },
            updated_by: user.id,
            description: "Permite novas submissões de lojas no marketplace.",
          },
        ]);

      if (error) throw error;

      toast.success("Configurações operacionais salvas.");
      await carregar();
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível salvar as configurações.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Operação</p>
          <h2 className="mt-1 flex items-center gap-3 text-3xl font-extrabold text-slate-900">
            <Settings className="h-8 w-8 text-emerald-600" />
            Configurações globais
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Flags operacionais reais, sem armazenar segredo sensível no front. Chaves privadas continuam sob gestão de ambiente.
          </p>
        </div>
        <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => void persistir()} disabled={saving || !dirty}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar mudanças
        </Button>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="space-y-6 p-6">
          <div className="flex items-center gap-3">
            <Wrench className="h-5 w-5 text-emerald-600" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">Flags de plataforma</h3>
              <p className="text-sm text-slate-500">Toggles que alteram o comportamento real do produto.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-600" />
                  <p className="font-semibold text-slate-900">Modo de manutenção</p>
                  <Badge
                    variant="outline"
                    className={`border ${
                      maintenanceMode
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {maintenanceMode ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Quando ativo, bloqueia o acesso das áreas privadas para usuários comuns e mantém apenas administradores operando.
                </p>
              </div>
              <Switch
                checked={maintenanceMode}
                onCheckedChange={(checked) => {
                  if (checked) setConfirmMaintenance(true);
                  else setMaintenanceMode(false);
                }}
              />
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="maintenance-message">Mensagem mostrada ao usuário</Label>
              <Textarea
                id="maintenance-message"
                rows={4}
                value={maintenanceMessage}
                onChange={(event) => setMaintenanceMessage(event.target.value)}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-emerald-600" />
                  <p className="font-semibold text-slate-900">Cadastro de novas lojas</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Controla o onboarding de novos CNPJs no marketplace. Lojas já aprovadas continuam podendo atualizar a vitrine.
                </p>
              </div>
              <Switch checked={sellerOnboardingOpen} onCheckedChange={setSellerOnboardingOpen} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-slate-600" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">Integrações sensíveis</h3>
              <p className="text-sm text-slate-500">Segredos não são mais editados no painel para evitar vazamento e falsa sensação de persistência.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <IntegrationCard
              title="OpenAI / IA"
              description="Gerenciado por variável de ambiente no runtime das Edge Functions."
              status="Somente leitura"
            />
            <IntegrationCard
              title="Mercado Pago / Pix"
              description="Tokens e webhook seguem no ambiente do backend e não transitam pelo front."
              status="Somente leitura"
            />
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmMaintenance} onOpenChange={setConfirmMaintenance}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-700">
              <ShieldAlert className="h-5 w-5" />
              Ativar manutenção?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação passa a bloquear imediatamente o acesso de usuários não administradores às áreas privadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 text-white hover:bg-amber-700"
              onClick={() => setMaintenanceMode(true)}
            >
              Confirmar ativação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function IntegrationCard({
  title,
  description,
  status,
}: {
  title: string;
  description: string;
  status: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-slate-900">{title}</p>
        <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
          {status}
        </Badge>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}
