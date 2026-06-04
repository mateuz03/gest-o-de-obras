CREATE TABLE public.password_reset_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  ip text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.password_reset_attempts TO service_role;

ALTER TABLE public.password_reset_attempts ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated: only the service role (edge function) may access this table.

CREATE INDEX idx_pra_email_created ON public.password_reset_attempts (email, created_at);
CREATE INDEX idx_pra_ip_created ON public.password_reset_attempts (ip, created_at);