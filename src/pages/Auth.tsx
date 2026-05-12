import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Box } from "lucide-react";
import { Link } from "react-router-dom";

const TIPOS_EMPRESA = [
  "Construtora",
  "Empresa de Reforma",
  "Empresa de Engenharia",
  "Empreiteiro",
  "Escritório de Arquitetura e Interiores",
  "Serviços Especializados",
  "Designer de Interiores",
  "Fabricante",
  "Loja",
  "Móveis Planejados",
  "Estudante de Engenharia",
  "Estudante de Arquitetura ou Design de Interiores",
  "Outros",
];

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const QTD_FUNCIONARIOS = [
  "Apenas eu",
  "2-5",
  "6-15",
  "16-50",
  "51-200",
  "200+",
];

const COMO_CONHECEU = [
  "Google / Busca",
  "Redes Sociais",
  "Indicação de colega",
  "YouTube",
  "Evento / Feira",
  "Outros",
];

const AREAS_ATUACAO = [
  "Construção Residencial",
  "Construção Comercial",
  "Reformas",
  "Infraestrutura",
  "Projetos e Consultoria",
  "Interiores e Decoração",
  "Manutenção Predial",
  "Outros",
];

export default function Auth() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") === "signup" ? "signup" : "login";
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  // Signup form state
  const [form, setForm] = useState({
    email: "",
    password: "",
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

  if (user) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await signIn(fd.get("email") as string, fd.get("password") as string);
      toast.success("Login realizado!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (step === 1) {
      if (!form.nome_completo || !form.email || !form.password) {
        toast.error("Preencha todos os campos obrigatórios");
        return;
      }
      if (form.password.length < 6) {
        toast.error("A senha deve ter no mínimo 6 caracteres");
        return;
      }
      setStep(2);
      return;
    }

    setLoading(true);
    try {
      await signUp(form.email, form.password, form.nome_completo, {
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
      });
      toast.success("Conta criada! Verifique seu email para confirmar.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Link to="/" className="mb-6 flex items-center gap-2 text-2xl font-bold">
        <Box className="h-7 w-7 text-primary" />
        Obra Link
      </Link>
      <Card className="w-full max-w-lg">
        <Tabs defaultValue={defaultTab} onValueChange={() => setStep(1)}>
          <CardHeader className="pb-3">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar Conta</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            {/* LOGIN */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" name="email" type="email" required placeholder="seu@email.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input id="login-password" name="password" type="password" required placeholder="••••••••" />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            {/* SIGNUP */}
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                {step === 1 && (
                  <>
                    <p className="text-xs text-muted-foreground mb-2">Etapa 1 de 2 — Dados de acesso</p>
                    <div className="space-y-2">
                      <Label>Nome completo *</Label>
                      <Input
                        value={form.nome_completo}
                        onChange={(e) => updateField("nome_completo", e.target.value)}
                        required
                        placeholder="Seu nome completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        required
                        placeholder="seu@email.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Senha *</Label>
                      <Input
                        type="password"
                        value={form.password}
                        onChange={(e) => updateField("password", e.target.value)}
                        required
                        minLength={6}
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data de nascimento</Label>
                      <Input
                        type="date"
                        value={form.data_nascimento}
                        onChange={(e) => updateField("data_nascimento", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Celular (WhatsApp com DDD)</Label>
                      <Input
                        type="tel"
                        value={form.celular_whatsapp}
                        onChange={(e) => updateField("celular_whatsapp", e.target.value.replace(/\D/g, ""))}
                        placeholder="11999999999"
                        maxLength={11}
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Próximo →
                    </Button>
                  </>
                )}

                {step === 2 && (
                  <>
                    <p className="text-xs text-muted-foreground mb-2">Etapa 2 de 2 — Sobre seu negócio</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tipo da Empresa / Profissão *</Label>
                        <Select value={form.tipo_empresa} onValueChange={(v) => updateField("tipo_empresa", v)}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {TIPOS_EMPRESA.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Nome da empresa</Label>
                        <Input
                          value={form.nome_empresa}
                          onChange={(e) => updateField("nome_empresa", e.target.value)}
                          placeholder="Razão social ou fantasia"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Quantas pessoas na empresa?</Label>
                        <Select value={form.qtd_funcionarios} onValueChange={(v) => updateField("qtd_funcionarios", v)}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {QTD_FUNCIONARIOS.map((q) => (
                              <SelectItem key={q} value={q}>{q}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Obras em andamento</Label>
                        <Input
                          type="number"
                          min={0}
                          value={form.qtd_obras_atual}
                          onChange={(e) => updateField("qtd_obras_atual", e.target.value)}
                          placeholder="0"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Ano de criação do negócio</Label>
                        <Input
                          type="number"
                          min={1900}
                          max={new Date().getFullYear()}
                          value={form.ano_criacao_negocio}
                          onChange={(e) => updateField("ano_criacao_negocio", e.target.value)}
                          placeholder="2020"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Área de atuação</Label>
                        <Select value={form.area_atuacao} onValueChange={(v) => updateField("area_atuacao", v)}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {AREAS_ATUACAO.map((a) => (
                              <SelectItem key={a} value={a}>{a}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Cidade</Label>
                        <Input
                          value={form.cidade}
                          onChange={(e) => updateField("cidade", e.target.value)}
                          placeholder="Sua cidade"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Estado (UF)</Label>
                        <Select value={form.estado} onValueChange={(v) => updateField("estado", v)}>
                          <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                          <SelectContent>
                            {ESTADOS_BR.map((uf) => (
                              <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Como conheceu a plataforma?</Label>
                      <Select value={form.como_conheceu} onValueChange={(v) => updateField("como_conheceu", v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {COMO_CONHECEU.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Motivo de usar a plataforma</Label>
                      <Textarea
                        value={form.motivo_uso}
                        onChange={(e) => updateField("motivo_uso", e.target.value)}
                        placeholder="Conte brevemente o que espera da plataforma..."
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                        ← Voltar
                      </Button>
                      <Button type="submit" className="flex-1" disabled={loading}>
                        {loading ? "Criando conta..." : "Criar Conta"}
                      </Button>
                    </div>
                  </>
                )}
              </form>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
