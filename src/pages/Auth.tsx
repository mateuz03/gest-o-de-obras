import { useEffect, useMemo, useState, type ComponentProps, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { z } from "zod";
import {
  ArrowRight,
  BarChart3,
  Box,
  Building2,
  Calculator,
  CheckCircle2,
  CircleAlert,
  Eye,
  EyeOff,
  FileUp,
  LayoutDashboard,
  Loader2,
  ShieldCheck,
  Sparkles,
  User,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { getFriendlyAuthError, parseSignupAccountHint } from "@/lib/authFeedback";
import {
  isValidCNPJ,
  isValidCPF,
  maskCNPJ,
  maskCPF,
  maskPhone,
  onlyDigits,
} from "@/lib/brValidators";
import { consumeIntendedRoute } from "@/lib/intendedRoute";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type AccountType = "PF" | "PJ";
type AuthTab = "login" | "signup";

type LoginForm = {
  email: string;
  password: string;
};

type SignupForm = {
  nome_completo: string;
  cpf: string;
  razao_social: string;
  cnpj: string;
  inscricao_estadual: string;
  telefone_comercial: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type LoginField = keyof LoginForm;
type SignupField = keyof SignupForm;

const INSCRICAO_ESTADUAL_OBRIGATORIA = false;

const PF_FIELDS: SignupField[] = [
  "nome_completo",
  "cpf",
  "email",
  "password",
  "confirmPassword",
];

const PJ_FIELDS: SignupField[] = [
  "razao_social",
  "cnpj",
  "inscricao_estadual",
  "telefone_comercial",
  "email",
  "password",
  "confirmPassword",
];

const emptyLoginForm: LoginForm = {
  email: "",
  password: "",
};

const emptySignupForm: SignupForm = {
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

const emptyLoginTouched: Record<LoginField, boolean> = {
  email: false,
  password: false,
};

const emptySignupTouched: Record<SignupField, boolean> = {
  nome_completo: false,
  cpf: false,
  razao_social: false,
  cnpj: false,
  inscricao_estadual: false,
  telefone_comercial: false,
  email: false,
  password: false,
  confirmPassword: false,
};

const emailSchema = z.string().trim().email("Informe um e-mail valido").max(255);

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe sua senha").max(72),
});

const signupBaseSchema = {
  email: emailSchema,
  password: z.string().min(8, "Use no minimo 8 caracteres").max(72),
  confirmPassword: z.string().min(1, "Confirme sua senha").max(72),
};

const safeText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(3, `Informe ${label}`)
    .max(max, `Maximo de ${max} caracteres`)
    .refine((value) => !/[<>]/.test(value), "Remova caracteres invalidos como < ou >");

const optionalSafeText = z
  .string()
  .trim()
  .max(40, "Maximo de 40 caracteres")
  .refine((value) => !/[<>]/.test(value), "Remova caracteres invalidos como < ou >");

const requiredSafeText = z
  .string()
  .trim()
  .min(1, "Informe a inscricao estadual")
  .max(40, "Maximo de 40 caracteres")
  .refine((value) => !/[<>]/.test(value), "Remova caracteres invalidos como < ou >");

const pfSchema = z.object({
  ...signupBaseSchema,
  nome_completo: safeText("seu nome completo", 120),
  cpf: z
    .string()
    .refine((value) => onlyDigits(value).length === 11, "Informe o CPF completo")
    .refine(isValidCPF, "CPF invalido"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas nao conferem",
  path: ["confirmPassword"],
});

const pjSchema = z.object({
  ...signupBaseSchema,
  razao_social: safeText("a razao social", 160),
  cnpj: z
    .string()
    .refine((value) => onlyDigits(value).length === 14, "Informe o CNPJ completo")
    .refine(isValidCNPJ, "CNPJ invalido"),
  inscricao_estadual: INSCRICAO_ESTADUAL_OBRIGATORIA ? requiredSafeText : optionalSafeText,
  telefone_comercial: z
    .string()
    .refine((value) => onlyDigits(value).length >= 10, "Telefone invalido"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas nao conferem",
  path: ["confirmPassword"],
});

const showcaseBenefits: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: FileUp,
    title: "Upload rapido de projetos",
    description: "Envie plantas em PDF e centralize tudo em um fluxo tecnico unico.",
  },
  {
    icon: Sparkles,
    title: "Extracao automatica com IA",
    description: "A plataforma le as pranchas e transforma desenho em dados acionaveis.",
  },
  {
    icon: Calculator,
    title: "Resultados organizados em minutos",
    description: "Ganhe quantitativos claros para acelerar orcamentos e tomada de decisao.",
  },
];

const workflowSteps = [
  "Envie plantas e memoriais em PDF",
  "A IA interpreta elementos tecnicos da obra",
  "Receba quantitativos e insumos estruturados",
];

const showcaseMetrics = [
  { label: "Leitura de PDFs", value: "Automatica" },
  { label: "Saida tecnica", value: "Quantitativos" },
  { label: "Operacao", value: "Mais agilidade" },
];

const fieldClassName =
  "h-12 rounded-xl border-slate-200 bg-white px-4 text-[15px] text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-4 focus-visible:ring-blue-100 focus-visible:ring-offset-0";

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function toErrorMap(issues: z.ZodIssue[]) {
  const next: Record<string, string> = {};

  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!next[key]) next[key] = issue.message;
  }

  return next;
}

function getInitialTab(searchParams: URLSearchParams): AuthTab {
  const requestedTab = searchParams.get("tab");
  if (requestedTab === "signup") return "signup";
  if (requestedTab === "login") return "login";
  return parseSignupAccountHint(searchParams.get("account")) ? "signup" : "login";
}

function getInitialAccountType(searchParams: URLSearchParams): AccountType {
  return parseSignupAccountHint(searchParams.get("account")) ?? "PF";
}

function getActiveSignupFields(accountType: AccountType) {
  return accountType === "PF" ? PF_FIELDS : PJ_FIELDS;
}

function InlineError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p id={id} role="alert" className="mt-1.5 text-xs font-medium text-red-600">
      {message}
    </p>
  );
}

function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

interface PasswordFieldProps extends Omit<ComponentProps<typeof Input>, "type"> {
  error?: string;
  showPassword: boolean;
  toggleLabel: string;
  onToggle: () => void;
}

function PasswordField({
  className,
  error,
  showPassword,
  toggleLabel,
  onToggle,
  ...props
}: PasswordFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Input
          {...props}
          type={showPassword ? "text" : "password"}
          className={cn("pr-14", className)}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          aria-label={toggleLabel}
          aria-pressed={showPassword}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {!error && props.id === "signup-password" ? (
        <p className="text-xs text-slate-500">Use no minimo 8 caracteres.</p>
      ) : null}
    </div>
  );
}

function ShowcaseBenefit({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-[0_18px_38px_-28px_rgba(15,23,42,0.35)] backdrop-blur">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-700">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function DesktopShowcasePanel() {
  return (
    <section className="relative hidden min-h-[760px] flex-col justify-between overflow-hidden rounded-[32px] border border-white/80 bg-white/70 p-8 shadow-[0_30px_90px_-52px_rgba(15,23,42,0.35)] backdrop-blur lg:flex">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(37,99,235,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,0.08)_1px,transparent_1px)] bg-[size:36px_36px] opacity-60" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-blue-50/80 to-transparent" />

      <div className="relative">
        <Link to="/" className="inline-flex items-center gap-3 text-slate-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
            <Box className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-black tracking-tight">Obra Link</p>
            <p className="text-sm text-slate-500">IA para leitura de projetos e quantitativos</p>
          </div>
        </Link>

        <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
          <ShieldCheck className="h-4 w-4" />
          Plataforma SaaS para obras e orcamentos
        </div>

        <div className="mt-6 max-w-2xl space-y-5">
          <h1 className="text-5xl font-black leading-[1.05] tracking-tight text-slate-950 xl:text-[3.8rem]">
            Quantifique projetos em minutos, nao em dias.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-slate-600">
            Envie plantas em PDF, extraia quantitativos automaticamente e acelere seu orcamento com IA.
          </p>
        </div>

        <div className="mt-10 grid gap-4 xl:grid-cols-3">
          {showcaseBenefits.map((benefit) => (
            <ShowcaseBenefit
              key={benefit.title}
              icon={benefit.icon}
              title={benefit.title}
              description={benefit.description}
            />
          ))}
        </div>
      </div>

      <div className="relative mt-10 grid gap-4 rounded-[28px] border border-slate-800 bg-slate-950 p-6 text-white shadow-inner xl:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-blue-300">
              <LayoutDashboard className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Pipeline tecnico assistido por IA</p>
              <p className="text-sm text-slate-400">Do PDF ao quantitativo organizado em um unico fluxo.</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {workflowSteps.map((step, index) => (
              <div
                key={step}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-200">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-slate-200">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 self-start">
          {showcaseMetrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {metric.label}
              </p>
              <p className="mt-2 text-xl font-black text-white">{metric.value}</p>
            </div>
          ))}

          <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4">
            <div className="flex items-center gap-2 text-blue-200">
              <BarChart3 className="h-4 w-4" />
              <p className="text-sm font-semibold">Valor percebido no primeiro acesso</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              O login abre a porta para uma operacao mais tecnica, mais rapida e mais previsivel.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function MobileIntro() {
  return (
    <div className="mb-6 space-y-4 lg:hidden">
      <Link to="/" className="inline-flex items-center gap-3 text-slate-900">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
          <Box className="h-5 w-5" />
        </div>
        <div>
          <p className="text-lg font-black tracking-tight">Obra Link</p>
          <p className="text-sm text-slate-500">IA para projetos em PDF e quantitativos</p>
        </div>
      </Link>

      <div className="rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.35)] backdrop-blur">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700">
          <Sparkles className="h-3.5 w-3.5" />
          Plataforma premium para obras
        </div>
        <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-slate-950">
          Quantifique projetos em minutos, nao em dias.
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Envie plantas em PDF, extraia quantitativos automaticamente e acelere seu orcamento com IA.
        </p>
      </div>
    </div>
  );
}

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();

  const [activeTab, setActiveTab] = useState<AuthTab>(() => getInitialTab(searchParams));
  const [accountType, setAccountType] = useState<AccountType>(() => getInitialAccountType(searchParams));
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm] = useState<LoginForm>(emptyLoginForm);
  const [signupForm, setSignupForm] = useState<SignupForm>(emptySignupForm);

  const [loginTouched, setLoginTouched] = useState<Record<LoginField, boolean>>(emptyLoginTouched);
  const [signupTouched, setSignupTouched] = useState<Record<SignupField, boolean>>(emptySignupTouched);

  const [loginSubmitted, setLoginSubmitted] = useState(false);
  const [signupSubmitted, setSignupSubmitted] = useState(false);

  const [loginServerError, setLoginServerError] = useState<string | null>(null);
  const [signupServerError, setSignupServerError] = useState<string | null>(null);

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);

  const redirectParam = searchParams.get("redirect");
  const redirectTarget = useMemo(
    () => (user ? consumeIntendedRoute(redirectParam) : null),
    [redirectParam, user],
  );

  useEffect(() => {
    if (user && redirectTarget) {
      navigate(redirectTarget, { replace: true });
    }
  }, [navigate, redirectTarget, user]);

  const loginValidation = useMemo(() => loginSchema.safeParse(loginForm), [loginForm]);
  const loginErrors = useMemo(
    () => (loginValidation.success ? {} : toErrorMap(loginValidation.error.issues)),
    [loginValidation],
  );
  const isLoginValid = loginValidation.success;

  const signupSchema = accountType === "PF" ? pfSchema : pjSchema;
  const signupValidation = useMemo(() => signupSchema.safeParse(signupForm), [signupForm, signupSchema]);
  const signupErrors = useMemo(
    () => (signupValidation.success ? {} : toErrorMap(signupValidation.error.issues)),
    [signupValidation],
  );
  const isSignupValid = signupValidation.success;

  const loginErrorFor = (field: LoginField) =>
    loginTouched[field] || loginSubmitted ? loginErrors[field] : undefined;

  const signupErrorFor = (field: SignupField) =>
    signupTouched[field] || signupSubmitted ? signupErrors[field] : undefined;

  if (user) return null;

  const markLoginTouched = (field: LoginField) => {
    setLoginTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  };

  const markSignupTouched = (field: SignupField) => {
    setSignupTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  };

  const touchSignupFields = (fields: SignupField[]) => {
    setSignupTouched((prev) => {
      const next = { ...prev };
      fields.forEach((field) => {
        next[field] = true;
      });
      return next;
    });
  };

  const updateLoginField = (field: LoginField, value: string) => {
    setLoginForm((prev) => ({ ...prev, [field]: value }));
    if (loginServerError) setLoginServerError(null);
  };

  const updateSignupField = (field: SignupField, value: string) => {
    setSignupForm((prev) => ({ ...prev, [field]: value }));
    if (signupServerError) setSignupServerError(null);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as AuthTab);
    setLoginServerError(null);
    setSignupServerError(null);
  };

  const switchAccountType = (nextType: AccountType) => {
    if (nextType === accountType) return;
    setAccountType(nextType);
    setSignupServerError(null);
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginSubmitted(true);
    setLoginServerError(null);

    if (!loginValidation.success) {
      setLoginTouched({ email: true, password: true });
      return;
    }

    setLoading(true);

    try {
      await signIn(loginValidation.data.email.trim().toLowerCase(), loginValidation.data.password);
      toast.success("Login realizado com sucesso.");
      navigate(consumeIntendedRoute(redirectParam), { replace: true });
    } catch (error) {
      setLoginServerError(getFriendlyAuthError(error, "login"));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignupSubmitted(true);
    setSignupServerError(null);

    const activeFields = getActiveSignupFields(accountType);
    if (!signupValidation.success) {
      touchSignupFields(activeFields);
      return;
    }

    setLoading(true);

    try {
      if (accountType === "PF") {
        const parsedPf = pfSchema.parse(signupForm);
        const data = parsedPf;
        const nomeCompleto = normalizeText(data.nome_completo);

        await signUp(data.email.trim().toLowerCase(), data.password, nomeCompleto, {
          account_type: "PF",
          cpf: onlyDigits(data.cpf),
          cnpj: null,
          nome_empresa: null,
          inscricao_estadual: null,
          telefone_comercial: null,
        });
      } else {
        const parsedPj = pjSchema.parse(signupForm);
        const data = parsedPj;
        const razaoSocial = normalizeText(data.razao_social);
        const inscricaoEstadual = normalizeText(data.inscricao_estadual);

        await signUp(data.email.trim().toLowerCase(), data.password, razaoSocial, {
          account_type: "PJ",
          cpf: null,
          cnpj: onlyDigits(data.cnpj),
          nome_empresa: razaoSocial,
          inscricao_estadual: inscricaoEstadual || null,
          telefone_comercial: onlyDigits(data.telefone_comercial),
        });
      }

      toast.success("Conta criada! Verifique seu e-mail para confirmar.");
      setActiveTab("login");
      setShowSignupPassword(false);
      setShowSignupConfirmPassword(false);
    } catch (error) {
      setSignupServerError(getFriendlyAuthError(error, "signup"));
    } finally {
      setLoading(false);
    }
  };

  const signupContextCopy =
    accountType === "PF"
      ? "Ideal para profissionais, autonomos e usuarios que querem orcar e acompanhar obras."
      : "Ideal para lojas, construtoras e operacoes com atendimento comercial e escala.";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#edf4fb_100%)]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.07)_1px,transparent_1px)] bg-[size:40px_40px] opacity-50" />
      <div className="absolute inset-x-0 top-0 h-52 bg-gradient-to-b from-white/80 to-transparent" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10 xl:gap-14">
          <DesktopShowcasePanel />

          <section className="order-1 flex items-center justify-center lg:order-2 lg:justify-end">
            <div className="w-full max-w-xl">
              <MobileIntro />

              <Card className="w-full overflow-hidden rounded-[30px] border border-slate-200/80 bg-white/95 shadow-[0_34px_90px_-48px_rgba(15,23,42,0.4)] backdrop-blur">
                <Tabs value={activeTab} onValueChange={handleTabChange}>
                  <CardHeader className="space-y-6 px-6 pb-0 pt-6 sm:px-8 sm:pt-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                          <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                          Acesso seguro
                        </div>
                        <div>
                          <CardTitle className="text-3xl font-black tracking-tight text-slate-950">
                            {activeTab === "login" ? "Entre na sua operacao" : "Crie sua conta tecnica"}
                          </CardTitle>
                          <CardDescription className="mt-3 max-w-md text-sm leading-6 text-slate-500">
                            {activeTab === "login"
                              ? "Acesse seu painel para enviar plantas, revisar quantitativos e acelerar orcamentos com IA."
                              : "Abra sua conta para centralizar projetos, extrair quantitativos e ganhar velocidade na etapa comercial."}
                          </CardDescription>
                        </div>
                      </div>

                      <div className="hidden rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 sm:block">
                        <p className="font-semibold">PDFs + IA + quantitativos</p>
                        <p className="mt-1 text-blue-600/80">Fluxo desenhado para engenharia e construcao civil.</p>
                      </div>
                    </div>

                    <TabsList className="grid h-14 w-full grid-cols-2 rounded-2xl bg-slate-100 p-1.5">
                      <TabsTrigger
                        value="login"
                        className="rounded-xl text-[15px] font-semibold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-[0_14px_30px_-22px_rgba(15,23,42,0.55)] data-[state=active]:ring-1 data-[state=active]:ring-slate-200"
                      >
                        Entrar
                      </TabsTrigger>
                      <TabsTrigger
                        value="signup"
                        className="rounded-xl text-[15px] font-semibold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-[0_14px_30px_-22px_rgba(15,23,42,0.55)] data-[state=active]:ring-1 data-[state=active]:ring-slate-200"
                      >
                        Criar conta
                      </TabsTrigger>
                    </TabsList>
                  </CardHeader>

                  <CardContent className="px-6 pb-6 pt-6 sm:px-8 sm:pb-8">
                    <TabsContent value="login" className="mt-0">
                      <form onSubmit={handleLogin} className="space-y-5" noValidate>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-700">
                              <LayoutDashboard className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                Seu painel central de leitura tecnica
                              </p>
                              <p className="mt-1 text-sm leading-6 text-slate-500">
                                Gerencie uploads, acompanhe analises em PDF e consulte quantitativos organizados em poucos passos.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="login-email" className="text-sm font-semibold text-slate-700">
                            E-mail
                          </Label>
                          <Input
                            id="login-email"
                            name="email"
                            type="email"
                            value={loginForm.email}
                            onChange={(event) => updateLoginField("email", event.target.value)}
                            onBlur={() => markLoginTouched("email")}
                            placeholder="seu@email.com"
                            autoComplete="username"
                            autoCapitalize="none"
                            inputMode="email"
                            enterKeyHint="next"
                            spellCheck={false}
                            required
                            aria-invalid={!!loginErrorFor("email")}
                            aria-describedby={loginErrorFor("email") ? "login-email-error" : undefined}
                            className={fieldClassName}
                          />
                          <InlineError id="login-email-error" message={loginErrorFor("email")} />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-3">
                            <Label htmlFor="login-password" className="text-sm font-semibold text-slate-700">
                              Senha
                            </Label>
                            <Link
                              to="/esqueci-senha"
                              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                            >
                              Esqueci minha senha
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          </div>
                          <PasswordField
                            id="login-password"
                            name="password"
                            value={loginForm.password}
                            onChange={(event) => updateLoginField("password", event.target.value)}
                            onBlur={() => markLoginTouched("password")}
                            placeholder="Digite sua senha"
                            autoComplete="current-password"
                            enterKeyHint="done"
                            spellCheck={false}
                            required
                            aria-invalid={!!loginErrorFor("password")}
                            aria-describedby={loginErrorFor("password") ? "login-password-error" : undefined}
                            showPassword={showLoginPassword}
                            toggleLabel={showLoginPassword ? "Ocultar senha" : "Mostrar senha"}
                            onToggle={() => setShowLoginPassword((prev) => !prev)}
                            className={fieldClassName}
                          />
                          <InlineError id="login-password-error" message={loginErrorFor("password")} />
                        </div>

                        <FormAlert message={loginServerError} />

                        <Button
                          type="submit"
                          className="h-12 w-full rounded-xl bg-blue-600 text-base font-semibold text-white shadow-[0_20px_35px_-20px_rgba(37,99,235,0.7)] transition hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500"
                          disabled={loading || !isLoginValid}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Entrando...
                            </>
                          ) : (
                            "Entrar"
                          )}
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="signup" className="mt-0">
                      <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-700">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Escolha a estrutura da sua conta</p>
                            <p className="mt-1 text-sm leading-6 text-slate-500">{signupContextCopy}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mb-5">
                        <Label className="mb-2 block text-sm font-semibold text-slate-700">Tipo de conta *</Label>
                        <div className="grid grid-cols-2 gap-3">
                          {([
                            { key: "PF", label: "Pessoa Fisica", sub: "CPF", icon: User },
                            { key: "PJ", label: "Pessoa Juridica", sub: "CNPJ", icon: Building2 },
                          ] as const).map(({ key, label, sub, icon: Icon }) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => switchAccountType(key)}
                              aria-pressed={accountType === key}
                              className={cn(
                                "rounded-2xl border px-4 py-4 text-left transition-all",
                                accountType === key
                                  ? "border-blue-500 bg-blue-50 shadow-[0_18px_36px_-28px_rgba(37,99,235,0.5)] ring-2 ring-blue-100"
                                  : "border-slate-200 bg-white hover:border-slate-300",
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    "flex h-10 w-10 items-center justify-center rounded-2xl",
                                    accountType === key
                                      ? "bg-blue-600 text-white"
                                      : "bg-slate-100 text-slate-600",
                                  )}
                                >
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">{label}</p>
                                  <p className="text-xs text-slate-500">{sub}</p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <motion.form layout onSubmit={handleSignup} className="space-y-4" noValidate>
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.div
                            key={accountType}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.18 }}
                            className="space-y-4"
                          >
                            {accountType === "PF" ? (
                              <>
                                <div className="space-y-1.5">
                                  <Label htmlFor="signup-nome" className="text-sm font-semibold text-slate-700">
                                    Nome completo *
                                  </Label>
                                  <Input
                                    id="signup-nome"
                                    name="nome_completo"
                                    value={signupForm.nome_completo}
                                    onChange={(event) => updateSignupField("nome_completo", event.target.value)}
                                    onBlur={() => markSignupTouched("nome_completo")}
                                    placeholder="Seu nome completo"
                                    autoComplete="name"
                                    enterKeyHint="next"
                                    aria-invalid={!!signupErrorFor("nome_completo")}
                                    aria-describedby={signupErrorFor("nome_completo") ? "signup-nome-error" : undefined}
                                    className={fieldClassName}
                                  />
                                  <InlineError id="signup-nome-error" message={signupErrorFor("nome_completo")} />
                                </div>

                                <div className="space-y-1.5">
                                  <Label htmlFor="signup-cpf" className="text-sm font-semibold text-slate-700">
                                    CPF *
                                  </Label>
                                  <Input
                                    id="signup-cpf"
                                    name="cpf"
                                    value={signupForm.cpf}
                                    onChange={(event) => updateSignupField("cpf", maskCPF(event.target.value))}
                                    onBlur={() => markSignupTouched("cpf")}
                                    placeholder="000.000.000-00"
                                    inputMode="numeric"
                                    autoComplete="off"
                                    autoCapitalize="none"
                                    enterKeyHint="next"
                                    maxLength={14}
                                    pattern="[0-9]*"
                                    spellCheck={false}
                                    aria-invalid={!!signupErrorFor("cpf")}
                                    aria-describedby={signupErrorFor("cpf") ? "signup-cpf-error" : undefined}
                                    className={fieldClassName}
                                  />
                                  <InlineError id="signup-cpf-error" message={signupErrorFor("cpf")} />
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="space-y-1.5">
                                  <Label htmlFor="signup-razao-social" className="text-sm font-semibold text-slate-700">
                                    Razao social / nome da empresa *
                                  </Label>
                                  <Input
                                    id="signup-razao-social"
                                    name="razao_social"
                                    value={signupForm.razao_social}
                                    onChange={(event) => updateSignupField("razao_social", event.target.value)}
                                    onBlur={() => markSignupTouched("razao_social")}
                                    placeholder="Sua empresa LTDA"
                                    autoComplete="organization"
                                    enterKeyHint="next"
                                    aria-invalid={!!signupErrorFor("razao_social")}
                                    aria-describedby={signupErrorFor("razao_social") ? "signup-razao-social-error" : undefined}
                                    className={fieldClassName}
                                  />
                                  <InlineError
                                    id="signup-razao-social-error"
                                    message={signupErrorFor("razao_social")}
                                  />
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  <div className="space-y-1.5">
                                    <Label htmlFor="signup-cnpj" className="text-sm font-semibold text-slate-700">
                                      CNPJ *
                                    </Label>
                                    <Input
                                      id="signup-cnpj"
                                      name="cnpj"
                                      value={signupForm.cnpj}
                                      onChange={(event) => updateSignupField("cnpj", maskCNPJ(event.target.value))}
                                      onBlur={() => markSignupTouched("cnpj")}
                                      placeholder="00.000.000/0001-00"
                                      inputMode="numeric"
                                      autoComplete="off"
                                      autoCapitalize="none"
                                      enterKeyHint="next"
                                      maxLength={18}
                                      pattern="[0-9]*"
                                      spellCheck={false}
                                      aria-invalid={!!signupErrorFor("cnpj")}
                                      aria-describedby={signupErrorFor("cnpj") ? "signup-cnpj-error" : undefined}
                                      className={fieldClassName}
                                    />
                                    <InlineError id="signup-cnpj-error" message={signupErrorFor("cnpj")} />
                                  </div>

                                  <div className="space-y-1.5">
                                    <Label htmlFor="signup-inscricao" className="text-sm font-semibold text-slate-700">
                                      Inscricao Estadual{INSCRICAO_ESTADUAL_OBRIGATORIA ? " *" : ""}
                                    </Label>
                                    <Input
                                      id="signup-inscricao"
                                      name="inscricao_estadual"
                                      value={signupForm.inscricao_estadual}
                                      onChange={(event) => updateSignupField("inscricao_estadual", event.target.value)}
                                      onBlur={() => markSignupTouched("inscricao_estadual")}
                                      placeholder="Opcional / Isento"
                                      autoComplete="off"
                                      enterKeyHint="next"
                                      spellCheck={false}
                                      aria-invalid={!!signupErrorFor("inscricao_estadual")}
                                      aria-describedby={signupErrorFor("inscricao_estadual") ? "signup-inscricao-error" : undefined}
                                      className={fieldClassName}
                                    />
                                    <InlineError
                                      id="signup-inscricao-error"
                                      message={signupErrorFor("inscricao_estadual")}
                                    />
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <Label htmlFor="signup-telefone" className="text-sm font-semibold text-slate-700">
                                    Telefone / WhatsApp comercial *
                                  </Label>
                                  <Input
                                    id="signup-telefone"
                                    name="telefone_comercial"
                                    value={signupForm.telefone_comercial}
                                    onChange={(event) => updateSignupField("telefone_comercial", maskPhone(event.target.value))}
                                    onBlur={() => markSignupTouched("telefone_comercial")}
                                    placeholder="(11) 99999-9999"
                                    inputMode="tel"
                                    autoComplete="tel"
                                    enterKeyHint="next"
                                    maxLength={16}
                                    spellCheck={false}
                                    aria-invalid={!!signupErrorFor("telefone_comercial")}
                                    aria-describedby={signupErrorFor("telefone_comercial") ? "signup-telefone-error" : undefined}
                                    className={fieldClassName}
                                  />
                                  <InlineError
                                    id="signup-telefone-error"
                                    message={signupErrorFor("telefone_comercial")}
                                  />
                                </div>
                              </>
                            )}
                          </motion.div>
                        </AnimatePresence>

                        <div className="space-y-1.5">
                          <Label htmlFor="signup-email" className="text-sm font-semibold text-slate-700">
                            {accountType === "PJ" ? "E-mail corporativo *" : "E-mail *"}
                          </Label>
                          <Input
                            id="signup-email"
                            name="email"
                            type="email"
                            value={signupForm.email}
                            onChange={(event) => updateSignupField("email", event.target.value)}
                            onBlur={() => markSignupTouched("email")}
                            placeholder="contato@empresa.com.br"
                            autoComplete="email"
                            autoCapitalize="none"
                            inputMode="email"
                            enterKeyHint="next"
                            spellCheck={false}
                            aria-invalid={!!signupErrorFor("email")}
                            aria-describedby={signupErrorFor("email") ? "signup-email-error" : undefined}
                            className={fieldClassName}
                          />
                          <InlineError id="signup-email-error" message={signupErrorFor("email")} />
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label htmlFor="signup-password" className="text-sm font-semibold text-slate-700">
                              Senha *
                            </Label>
                            <PasswordField
                              id="signup-password"
                              name="password"
                              value={signupForm.password}
                              onChange={(event) => updateSignupField("password", event.target.value)}
                              onBlur={() => markSignupTouched("password")}
                              placeholder="Crie uma senha forte"
                              autoComplete="new-password"
                              enterKeyHint="next"
                              spellCheck={false}
                              aria-invalid={!!signupErrorFor("password")}
                              aria-describedby={signupErrorFor("password") ? "signup-password-error" : undefined}
                              error={signupErrorFor("password")}
                              showPassword={showSignupPassword}
                              toggleLabel={showSignupPassword ? "Ocultar senha" : "Mostrar senha"}
                              onToggle={() => setShowSignupPassword((prev) => !prev)}
                              className={fieldClassName}
                            />
                            <InlineError id="signup-password-error" message={signupErrorFor("password")} />
                          </div>

                          <div className="space-y-1.5">
                            <Label
                              htmlFor="signup-confirm-password"
                              className="text-sm font-semibold text-slate-700"
                            >
                              Confirmar senha *
                            </Label>
                            <PasswordField
                              id="signup-confirm-password"
                              name="confirmPassword"
                              value={signupForm.confirmPassword}
                              onChange={(event) => updateSignupField("confirmPassword", event.target.value)}
                              onBlur={() => markSignupTouched("confirmPassword")}
                              placeholder="Repita a senha"
                              autoComplete="new-password"
                              enterKeyHint="done"
                              spellCheck={false}
                              aria-invalid={!!signupErrorFor("confirmPassword")}
                              aria-describedby={signupErrorFor("confirmPassword") ? "signup-confirm-password-error" : undefined}
                              error={signupErrorFor("confirmPassword")}
                              showPassword={showSignupConfirmPassword}
                              toggleLabel={showSignupConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                              onToggle={() => setShowSignupConfirmPassword((prev) => !prev)}
                              className={fieldClassName}
                            />
                            <InlineError
                              id="signup-confirm-password-error"
                              message={signupErrorFor("confirmPassword")}
                            />
                          </div>
                        </div>

                        <FormAlert message={signupServerError} />

                        <Button
                          type="submit"
                          className="h-12 w-full rounded-xl bg-blue-600 text-base font-semibold text-white shadow-[0_20px_35px_-20px_rgba(37,99,235,0.7)] transition hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500"
                          disabled={loading || !isSignupValid}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Criando conta...
                            </>
                          ) : (
                            "Criar Conta"
                          )}
                        </Button>

                        <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-xs leading-6 text-slate-500">
                          Ao criar a conta voce concorda com nossos{" "}
                          <Link to="/termos-de-uso" className="font-semibold text-slate-700 underline hover:text-blue-700">
                            Termos de Uso
                          </Link>{" "}
                          e{" "}
                          <Link
                            to="/politica-de-privacidade"
                            className="font-semibold text-slate-700 underline hover:text-blue-700"
                          >
                            Politica de Privacidade
                          </Link>
                          .
                        </p>
                      </motion.form>
                    </TabsContent>
                  </CardContent>
                </Tabs>
              </Card>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
