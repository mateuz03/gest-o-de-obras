import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Box, CheckCircle2, Lock, Check, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  validatePasswordStrength,
  PASSWORD_MIN_LENGTH,
} from "@/lib/passwordStrength";

type TokenStatus = "checking" | "valid" | "expired" | "invalid";

function Criterion({ ok, label, id }: { ok: boolean; label: string; id?: string }) {
  return (
    <li
      id={id}
      className={cn("flex items-center gap-1.5 text-xs", ok ? "text-foreground" : "text-muted-foreground")}
    >
      {ok ? (
        <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
      ) : (
        <X className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden="true" />
      )}
      {label}
    </li>
  );
}

export default function RedefinirSenha() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  // Supabase envia o token no hash da URL (#access_token=...&type=recovery)
  // e dispara um evento PASSWORD_RECOVERY na sessão. Em caso de link expirado
  // ou inválido, o hash traz error/error_code/error_description.
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    const params = new URLSearchParams(hash);
    const errorCode = params.get("error_code") || params.get("error");
    const isRecovery = hash.includes("type=recovery");

    if (errorCode) {
      const expired = errorCode.includes("otp_expired") || errorCode.includes("expired");
      setTokenStatus(expired ? "expired" : "invalid");
      setReady(true);
      return;
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setTokenStatus("valid");
        setReady(true);
      }
    });

    // Verifica também se já existe uma sessão de recuperação ativa
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && isRecovery) {
        setTokenStatus("valid");
      } else if (!isRecovery) {
        setTokenStatus("invalid");
      }
      setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Fonte única de verdade: alimenta o medidor visual E a validação.
  const strength = useMemo(() => validatePasswordStrength(password), [password]);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const isFormValid = strength.isValid && password === confirmPassword && confirmPassword.length > 0;

  // Lista ordenada de erros para o resumo no topo do formulário.
  const errorEntries = useMemo(
    () =>
      Object.entries(errors).map(([field, message]) => ({
        field,
        message,
        targetId: field === "confirmPassword" ? "confirm-password" : "new-password",
      })),
    [errors],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Valida usando o utilitário compartilhado.
    const fe: Record<string, string> = {};
    if (!strength.isValid) {
      fe.password = strength.errors[0] ?? "Senha inválida";
    }
    if (confirmPassword.length === 0) {
      fe.confirmPassword = "Confirme a nova senha";
    } else if (password !== confirmPassword) {
      fe.confirmPassword = "As senhas não conferem";
    }

    if (Object.keys(fe).length > 0) {
      setErrors(fe);
      // Move o foco para o resumo de erros assim que o envio falha.
      requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      await supabase.auth.signOut();
      setTimeout(() => navigate("/auth", { replace: true }), 2500);
    } catch (err: any) {
      toast.error(err.message || "Não foi possível redefinir a senha");
    } finally {
      setLoading(false);
    }
  };

  const hasErrors = errorEntries.length > 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Link to="/" className="mb-6 flex items-center gap-2 text-2xl font-bold">
        <Box className="h-7 w-7 text-primary" aria-hidden="true" />
        Obra Link
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 pb-3">
          <h1 className="text-xl font-semibold">Criar nova senha</h1>
          <p className="text-sm text-muted-foreground">
            Defina uma nova senha segura para acessar sua conta.
          </p>
        </CardHeader>

        <CardContent>
          {!ready ? (
            <div className="flex justify-center py-6">
              <div
                className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
                role="status"
                aria-label="Verificando link de recuperação"
              />
            </div>
          ) : success ? (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-semibold">Senha redefinida!</h2>
                <p className="text-sm text-muted-foreground">
                  Você será redirecionado para o login em instantes.
                </p>
              </div>
              <Button asChild className="w-full">
                <Link to="/auth">Ir para o login agora</Link>
              </Button>
            </div>
          ) : tokenStatus !== "valid" ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <X className="h-6 w-6 text-destructive" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-semibold">
                  {tokenStatus === "expired" ? "Link expirado" : "Link inválido"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {tokenStatus === "expired"
                    ? "Este link de recuperação expirou. Por segurança, os links têm validade limitada. Solicite um novo para continuar."
                    : "Este link de recuperação é inválido ou já foi utilizado. Solicite um novo link para redefinir sua senha."}
                </p>
              </div>
              <Button asChild className="w-full">
                <Link to="/esqueci-senha">Solicitar novo link</Link>
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link to="/auth">Voltar ao login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Resumo de erros: recebe foco dinâmico ao falhar o envio */}
              {hasErrors && (
                <div
                  ref={errorSummaryRef}
                  tabIndex={-1}
                  role="alert"
                  aria-labelledby="error-summary-title"
                  className="rounded-md border border-destructive/40 bg-destructive/10 p-3 outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
                    <p id="error-summary-title" className="text-sm font-semibold text-destructive">
                      Corrija os seguintes problemas:
                    </p>
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-8 text-sm text-destructive">
                    {errorEntries.map((err) => (
                      <li key={err.field}>
                        <a href={`#${err.targetId}`} className="underline underline-offset-2">
                          {err.message}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha *</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres, com letra e número`}
                    className="pl-9"
                    autoComplete="new-password"
                    required
                    aria-required="true"
                    aria-invalid={!!errors.password}
                    aria-describedby="password-strength password-criteria password-error"
                  />
                </div>

                {password && (
                  <div className="space-y-2 pt-1" id="password-strength">
                    <div className="flex gap-1" aria-hidden="true">
                      {[1, 2, 3, 4].map((i) => (
                        <span
                          key={i}
                          className={cn(
                            "h-1.5 flex-1 rounded-full transition-colors",
                            i <= strength.score ? strength.barClass : "bg-muted",
                          )}
                        />
                      ))}
                    </div>
                    <p className={cn("text-xs font-medium", strength.textClass)} aria-live="polite">
                      Força da senha: {strength.label}
                    </p>
                  </div>
                )}

                <ul className="space-y-1 pt-1" id="password-criteria">
                  {strength.criteria.map((c) => (
                    <Criterion key={c.key} ok={c.met} label={c.label} />
                  ))}
                </ul>

                {errors.password && (
                  <p id="password-error" className="text-xs text-destructive">
                    {errors.password}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar nova senha *</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    className="pl-9"
                    autoComplete="new-password"
                    required
                    aria-required="true"
                    aria-invalid={!!errors.confirmPassword}
                    aria-describedby="confirm-match confirm-error"
                  />
                </div>
                {confirmPassword && (
                  <div id="confirm-match">
                    <Criterion ok={passwordsMatch} label="As senhas conferem" />
                  </div>
                )}
                {errors.confirmPassword && (
                  <p id="confirm-error" className="text-xs text-destructive">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !isFormValid}
              >
                {loading ? "Salvando..." : "Redefinir senha"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
