import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { Box, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const emailSchema = z.string().trim().email().max(255);

export default function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const isValid = useMemo(() => emailSchema.safeParse(email).success, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    try {
      // Por segurança, sempre exibimos a mesma mensagem, sem revelar se o e-mail existe
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      setSent(true);
    } catch {
      // Mantemos o mesmo feedback para não vazar existência de conta
      setSent(true);
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
                <Button asChild className="w-full">
                  <Link to="/auth">Voltar ao login</Link>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setSent(false);
                    setEmail("");
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
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={!isValid || loading}>
                {loading ? "Enviando..." : "Enviar Instruções"}
              </Button>

              <Link
                to="/auth"
                className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar ao login
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
