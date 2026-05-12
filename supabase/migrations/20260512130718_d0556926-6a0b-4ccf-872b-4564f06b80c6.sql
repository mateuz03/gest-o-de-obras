CREATE TABLE public.profissionais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  especialidade TEXT NOT NULL,
  regiao TEXT NOT NULL,
  valor_diaria NUMERIC NOT NULL DEFAULT 0,
  telefone TEXT NOT NULL,
  resumo TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profissionais"
ON public.profissionais FOR SELECT
USING (true);

CREATE POLICY "Users can insert own profissional"
ON public.profissionais FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profissional"
ON public.profissionais FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profissional"
ON public.profissionais FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_profissionais_updated_at
BEFORE UPDATE ON public.profissionais
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();