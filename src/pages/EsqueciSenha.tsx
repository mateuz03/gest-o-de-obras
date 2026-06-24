import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { Box, ArrowLeft, Mail, CheckCircle2, RefreshCw, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/integrations/supabase/client";
import { toast } from "sonner";

const emailSchema = z.string().trim().email("Informe um e-mail valido").max(255);
const RESEND_COOLDOWN = 60;

function InlineAlert({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
    >
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

export default function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [rateLimitMsg, setRateLimitMsg] = useState<string | null>(null);

  const emailValidation = useMemo(() => emailSchema.safeParse(email), [email]);
  const isValid = emailValidation.success;
  const emailError = emailTouched || submitted
    ? (emailValidation.success ? undefined : emailValidation.error.issues[0]?.message)
    : undefined;

  useEffect(() => {
    if (cooldown <= 0) return;

    const id = setInterval(() => {
      setCooldown((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    return () => clearInterval(id);
  }, [cooldown]);

  const sendLink = async (): Promise<{ rateLimitMessage?: string; hiddenError?: string }> => {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/request-password-reset`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          redirectTo: `${window.location.origin}/redefinir-senha`,
        }),
      },
    );

    if (response.status === 429) {
      const data = await response.json().catch(() => ({}));
      return {
        rateLimitMessage:
          data.error
          || "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.",
      };
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        hiddenError: body || `request-password-reset returned ${response.status}`,
      };
    }

    return {};
  };

  const completeWithGenericSuccess = () => {
    setSent(true);
    setCooldown(RESEND_COOLDOWN);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    setEmailTouched(true);
    setRateLimitMsg(null);

    if (!isValid) return;

    setLoading(true);

    try {
      const result = await sendLink();

      if (result.rateLimitMessage) {
        setRateLimitMsg(result.rateLimitMessage);
        return;
      }

      if (result.hiddenError) {
        console.error("[forgot-password] hidden failure during submit:", result.hiddenError);
      }

      completeWithGenericSuccess();
    } catch (error) {
      console.error("[forgot-password] request failed during submit:", error);
      completeWithGenericSuccess();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !isValid) return;

    setLoading(true);
    setRateLimitMsg(null);

    try {
      const result = await sendLink();

      if (result.rateLimitMessage) {
        setRateLimitMsg(result.rateLimitMessage);
        return;
      }

      if (result.hiddenError) {
        console.error("[forgot-password] hidden failure during resend:", result.hiddenError);
      }

      toast.success("Se o e-mail estiver cadastrado, o link foi reenviado.");
      setCooldown(RESEND_COOLDOWN);
    } catch (error) {
      console.error("[forgot-password] request failed during resend:", error);
      toast.success("Se o e-mail estiver cadastrado, o link foi reenviado.");
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
            Informe seu e-mail e enviaremos um link para criar uma nova senha.
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
                  Se o e-mail estiver cadastrado em nossa plataforma, voce recebera
                  um link de recuperacao em instantes. Verifique a caixa de entrada
                  e a pasta de spam.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <InlineAlert message={rateLimitMsg} />

                <Button className="w-full" onClick={handleResend} disabled={cooldown > 0 || loading}>
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
                    setEmailTouched(false);
                    setSubmitted(false);
                    setRateLimitMsg(null);
                    setCooldown(0);
                  }}
                >
                  Enviar para outro e-mail
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="recover-email">E-mail cadastrado</Label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="recover-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    placeholder="seu@email.com"
                    className="pl-9"
                    autoComplete="email"
                    autoCapitalize="none"
                    inputMode="email"
                    enterKeyHint="done"
                    spellCheck={false}
                    autoFocus
                    required
                    aria-required="true"
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? "recover-email-error" : "recover-email-hint"}
                  />
                </div>

                <p id="recover-email-hint" className="text-xs text-muted-foreground">
                  Enviaremos um link de redefinicao se este e-mail estiver cadastrado.
                </p>
                {emailError ? (
                  <p id="recover-email-error" role="alert" className="text-xs text-destructive">
                    {emailError}
                  </p>
                ) : null}
              </div>

              <InlineAlert message={rateLimitMsg} />

              <Button type="submit" className="w-full" disabled={!isValid || loading}>
                {loading ? "Enviando..." : "Enviar instrucoes"}
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
