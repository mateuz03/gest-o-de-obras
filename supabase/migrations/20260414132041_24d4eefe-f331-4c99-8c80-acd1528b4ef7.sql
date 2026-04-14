
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nome_completo text,
  ADD COLUMN IF NOT EXISTS tipo_empresa text,
  ADD COLUMN IF NOT EXISTS nome_empresa text,
  ADD COLUMN IF NOT EXISTS qtd_funcionarios text,
  ADD COLUMN IF NOT EXISTS qtd_obras_atual integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ano_criacao_negocio integer,
  ADD COLUMN IF NOT EXISTS celular_whatsapp text,
  ADD COLUMN IF NOT EXISTS data_nascimento date,
  ADD COLUMN IF NOT EXISTS motivo_uso text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS area_atuacao text,
  ADD COLUMN IF NOT EXISTS como_conheceu text;
