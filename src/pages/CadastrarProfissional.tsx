import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Box, ArrowLeft, Loader2, HardHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ESPECIALIDADES = [
  "Pedreiro",
  "Eletricista",
  "Encanador",
  "Pintor",
  "Mestre de Obras",
  "Engenheiro",
  "Arquiteto",
  "Outros",
] as const;

const schema = z.object({
  especialidade: z.enum(ESPECIALIDADES, { errorMap: () => ({ message: "Selecione uma especialidade" }) }),
  regiao: z.string().trim().min(2, "Informe sua cidade/estado").max(120),
  valor_diaria: z.coerce.number().min(0, "Valor inválido").max(99999),
  telefone: z.string().trim().min(8, "Telefone inválido").max(20),
  resumo: z.string().trim().min(20, "Mínimo de 20 caracteres").max(500, "Máximo de 500 caracteres"),
});

function maskPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10)
    return d.replace(/(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) =>
      [a && `(${a}`, a.length === 2 ? ") " : "", b, c && `-${c}`].filter(Boolean).join(""),
    );
  return d.replace(/(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
}

export default function CadastrarProfissional() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [especialidade, setEspecialidade] = useState<string>("");
  const [regiao, setRegiao] = useState("");
  const [valorDiaria, setValorDiaria] = useState("");
  const [telefone, setTelefone] = useState("");
  const [resumo, setResumo] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);

  // Pre-load existing profile (upsert flow)
  useEffect(() => {
    if (!user) {
      setLoadingExisting(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("profissionais")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
        
      if (data) {
        const d = data as any;
        setEspecialidade(d.especialidade ?? "");
        setRegiao(d.regiao ?? ""); // Ajustado para o nome correto no banco
        setValorDiaria(String(d.valor_diaria ?? ""));
        setTelefone(d.telefone ?? "");
        setResumo(d.resumo ?? "");
      }
      setLoadingExisting(false);
    })();
  }, [user]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth?redirect=/cadastrar-profissional" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = schema.safeParse({
      especialidade,
      regiao,
      valor_diaria: valorDiaria,
      telefone,
      resumo,
    });
    
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        errs[String(i.path[0])] = i.message;
      });
      setErrors(errs);
      return;
    }

    setSaving(true);
    
    // Mapeamento correto das colunas para o banco de dados
   const { error } = await supabase
      .from("profissionais")
      .upsert(
        { 
          user_id: user.id, 
          especialidade: parsed.data.especialidade,
          regiao: parsed.data.regiao, 
          valor_diaria: parsed.data.valor_diaria,
          telefone: parsed.data.telefone,
          resumo: parsed.data.resumo
          // Apagamos a linha do status aqui!
        },
        { onConflict: "user_id" },
      );
      
    setSaving(false);

    if (error) {
      toast.error("Erro ao salvar perfil", { description: error.message });
      return;
    }
    toast.success("Perfil profissional salvo com sucesso!");
    navigate("/profissionais");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <nav className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-slate-900">
            <Box className="h-6 w-6 text-emerald-600" />
            <span>Obra Link</span>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            onClick={() => navigate("/profissionais")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Hub
          </Button>
        </div>
      </nav>

      <div className="container max-w-2xl py-10 lg:py-16">
        <div className="mb-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 ring-1 ring-emerald-200 mb-4">
            <HardHat className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Cadastre seu <span className="text-emerald-600">perfil profissional</span>
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            Apareça no diretório do Obra Link e receba propostas de obras na sua região.
          </p>
        </div>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900 text-xl">Dados profissionais</CardTitle>
            <CardDescription className="text-slate-500">
              Os campos marcados com <span className="text-emerald-600 font-bold">*</span> são obrigatórios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingExisting ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">
                    Especialidade <span className="text-emerald-600">*</span>
                  </Label>
                  <Select value={especialidade} onValueChange={setEspecialidade}>
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900 focus:ring-emerald-500">
                      <SelectValue placeholder="Selecione sua área de atuação" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-900 shadow-md">
                      {ESPECIALIDADES.map((e) => (
                        <SelectItem key={e} value={e} className="focus:bg-slate-100">
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.especialidade && <p className="text-sm text-red-500">{errors.especialidade}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">
                    Região de Atuação <span className="text-emerald-600">*</span>
                  </Label>
                  <Input
                    value={regiao}
                    onChange={(e) => setRegiao(e.target.value)}
                    placeholder="Ex: Sorocaba / SP"
                    className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {errors.regiao && <p className="text-sm text-red-500">{errors.regiao}</p>}
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">
                      Valor da Diária (R$) <span className="text-emerald-600">*</span>
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="10"
                      value={valorDiaria}
                      onChange={(e) => setValorDiaria(e.target.value)}
                      placeholder="250"
                      className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {errors.valor_diaria && <p className="text-sm text-red-500">{errors.valor_diaria}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">
                      Telefone / WhatsApp <span className="text-emerald-600">*</span>
                    </Label>
                    <Input
                      value={telefone}
                      onChange={(e) => setTelefone(maskPhone(e.target.value))}
                      placeholder="(15) 99999-9999"
                      className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {errors.telefone && <p className="text-sm text-red-500">{errors.telefone}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">
                    Resumo Profissional <span className="text-emerald-600">*</span>
                  </Label>
                  <Textarea
                    value={resumo}
                    onChange={(e) => setResumo(e.target.value.slice(0, 500))}
                    placeholder="Conte sua experiência, especialidades técnicas e diferenciais. Esta é a sua vitrine!"
                    rows={5}
                    className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="flex justify-between text-xs">
                    {errors.resumo ? (
                      <span className="text-red-500 font-medium">{errors.resumo}</span>
                    ) : (
                      <span className="text-slate-500">Venda seu peixe em até 500 caracteres.</span>
                    )}
                    <span className="text-slate-500 tabular-nums font-medium">{resumo.length}/500</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                    onClick={() => navigate("/profissionais")}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-11"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar Perfil"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}