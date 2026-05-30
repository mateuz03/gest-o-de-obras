import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Box, CheckCircle2, Lock, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Mínimo de 8 caracteres")
      .max(72, "Máximo de 72 caracteres")
      .regex(/[A-Za-z]/, "Inclua ao menos uma letra")
      .regex(/[0-9]/, "Inclua ao menos um número"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  });

type TokenStatus = "checking" | "valid" | "expired" | "invalid";

// Calcula a força da senha com base em comprimento e variedade de caracteres
function getPasswordStrength(pw: string): {
  score: number;
  label: string;
  barClass: string;
  textClass: string;
} {
  if (!pw) return { score: 0, label: "", barClass: "", textClass: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score: 1, label: "Fraca", barClass: "bg-destructive", textClass: "text-destructive" };
  if (score === 2) return { score: 2, label: "Média", barClass: "bg-amber-500", textClass: "text-amber-600" };
  if (score === 3) return { score: 3, label: "Forte", barClass: "bg-primary", textClass: "text-primary" };
  return { score: 4, label: "Muito forte", barClass: "bg-accent", textClass: "text-accent" };
}

function Criterion({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={cn("flex items-center gap-1.5 text-xs", ok ? "text-foreground" : "text-muted-foreground")}>
      {ok ? (
        <Check className="h-3.5 w-3.5 text-primary" />
      ) : (
        <X className="h-3.5 w-3.5 text-muted-foreground/60" />
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

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const hasMinLength = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const isFormValid = useMemo(
    () => passwordSchema.safeParse({ password, confirmPassword }).success,
    [password, confirmPassword],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = passwordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        const k = String(i.path[0] ?? "");
        if (!fe[k]) fe[k] = i.message;
      });
      setErrors(fe);
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Link to="/" className="mb-6 flex items-center gap-2 text-2xl font-bold">
        <Box className="h-7 w-7 text-primary" />
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
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : success ? (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-6 w-6 text-primary" />
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
                <X className="h-6 w-6 text-destructive" />
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
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha *</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres, com letra e número"
                    className="pl-9"
                    autoComplete="new-password"
                    aria-invalid={!!errors.password}
                  />
                </div>

                {password && (
                  <div className="space-y-2 pt-1">
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
                    <p className={cn("text-xs font-medium", strength.textClass)}>
                      Força da senha: {strength.label}
                    </p>
                  </div>
                )}

                <ul className="space-y-1 pt-1">
                  <Criterion ok={hasMinLength} label="Mínimo de 8 caracteres" />
                  <Criterion ok={hasLetter} label="Pelo menos uma letra" />
                  <Criterion ok={hasNumber} label="Pelo menos um número" />
                </ul>

                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar nova senha *</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    className="pl-9"
                    autoComplete="new-password"
                    aria-invalid={!!errors.confirmPassword}
                  />
                </div>
                {confirmPassword && (
                  <Criterion ok={passwordsMatch} label="As senhas conferem" />
                )}
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword}</p>
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
