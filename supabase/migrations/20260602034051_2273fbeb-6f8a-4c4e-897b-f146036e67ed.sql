ALTER TABLE public.produtos_loja
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_until timestamptz;

ALTER TABLE public.perfil_lojista
  ADD COLUMN IF NOT EXISTS featured_until timestamptz;