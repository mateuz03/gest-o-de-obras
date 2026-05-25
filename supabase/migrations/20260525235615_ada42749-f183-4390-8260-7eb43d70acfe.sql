ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type text CHECK (account_type IN ('PF','PJ')),
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS inscricao_estadual text,
  ADD COLUMN IF NOT EXISTS telefone_comercial text;