import { useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Box, User, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isValidCPF, isValidCNPJ, maskCPF, maskCNPJ, maskPhone, onlyDigits,
} from "@/lib/brValidators";

type AccountType = "PF" | "PJ";

// ── Schemas de validação ────────────────────────────────────────────────
const baseSignup = {
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(8, "Mínimo de 8 caracteres").max(72),
  confirmPassword: z.string(),
};

const pfSchema = z.object({
  ...baseSignup,
  nome_completo: z.string().trim().min(3, "Informe seu nome completo").max(120),
  cpf: z.string().refine(isValidCPF, "CPF inválido"),
}).refine((d) => d.password === d.confirmPassword, {
  message: "As senhas não conferem", path: ["confirmPassword"],
});

const pjSchema = z.object({
  ...baseSignup,
  razao_social: z.string().trim().min(3, "Informe a razão social").max(160),
  cnpj: z.string().refine(isValidCNPJ, "CNPJ inválido"),
  inscricao_estadual: z.string().optional().or(z.literal("")),
  telefone_comercial: z.string().refine(
    (v) => onlyDigits(v).length >= 10,
    "Telefone inválido",
  ),
}).refine((d) => d.password === d.confirmPassword, {
  message: "As senhas não conferem", path: ["confirmPassword"],
});

// 🔧 Configurável: torne a Inscrição Estadual obrigatória se necessário
const INSCRICAO_ESTADUAL_OBRIGATORIA = false;

// ── Componente ──────────────────────────────────────────────────────────
export default function Auth() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") === "signup" ? "signup" : "login";
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  const [accountType, setAccountType] = useState<AccountType>("PF");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const emptyForm = {
    nome_completo: "",
    cpf: "",
    razao_social: "",
    cnpj: "",
    inscricao_estadual: "",
    telefone_comercial: "",
    email: "",
    password: "",
    confirmPassword: "",
  };
  const [form, setForm] = useState(emptyForm);

  if (user) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const update = (k: keyof typeof form, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: "" }));
  };

  const switchAccountType = (t: AccountType) => {
    if (t === accountType) return;
    setAccountType(t);
    setErrors({});
    setForm((p) => ({
      ...emptyForm,
      email: p.email,
      password: p.password,
      confirmPassword: p.confirmPassword,
    }));
  };

  // Validação em tempo real para habilitar o botão
  const isFormValid = useMemo(() => {
    if (accountType === "PF") {
      const r = pfSchema.safeParse(form);
      return r.success;
    }
    const data = INSCRICAO_ESTADUAL_OBRIGATORIA
      ? { ...form, inscricao_estadual: form.inscricao_estadual.trim() || "INVALID" }
      : form;
    const r = pjSchema.safeParse(data);
    return r.success;
  }, [accountType, form]);

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
    const schema = accountType === "PF" ? pfSchema : pjSchema;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        const key = String(i.path[0] ?? "");
        if (!fieldErrors[key]) fieldErrors[key] = i.message;
      });
      setErrors(fieldErrors);
      toast.error("Corrija os campos destacados");
      return;
    }

    setLoading(true);
    try {
      const nome = accountType === "PF" ? form.nome_completo : form.razao_social;
      await signUp(form.email, form.password, nome, {
        account_type: accountType,
        cpf: accountType === "PF" ? onlyDigits(form.cpf) : null,
        cnpj: accountType === "PJ" ? onlyDigits(form.cnpj) : null,
        nome_empresa: accountType === "PJ" ? form.razao_social : null,
        inscricao_estadual: accountType === "PJ" ? form.inscricao_estadual || null : null,
        telefone_comercial: accountType === "PJ" ? onlyDigits(form.telefone_comercial) : null,
      });
      toast.success("Conta criada! Verifique seu e-mail para confirmar.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  const errorText = (k: string) =>
    errors[k] ? <p className="text-xs text-destructive mt-1">{errors[k]}</p> : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Link to="/" className="mb-6 flex items-center gap-2 text-2xl font-bold">
        <Box className="h-7 w-7 text-primary" />
        Obra Link
      </Link>
      <Card className="w-full max-w-lg">
        <Tabs
          defaultValue={defaultTab}
          onValueChange={() => setErrors({})}
        >
          <CardHeader className="pb-3">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar Conta</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            {/* ── LOGIN ──────────────────────────────────────────── */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-mail</Label>
                  <Input id="login-email" name="email" type="email" required placeholder="seu@email.com" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Senha</Label>
                    <Link
                      to="/esqueci-senha"
                      className="text-xs text-muted-foreground hover:text-primary hover:underline"
                    >
                      Esqueci minha senha
                    </Link>
                  </div>
                  <Input id="login-password" name="password" type="password" required placeholder="••••••••" />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            {/* ── SIGNUP ─────────────────────────────────────────── */}
            <TabsContent value="signup">
              {/* Seletor de tipo de conta */}
              <div className="mb-5">
                <Label className="mb-2 block text-sm">Tipo de conta *</Label>
                <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/40 p-1">
                  {([
                    { key: "PF", label: "Pessoa Física", sub: "CPF", icon: User },
                    { key: "PJ", label: "Pessoa Jurídica", sub: "CNPJ", icon: Building2 },
                  ] as const).map(({ key, label, sub, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => switchAccountType(key)}
                      aria-pressed={accountType === key}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-all",
                        accountType === key
                          ? "bg-background text-foreground shadow-sm ring-1 ring-primary/30"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                      <span className="text-xs opacity-60">({sub})</span>
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSignup} className="space-y-4" noValidate>
                {accountType === "PF" ? (
                  <>
                    <div className="space-y-1.5">
                      <Label>Nome completo *</Label>
                      <Input
                        value={form.nome_completo}
                        onChange={(e) => update("nome_completo", e.target.value)}
                        placeholder="Seu nome completo"
                        aria-invalid={!!errors.nome_completo}
                      />
                      {errorText("nome_completo")}
                    </div>
                    <div className="space-y-1.5">
                      <Label>CPF *</Label>
                      <Input
                        value={form.cpf}
                        onChange={(e) => update("cpf", maskCPF(e.target.value))}
                        placeholder="000.000.000-00"
                        inputMode="numeric"
                        maxLength={14}
                        aria-invalid={!!errors.cpf}
                      />
                      {errorText("cpf")}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label>Razão Social / Nome da empresa *</Label>
                      <Input
                        value={form.razao_social}
                        onChange={(e) => update("razao_social", e.target.value)}
                        placeholder="Sua empresa LTDA"
                        aria-invalid={!!errors.razao_social}
                      />
                      {errorText("razao_social")}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>CNPJ *</Label>
                        <Input
                          value={form.cnpj}
                          onChange={(e) => update("cnpj", maskCNPJ(e.target.value))}
                          placeholder="00.000.000/0001-00"
                          inputMode="numeric"
                          maxLength={18}
                          aria-invalid={!!errors.cnpj}
                        />
                        {errorText("cnpj")}
                      </div>
                      <div className="space-y-1.5">
                        <Label>
                          Inscrição Estadual{INSCRICAO_ESTADUAL_OBRIGATORIA ? " *" : ""}
                        </Label>
                        <Input
                          value={form.inscricao_estadual}
                          onChange={(e) => update("inscricao_estadual", e.target.value)}
                          placeholder="Opcional / Isento"
                          aria-invalid={!!errors.inscricao_estadual}
                        />
                        {errorText("inscricao_estadual")}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Telefone / WhatsApp comercial *</Label>
                      <Input
                        value={form.telefone_comercial}
                        onChange={(e) => update("telefone_comercial", maskPhone(e.target.value))}
                        placeholder="(11) 99999-9999"
                        inputMode="tel"
                        maxLength={16}
                        aria-invalid={!!errors.telefone_comercial}
                      />
                      {errorText("telefone_comercial")}
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <Label>
                    {accountType === "PJ" ? "E-mail corporativo *" : "E-mail *"}
                  </Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="contato@empresa.com.br"
                    aria-invalid={!!errors.email}
                  />
                  {errorText("email")}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Senha *</Label>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      aria-invalid={!!errors.password}
                    />
                    {errorText("password")}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Confirmar senha *</Label>
                    <Input
                      type="password"
                      value={form.confirmPassword}
                      onChange={(e) => update("confirmPassword", e.target.value)}
                      placeholder="Repita a senha"
                      aria-invalid={!!errors.confirmPassword}
                    />
                    {errorText("confirmPassword")}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !isFormValid}
                >
                  {loading ? "Criando conta..." : "Criar Conta"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Ao criar a conta você concorda com nossos{" "}
                  <Link to="/termos-de-uso" className="underline hover:text-foreground">Termos</Link> e{" "}
                  <Link to="/politica-de-privacidade" className="underline hover:text-foreground">Política de Privacidade</Link>.
                </p>
              </form>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
