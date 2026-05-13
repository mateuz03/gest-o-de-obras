CREATE TABLE public.fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_loja TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  endereco TEXT NOT NULL,
  cidade TEXT,
  estado TEXT,
  responsavel TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT,
  plano TEXT NOT NULL DEFAULT 'basico',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit fornecedor"
ON public.fornecedores FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view fornecedores"
ON public.fornecedores FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update fornecedores"
ON public.fornecedores FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete fornecedores"
ON public.fornecedores FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_fornecedores_updated_at
BEFORE UPDATE ON public.fornecedores
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();