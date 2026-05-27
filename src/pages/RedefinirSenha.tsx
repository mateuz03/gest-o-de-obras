import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Box, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

export default function RedefinirSenha() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [validToken, setValidToken] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Supabase envia o token no hash da URL (#access_token=...&type=recovery)
  // e dispara um evento PASSWORD_RECOVERY na sessão.
  useEffect(() => {
    const hash = window.location.hash || "";
    const isRecovery = hash.includes("type=recovery");

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setValidToken(true);
        setReady(true);
      }
    });

    // Verifica também se já existe uma sessão de recuperação ativa
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && isRecovery) {
        setValidToken(true);
      }
      setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

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
          ) : !validToken ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                O link de recuperação é inválido ou expirou. Solicite um novo link
                para continuar.
              </p>
              <Button asChild className="w-full">
                <Link to="/esqueci-senha">Solicitar novo link</Link>
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
