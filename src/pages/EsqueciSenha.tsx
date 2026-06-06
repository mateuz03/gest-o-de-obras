import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { Box, ArrowLeft, Mail, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";

const emailSchema = z.string().trim().email().max(255);
const RESEND_COOLDOWN = 60;

export default function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [rateLimitMsg, setRateLimitMsg] = useState<string | null>(null);

  const isValid = useMemo(() => emailSchema.safeParse(email).success, [email]);

  // Contagem regressiva do cooldown de reenvio (prevenção de spam)
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // Chama o endpoint do servidor que aplica o rate limiting (3 / 15 min por IP+e-mail).
  // Retorna a mensagem de bloqueio quando o servidor responde 429, ou null em caso de sucesso.
  const sendLink = async (): Promise<string | null> => {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/request-password-reset`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          redirectTo: `${window.location.origin}/redefinir-senha`,
        }),
      },
    );

    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      return (
        data.error ||
        "Muitas tentativas. Por favor, aguarde alguns minutos antes de tentar novamente."
      );
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setRateLimitMsg(null);
    try {
      const limited = await sendLink();
      if (limited) {
        setRateLimitMsg(limited);
        return;
      }
      setSent(true);
      setCooldown(RESEND_COOLDOWN);
    } catch {
      // Mantemos o mesmo feedback para não vazar existência de conta
      setSent(true);
      setCooldown(RESEND_COOLDOWN);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !isValid) return;
    setLoading(true);
    setRateLimitMsg(null);
    try {
      const limited = await sendLink();
      if (limited) {
        setRateLimitMsg(limited);
        return;
      }
      toast.success("Link reenviado! Verifique sua caixa de entrada.");
      setCooldown(RESEND_COOLDOWN);
    } catch {
      toast.success("Link reenviado! Verifique sua caixa de entrada.");
      setCooldown(RESEND_COOLDOWN);
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
          <h1 className="text-xl font-semibold">Recuperar senha</h1>
          <p className="text-sm text-muted-foreground">
            Informe o e-mail cadastrado e enviaremos um link para você criar uma nova senha.
          </p>
        </CardHeader>

        <CardContent>
          {sent ? (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-base font-semibold">Verifique seu e-mail</h2>
                <p className="text-sm text-muted-foreground">
                  Se o e-mail estiver cadastrado em nossa plataforma, você receberá um
                  link de recuperação em instantes. Verifique sua caixa de entrada e a
                  pasta de spam.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {rateLimitMsg && (
                  <p
                    role="alert"
                    className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive"
                  >
                    {rateLimitMsg}
                  </p>
                )}
                <Button
                  className="w-full"
                  onClick={handleResend}
                  disabled={cooldown > 0 || loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
                  {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar link"}
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/auth">Voltar ao login</Link>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setSent(false);
                    setEmail("");
                    setCooldown(0);
                  }}
                >
                  Enviar para outro e-mail
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="recover-email">E-mail cadastrado</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="recover-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="pl-9"
                    autoComplete="email"
                    autoFocus
                    required
                    aria-required="true"
                    aria-invalid={email.length > 0 && !isValid}
                    aria-describedby="recover-email-hint"
                  />
                </div>
                <p id="recover-email-hint" className="text-xs text-muted-foreground">
                  Enviaremos um link de redefinição se este e-mail estiver cadastrado.
                </p>
              </div>

              {rateLimitMsg && (
                <p
                  role="alert"
                  tabIndex={-1}
                  className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive"
                >
                  {rateLimitMsg}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={!isValid || loading}>
                {loading ? "Enviando..." : "Enviar Instruções"}
              </Button>

              <Link
                to="/auth"
                className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Voltar ao login
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
