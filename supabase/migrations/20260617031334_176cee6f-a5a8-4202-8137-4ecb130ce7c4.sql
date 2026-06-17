-- =========================================================
-- 1. Plano de marketplace (Freemium) na tabela profiles
-- =========================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plano_marketplace text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plano_marketplace_until timestamptz;

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_plano_marketplace_check
    CHECK (plano_marketplace IN ('free','pro'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================
-- 2. Funções de limite de publicação (canUserPublish)
-- =========================================================
CREATE OR REPLACE FUNCTION public.can_user_publish(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((
      SELECT plano_marketplace = 'pro'
        AND (plano_marketplace_until IS NULL OR plano_marketplace_until > now())
      FROM public.profiles WHERE user_id = _user_id
    ), false)
    OR (
      SELECT count(*) FROM public.produtos_loja
      WHERE user_id = _user_id AND status = 'ativo'
    ) < 10;
$$;

CREATE OR REPLACE FUNCTION public.get_publish_status(_user_id uuid)
RETURNS TABLE(active_count integer, free_limit integer, is_pro boolean, can_publish boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*)::int FROM public.produtos_loja WHERE user_id = _user_id AND status = 'ativo'),
    10,
    COALESCE((
      SELECT plano_marketplace = 'pro'
        AND (plano_marketplace_until IS NULL OR plano_marketplace_until > now())
      FROM public.profiles WHERE user_id = _user_id
    ), false),
    public.can_user_publish(_user_id);
$$;

GRANT EXECUTE ON FUNCTION public.can_user_publish(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_publish_status(uuid) TO authenticated;

-- =========================================================
-- 3. Tabela de pagamentos Pix
-- =========================================================
CREATE TABLE public.pix_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gateway text NOT NULL DEFAULT 'mercadopago',
  gateway_payment_id text UNIQUE,
  purpose text NOT NULL,
  target_id uuid,
  plano_dias integer NOT NULL DEFAULT 7,
  valor numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  qr_code text,
  qr_code_base64 text,
  ticket_url text,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pix_payments TO authenticated;
GRANT ALL ON public.pix_payments TO service_role;

ALTER TABLE public.pix_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario ve seus proprios pagamentos"
  ON public.pix_payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin ve todos os pagamentos"
  ON public.pix_payments FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_pix_payments_updated_at
  BEFORE UPDATE ON public.pix_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 4. Auditoria de destaques
-- =========================================================
CREATE TABLE public.featured_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  source text NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  old_is_featured boolean,
  new_is_featured boolean,
  old_featured_until timestamptz,
  new_featured_until timestamptz,
  justificativa text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.featured_audit_log TO authenticated;
GRANT ALL ON public.featured_audit_log TO service_role;

ALTER TABLE public.featured_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin ve auditoria de destaques"
  ON public.featured_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 5. Telemetria do marketplace
-- =========================================================
CREATE TABLE public.marketplace_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid,
  target_type text,
  target_id uuid,
  is_featured boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.marketplace_events TO anon, authenticated;
GRANT SELECT ON public.marketplace_events TO authenticated;
GRANT ALL ON public.marketplace_events TO service_role;

ALTER TABLE public.marketplace_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um registra eventos"
  ON public.marketplace_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admin le eventos"
  ON public.marketplace_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_marketplace_events_type_created
  ON public.marketplace_events (event_type, created_at);
CREATE INDEX idx_marketplace_events_target
  ON public.marketplace_events (target_type, target_id);

-- =========================================================
-- 6. Confirmação idempotente de pagamento Pix (webhook)
-- =========================================================
CREATE OR REPLACE FUNCTION public.confirm_pix_payment(_gateway_payment_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pay public.pix_payments%ROWTYPE;
  new_until timestamptz;
BEGIN
  SELECT * INTO pay FROM public.pix_payments
    WHERE gateway_payment_id = _gateway_payment_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF pay.status = 'paid' THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'already_processed');
  END IF;

  UPDATE public.pix_payments
    SET status = 'paid', paid_at = now(), updated_at = now()
    WHERE id = pay.id;

  IF pay.purpose = 'destaque_produto' THEN
    SELECT GREATEST(COALESCE(featured_until, now()), now()) + (pay.plano_dias || ' days')::interval
      INTO new_until FROM public.produtos_loja WHERE id = pay.target_id;
    UPDATE public.produtos_loja
      SET is_featured = true, featured_until = new_until
      WHERE id = pay.target_id;
    INSERT INTO public.featured_audit_log
      (source, action, target_type, target_id, new_is_featured, new_featured_until, justificativa)
      VALUES ('webhook','feature_granted','produto', pay.target_id, true, new_until, 'Pagamento Pix confirmado');

  ELSIF pay.purpose = 'destaque_loja' THEN
    SELECT GREATEST(COALESCE(featured_until, now()), now()) + (pay.plano_dias || ' days')::interval
      INTO new_until FROM public.perfil_lojista WHERE user_id = pay.target_id;
    UPDATE public.perfil_lojista
      SET is_premium = true, featured_until = new_until
      WHERE user_id = pay.target_id;
    INSERT INTO public.featured_audit_log
      (source, action, target_type, target_id, new_is_featured, new_featured_until, justificativa)
      VALUES ('webhook','feature_granted','loja', pay.target_id, true, new_until, 'Pagamento Pix confirmado');

  ELSIF pay.purpose = 'plano_pro' THEN
    UPDATE public.profiles
      SET plano_marketplace = 'pro',
          plano_marketplace_until = GREATEST(COALESCE(plano_marketplace_until, now()), now()) + (pay.plano_dias || ' days')::interval
      WHERE user_id = pay.user_id;
  END IF;

  INSERT INTO public.marketplace_events
    (event_type, user_id, target_type, target_id, is_featured, metadata)
    VALUES ('feature_conversion', pay.user_id,
      CASE pay.purpose WHEN 'destaque_loja' THEN 'loja' WHEN 'plano_pro' THEN 'plano' ELSE 'produto' END,
      COALESCE(pay.target_id, pay.user_id), true,
      jsonb_build_object('valor', pay.valor, 'purpose', pay.purpose, 'dias', pay.plano_dias));

  RETURN jsonb_build_object('ok', true, 'reason', 'processed');
END;
$$;

-- =========================================================
-- 7. Override manual de destaque (admin)
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_override_featured(
  _target_type text,
  _target_id uuid,
  _is_featured boolean,
  _featured_until timestamptz,
  _justificativa text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_f boolean;
  old_u timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _justificativa IS NULL OR length(trim(_justificativa)) < 3 THEN
    RAISE EXCEPTION 'justificativa obrigatoria';
  END IF;

  IF _target_type = 'produto' THEN
    SELECT is_featured, featured_until INTO old_f, old_u FROM public.produtos_loja WHERE id = _target_id;
    UPDATE public.produtos_loja SET is_featured = _is_featured, featured_until = _featured_until WHERE id = _target_id;
  ELSIF _target_type = 'loja' THEN
    SELECT is_premium, featured_until INTO old_f, old_u FROM public.perfil_lojista WHERE user_id = _target_id;
    UPDATE public.perfil_lojista SET is_premium = _is_featured, featured_until = _featured_until WHERE user_id = _target_id;
  ELSE
    RAISE EXCEPTION 'tipo invalido';
  END IF;

  INSERT INTO public.featured_audit_log
    (actor_id, source, action, target_type, target_id, old_is_featured, new_is_featured, old_featured_until, new_featured_until, justificativa)
    VALUES (auth.uid(), 'admin',
      CASE WHEN _is_featured = false THEN 'feature_revoked' ELSE 'feature_extended' END,
      _target_type, _target_id, old_f, _is_featured, old_u, _featured_until, _justificativa);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_override_featured(text, uuid, boolean, timestamptz, text) TO authenticated;

-- =========================================================
-- 8. Rotina de expiração de destaques (cron horário)
-- =========================================================
CREATE OR REPLACE FUNCTION public.expire_features()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.featured_audit_log
    (source, action, target_type, target_id, old_is_featured, new_is_featured, old_featured_until, new_featured_until)
  SELECT 'cron','feature_expired','produto', id, true, false, featured_until, featured_until
  FROM public.produtos_loja
  WHERE is_featured = true AND featured_until IS NOT NULL AND featured_until < now();

  UPDATE public.produtos_loja
    SET is_featured = false
    WHERE is_featured = true AND featured_until IS NOT NULL AND featured_until < now();

  INSERT INTO public.featured_audit_log
    (source, action, target_type, target_id, old_is_featured, new_is_featured, old_featured_until, new_featured_until)
  SELECT 'cron','feature_expired','loja', user_id, true, false, featured_until, featured_until
  FROM public.perfil_lojista
  WHERE is_premium = true AND featured_until IS NOT NULL AND featured_until < now();

  UPDATE public.perfil_lojista
    SET is_premium = false
    WHERE is_premium = true AND featured_until IS NOT NULL AND featured_until < now();
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$ BEGIN
  PERFORM cron.unschedule('expire-featured-hourly');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule('expire-featured-hourly', '0 * * * *', $$ SELECT public.expire_features(); $$);