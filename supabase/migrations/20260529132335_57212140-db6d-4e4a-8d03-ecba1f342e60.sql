ALTER TABLE public.perfil_lojista
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;

-- Marca como destaque as lojas que já possuem plano premium
UPDATE public.perfil_lojista
SET is_premium = true
WHERE lower(coalesce(plano_atual, '')) IN ('premium', 'pro', 'destaque');