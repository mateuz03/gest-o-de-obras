-- 1. Add rejection reason column to store profiles
ALTER TABLE public.perfil_lojista ADD COLUMN IF NOT EXISTS motivo_rejeicao text;

-- 2. Backfill: existing active stores become approved so they keep their visibility
UPDATE public.perfil_lojista SET status = 'approved' WHERE status = 'ativo' OR status IS NULL OR status NOT IN ('pending','approved','rejected');

-- 3. New stores start as pending (require admin approval)
ALTER TABLE public.perfil_lojista ALTER COLUMN status SET DEFAULT 'pending';

-- 4. Allow admins to moderate (approve/reject) any store
CREATE POLICY "Admins podem moderar lojas"
ON public.perfil_lojista
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));