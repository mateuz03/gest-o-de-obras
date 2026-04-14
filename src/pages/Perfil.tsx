import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Save, User } from "lucide-react";
import { Link } from "react-router-dom";

const TIPOS_EMPRESA = [
  "Construtora", "Empresa de Reforma", "Empresa de Engenharia", "Empreiteiro",
  "Escritório de Arquitetura e Interiores", "Serviços Especializados",
  "Designer de Interiores", "Fabricante", "Loja", "Móveis Planejados",
  "Estudante de Engenharia", "Estudante de Arquitetura ou Design de Interiores", "Outros",
];

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const QTD_FUNCIONARIOS = ["Apenas eu", "2-5", "6-15", "16-50", "51-200", "200+"];

const COMO_CONHECEU = [
  "Google / Busca", "Redes Sociais", "Indicação de colega", "YouTube", "Evento / Feira", "Outros",
];

const AREAS_ATUACAO = [
  "Construção Residencial", "Construção Comercial", "Reformas", "Infraestrutura",
  "Projetos e Consultoria", "Interiores e Decoração", "Manutenção Predial", "Outros",
];

export default function Perfil() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome_completo: "",
    data_nascimento: "",
    celular_whatsapp: "",
    tipo_empresa: "",
    nome_empresa: "",
    qtd_funcionarios: "",
    qtd_obras_atual: "",
    ano_criacao_negocio: "",
    cidade: "",
    estado: "",
    area_atuacao: "",
    motivo_uso: "",
    como_conheceu: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setForm({
            nome_completo: data.nome_completo || data.nome || "",
            data_nascimento: data.data_nascimento || "",
            celular_whatsapp: data.celular_whatsapp || "",
            tipo_empresa: data.tipo_empresa || "",
            nome_empresa: data.nome_empresa || "",
            qtd_funcionarios: data.qtd_funcionarios || "",
            qtd_obras_atual: data.qtd_obras_atual?.toString() || "",
            ano_criacao_negocio: data.ano_criacao_negocio?.toString() || "",
            cidade: data.cidade || "",
            estado: data.estado || "",
            area_atuacao: data.area_atuacao || "",
            motivo_uso: data.motivo_uso || "",
            como_conheceu: data.como_conheceu || "",
          });
        }
        setLoading(false);
      });
  }, [user]);

  const updateField = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        nome_completo: form.nome_completo || null,
        data_nascimento: form.data_nascimento || null,
        celular_whatsapp: form.celular_whatsapp || null,
        tipo_empresa: form.tipo_empresa || null,
        nome_empresa: form.nome_empresa || null,
        qtd_funcionarios: form.qtd_funcionarios || null,
        qtd_obras_atual: form.qtd_obras_atual ? Number(form.qtd_obras_atual) : null,
        ano_criacao_negocio: form.ano_criacao_negocio ? Number(form.ano_criacao_negocio) : null,
        cidade: form.cidade || null,
        estado: form.estado || null,
        area_atuacao: form.area_atuacao || null,
        motivo_uso: form.motivo_uso || null,
        como_conheceu: form.como_conheceu || null,
      } as any)
      .eq("user_id", user.id);

    if (error) toast.error("Erro ao salvar perfil");
    else toast.success("Perfil atualizado com sucesso!");
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <User className="h-6 w-6 text-primary" /> Meu Perfil
            </h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados Pessoais</CardTitle>
            <CardDescription>Informações pessoais e contato</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input value={form.nome_completo} onChange={(e) => updateField("nome_completo", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Data de nascimento</Label>
                <Input type="date" value={form.data_nascimento} onChange={(e) => updateField("data_nascimento", e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Celular (WhatsApp)</Label>
                <Input
                  type="tel"
                  value={form.celular_whatsapp}
                  onChange={(e) => updateField("celular_whatsapp", e.target.value.replace(/\D/g, ""))}
                  placeholder="11999999999"
                  maxLength={11}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados Profissionais</CardTitle>
            <CardDescription>Informações sobre sua empresa e área de atuação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo da Empresa / Profissão</Label>
                <Select value={form.tipo_empresa} onValueChange={(v) => updateField("tipo_empresa", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_EMPRESA.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nome da empresa</Label>
                <Input value={form.nome_empresa} onChange={(e) => updateField("nome_empresa", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Funcionários</Label>
                <Select value={form.qtd_funcionarios} onValueChange={(v) => updateField("qtd_funcionarios", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {QTD_FUNCIONARIOS.map((q) => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Obras em andamento</Label>
                <Input type="number" min={0} value={form.qtd_obras_atual} onChange={(e) => updateField("qtd_obras_atual", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Ano de criação do negócio</Label>
                <Input type="number" min={1900} max={new Date().getFullYear()} value={form.ano_criacao_negocio} onChange={(e) => updateField("ano_criacao_negocio", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Área de atuação</Label>
                <Select value={form.area_atuacao} onValueChange={(v) => updateField("area_atuacao", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {AREAS_ATUACAO.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={form.cidade} onChange={(e) => updateField("cidade", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Estado (UF)</Label>
                <Select value={form.estado} onValueChange={(v) => updateField("estado", v)}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>
                    {ESTADOS_BR.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sobre o Uso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Como conheceu a plataforma?</Label>
              <Select value={form.como_conheceu} onValueChange={(v) => updateField("como_conheceu", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {COMO_CONHECEU.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motivo de usar a plataforma</Label>
              <Textarea value={form.motivo_uso} onChange={(e) => updateField("motivo_uso", e.target.value)} rows={3} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </div>
    </div>
  );
}
