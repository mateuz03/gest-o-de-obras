-- Admin backoffice operational foundation

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS suspension_reason text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_account_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_account_status_check
      CHECK (account_status IN ('active', 'suspended', 'banned'));
  END IF;
END $$;

ALTER TABLE public.perfil_lojista
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_hidden boolean NOT NULL DEFAULT false;

ALTER TABLE public.produtos_loja
  ADD COLUMN IF NOT EXISTS admin_hidden boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read system settings" ON public.system_settings;
CREATE POLICY "Admins read system settings"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage system settings" ON public.system_settings;
CREATE POLICY "Admins manage system settings"
  ON public.system_settings
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.system_settings (key, value, description)
VALUES
  (
    'maintenance_mode',
    jsonb_build_object(
      'enabled', false,
      'message', 'A plataforma estÃ¡ temporariamente em manutenÃ§Ã£o. Tente novamente em instantes.'
    ),
    'Bloqueia o acesso de usuÃ¡rios nÃ£o administradores.'
  ),
  (
    'seller_onboarding',
    jsonb_build_object('enabled', true),
    'Permite o cadastro e atualizaÃ§Ã£o de lojas do marketplace.'
  )
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.admin_action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_action_log TO authenticated;
GRANT ALL ON public.admin_action_log TO service_role;

ALTER TABLE public.admin_action_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read action log" ON public.admin_action_log;
CREATE POLICY "Admins read action log"
  ON public.admin_action_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_admin_action_log_created_at
  ON public.admin_action_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_action_log_target
  ON public.admin_action_log (target_type, target_id);

CREATE TABLE IF NOT EXISTS public.marketplace_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('produto', 'loja')),
  target_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  decision_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.marketplace_reports TO authenticated;
GRANT ALL ON public.marketplace_reports TO service_role;

ALTER TABLE public.marketplace_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert marketplace reports" ON public.marketplace_reports;
CREATE POLICY "Users insert marketplace reports"
  ON public.marketplace_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users read own marketplace reports" ON public.marketplace_reports;
CREATE POLICY "Users read own marketplace reports"
  ON public.marketplace_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Admins read all marketplace reports" ON public.marketplace_reports;
CREATE POLICY "Admins read all marketplace reports"
  ON public.marketplace_reports
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update marketplace reports" ON public.marketplace_reports;
CREATE POLICY "Admins update marketplace reports"
  ON public.marketplace_reports
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_marketplace_reports_status_created
  ON public.marketplace_reports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_reports_target
  ON public.marketplace_reports (target_type, target_id);

DROP POLICY IF EXISTS "Admins view sinapi uploads" ON public.sinapi_uploads;
CREATE POLICY "Admins view sinapi uploads"
  ON public.sinapi_uploads
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete sinapi uploads" ON public.sinapi_uploads;
CREATE POLICY "Admins delete sinapi uploads"
  ON public.sinapi_uploads
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_log_action(
  _action text,
  _target_type text,
  _target_id text DEFAULT NULL,
  _reason text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  created_id uuid;
BEGIN
  INSERT INTO public.admin_action_log (
    actor_id,
    action,
    target_type,
    target_id,
    reason,
    metadata
  )
  VALUES (
    auth.uid(),
    trim(coalesce(_action, 'admin_action')),
    trim(coalesce(_target_type, 'system')),
    _target_id,
    NULLIF(trim(coalesce(_reason, '')), ''),
    coalesce(_metadata, '{}'::jsonb)
  )
  RETURNING id INTO created_id;

  RETURN created_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_platform_flags()
RETURNS TABLE(
  maintenance_mode boolean,
  maintenance_message text,
  seller_onboarding_open boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    COALESCE(
      (
        SELECT (value->>'enabled')::boolean
        FROM public.system_settings
        WHERE key = 'maintenance_mode'
      ),
      false
    ) AS maintenance_mode,
    COALESCE(
      (
        SELECT NULLIF(trim(value->>'message'), '')
        FROM public.system_settings
        WHERE key = 'maintenance_mode'
      ),
      'A plataforma estÃ¡ temporariamente em manutenÃ§Ã£o. Tente novamente em instantes.'
    ) AS maintenance_message,
    COALESCE(
      (
        SELECT (value->>'enabled')::boolean
        FROM public.system_settings
        WHERE key = 'seller_onboarding'
      ),
      true
    ) AS seller_onboarding_open;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_flags() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_dashboard_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  latest_sinapi jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT
    CASE
      WHEN s.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'id', s.id,
        'nome_arquivo', s.nome_arquivo,
        'status', s.status,
        'qtd_itens', s.qtd_itens,
        'regiao', s.regiao,
        'mes_ano', s.mes_ano,
        'created_at', s.created_at
      )
    END
  INTO latest_sinapi
  FROM public.sinapi_uploads s
  ORDER BY s.created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'users', jsonb_build_object(
      'total', (SELECT count(*) FROM public.profiles),
      'cpf', (SELECT count(*) FROM public.profiles WHERE public.normalize_account_type(account_type) = 'PF'),
      'cnpj', (SELECT count(*) FROM public.profiles WHERE public.normalize_account_type(account_type) = 'PJ'),
      'active', (SELECT count(*) FROM public.profiles WHERE account_status = 'active'),
      'suspended', (SELECT count(*) FROM public.profiles WHERE account_status = 'suspended'),
      'banned', (SELECT count(*) FROM public.profiles WHERE account_status = 'banned'),
      'admins', (SELECT count(*) FROM public.user_roles WHERE role = 'admin')
    ),
    'marketplace', jsonb_build_object(
      'pendingStores', (SELECT count(*) FROM public.perfil_lojista WHERE status = 'pending'),
      'approvedStores', (SELECT count(*) FROM public.perfil_lojista WHERE status = 'approved'),
      'hiddenStores', (SELECT count(*) FROM public.perfil_lojista WHERE admin_hidden = true),
      'activeProducts', (SELECT count(*) FROM public.produtos_loja WHERE status = 'ativo' AND admin_hidden = false),
      'hiddenProducts', (SELECT count(*) FROM public.produtos_loja WHERE admin_hidden = true),
      'featuredProducts', (SELECT count(*) FROM public.produtos_loja WHERE is_featured = true AND featured_until IS NOT NULL AND featured_until > now()),
      'featuredStores', (SELECT count(*) FROM public.perfil_lojista WHERE is_premium = true AND featured_until IS NOT NULL AND featured_until > now()),
      'pendingReports', (SELECT count(*) FROM public.marketplace_reports WHERE status IN ('pending', 'reviewing')),
      'openPixCharges', (SELECT count(*) FROM public.pix_payments WHERE status IN ('pending', 'processing')),
      'paidPixCharges', (SELECT count(*) FROM public.pix_payments WHERE status = 'paid')
    ),
    'operations', jsonb_build_object(
      'analyses', (SELECT count(*) FROM public.analyses),
      'analysesLast30Days', (SELECT count(*) FROM public.analyses WHERE created_at >= now() - interval '30 days'),
      'aiFailuresLast7Days', (SELECT count(*) FROM public.analysis_extraction_runs WHERE status IN ('error', 'failed') AND created_at >= now() - interval '7 days'),
      'aiPendingRuns', (SELECT count(*) FROM public.analysis_extraction_runs WHERE status IN ('pending', 'processing')),
      'webhookFailures', (SELECT count(*) FROM public.webhook_events WHERE status = 'failed'),
      'blogPosts', (SELECT count(*) FROM public.blog_posts),
      'sinapiUploads', (SELECT count(*) FROM public.sinapi_uploads),
      'latestSinapiUpload', latest_sinapi
    ),
    'flags', jsonb_build_object(
      'maintenanceMode', COALESCE((SELECT (value->>'enabled')::boolean FROM public.system_settings WHERE key = 'maintenance_mode'), false),
      'sellerOnboardingOpen', COALESCE((SELECT (value->>'enabled')::boolean FROM public.system_settings WHERE key = 'seller_onboarding'), true)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_dashboard_snapshot() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_users(
  _query text DEFAULT NULL,
  _account_type text DEFAULT NULL,
  _status text DEFAULT NULL,
  _plan text DEFAULT NULL,
  _limit integer DEFAULT 50,
  _offset integer DEFAULT 0
)
RETURNS TABLE(
  user_id uuid,
  email text,
  nome text,
  account_type text,
  account_status text,
  plano_marketplace text,
  plano_marketplace_until timestamptz,
  nome_empresa text,
  cpf text,
  cnpj text,
  analyses_count integer,
  active_ads_count integer,
  is_admin boolean,
  created_at timestamptz,
  total_rows bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      p.user_id,
      lower(coalesce(u.email, '')) AS email,
      COALESCE(NULLIF(trim(p.nome_completo), ''), NULLIF(trim(p.nome), ''), NULLIF(trim(p.nome_empresa), ''), 'Sem nome') AS nome,
      public.normalize_account_type(p.account_type) AS account_type,
      p.account_status,
      p.plano_marketplace,
      p.plano_marketplace_until,
      p.nome_empresa,
      p.cpf,
      p.cnpj,
      COALESCE(a.analyses_count, 0) AS analyses_count,
      COALESCE(pr.active_ads_count, 0) AS active_ads_count,
      EXISTS (
        SELECT 1
        FROM public.user_roles r
        WHERE r.user_id = p.user_id
          AND r.role = 'admin'
      ) AS is_admin,
      p.created_at
    FROM public.profiles p
    LEFT JOIN auth.users u
      ON u.id = p.user_id
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS analyses_count
      FROM public.analyses a
      WHERE a.user_id = p.user_id
    ) a ON true
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS active_ads_count
      FROM public.produtos_loja pr
      WHERE pr.user_id = p.user_id
        AND pr.status = 'ativo'
        AND pr.admin_hidden = false
    ) pr ON true
  ),
  filtered AS (
    SELECT *
    FROM base
    WHERE (
      _query IS NULL
      OR trim(_query) = ''
      OR nome ILIKE '%' || trim(_query) || '%'
      OR email ILIKE '%' || trim(_query) || '%'
      OR coalesce(nome_empresa, '') ILIKE '%' || trim(_query) || '%'
      OR regexp_replace(coalesce(cpf, ''), '\D', '', 'g') ILIKE '%' || regexp_replace(trim(_query), '\D', '', 'g') || '%'
      OR regexp_replace(coalesce(cnpj, ''), '\D', '', 'g') ILIKE '%' || regexp_replace(trim(_query), '\D', '', 'g') || '%'
    )
    AND (
      _account_type IS NULL
      OR _account_type = ''
      OR public.normalize_account_type(account_type) = public.normalize_account_type(_account_type)
    )
    AND (
      _status IS NULL
      OR _status = ''
      OR account_status = lower(_status)
    )
    AND (
      _plan IS NULL
      OR _plan = ''
      OR plano_marketplace = lower(_plan)
    )
  )
  SELECT
    filtered.user_id,
    filtered.email,
    filtered.nome,
    filtered.account_type,
    filtered.account_status,
    filtered.plano_marketplace,
    filtered.plano_marketplace_until,
    filtered.nome_empresa,
    filtered.cpf,
    filtered.cnpj,
    filtered.analyses_count,
    filtered.active_ads_count,
    filtered.is_admin,
    filtered.created_at,
    count(*) OVER () AS total_rows
  FROM filtered
  ORDER BY filtered.created_at DESC, filtered.user_id DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 50), 200))
  OFFSET GREATEST(COALESCE(_offset, 0), 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users(text, text, text, text, integer, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_user_account(
  _user_id uuid,
  _account_status text,
  _plan text,
  _plan_until timestamptz DEFAULT NULL,
  _reason text DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  saved public.profiles;
  v_status text := lower(trim(coalesce(_account_status, 'active')));
  v_plan text := lower(trim(coalesce(_plan, 'free')));
  effective_plan_until timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _user_id = auth.uid() AND v_status <> 'active' THEN
    RAISE EXCEPTION 'self_lockout_blocked';
  END IF;

  IF v_status NOT IN ('active', 'suspended', 'banned') THEN
    RAISE EXCEPTION 'invalid_account_status';
  END IF;

  IF v_plan NOT IN ('free', 'pro') THEN
    RAISE EXCEPTION 'invalid_plan';
  END IF;

  SELECT
    CASE
      WHEN v_plan = 'free' THEN NULL
      WHEN _plan_until IS NOT NULL THEN _plan_until
      WHEN p.plano_marketplace_until IS NOT NULL AND p.plano_marketplace_until > now() THEN p.plano_marketplace_until
      ELSE now() + interval '30 days'
    END
  INTO effective_plan_until
  FROM public.profiles p
  WHERE p.user_id = _user_id;

  UPDATE public.profiles
  SET
    account_status = v_status,
    plano_marketplace = v_plan,
    plano_marketplace_until = effective_plan_until,
    suspended_at = CASE WHEN v_status IN ('suspended', 'banned') THEN now() ELSE NULL END,
    suspended_by = CASE WHEN v_status IN ('suspended', 'banned') THEN auth.uid() ELSE NULL END,
    suspension_reason = CASE WHEN v_status IN ('suspended', 'banned') THEN NULLIF(trim(coalesce(_reason, '')), '') ELSE NULL END
  WHERE user_id = _user_id
  RETURNING * INTO saved;

  IF saved.user_id IS NULL THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  PERFORM public.admin_log_action(
    'user_account_updated',
    'user',
    _user_id::text,
    _reason,
    jsonb_build_object(
      'account_status', v_status,
      'plan', v_plan,
      'plan_until', effective_plan_until
    )
  );

  RETURN saved;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_user_account(uuid, text, text, timestamptz, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_prepare_password_reset(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  target_email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT lower(email)
  INTO target_email
  FROM auth.users
  WHERE id = _user_id;

  IF target_email IS NULL THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  PERFORM public.admin_log_action(
    'password_reset_requested',
    'user',
    _user_id::text,
    'Admin solicitou redefiniÃ§Ã£o de senha.',
    jsonb_build_object('email', target_email)
  );

  RETURN target_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_prepare_password_reset(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_review_store(
  _store_user_id uuid,
  _status text,
  _reason text DEFAULT NULL
)
RETURNS public.perfil_lojista
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  saved public.perfil_lojista;
  v_status text := lower(trim(coalesce(_status, 'pending')));
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_status NOT IN ('approved', 'rejected', 'pending') THEN
    RAISE EXCEPTION 'invalid_store_status';
  END IF;

  IF v_status = 'rejected' AND NULLIF(trim(coalesce(_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'rejection_reason_required';
  END IF;

  UPDATE public.perfil_lojista
  SET
    status = v_status,
    motivo_rejeicao = CASE WHEN v_status = 'rejected' THEN trim(_reason) ELSE NULL END,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    approved_by = CASE WHEN v_status = 'approved' THEN auth.uid() ELSE NULL END,
    approved_at = CASE WHEN v_status = 'approved' THEN now() ELSE NULL END
  WHERE user_id = _store_user_id
  RETURNING * INTO saved;

  IF saved.user_id IS NULL THEN
    RAISE EXCEPTION 'store_not_found';
  END IF;

  PERFORM public.admin_log_action(
    'store_status_updated',
    'store',
    _store_user_id::text,
    _reason,
    jsonb_build_object('status', v_status, 'nome_loja', saved.nome_loja)
  );

  RETURN saved;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_review_store(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_upsert_blog_post(
  _id bigint DEFAULT NULL,
  _slug text DEFAULT NULL,
  _titulo text DEFAULT NULL,
  _resumo text DEFAULT NULL,
  _conteudo text DEFAULT NULL,
  _categoria text DEFAULT NULL,
  _tipo text DEFAULT NULL,
  _autor text DEFAULT NULL,
  _tempo_leitura text DEFAULT NULL,
  _imagem text DEFAULT NULL,
  _destaque boolean DEFAULT false,
  _data text DEFAULT NULL
)
RETURNS public.blog_posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  saved public.blog_posts;
  v_slug text := lower(regexp_replace(trim(coalesce(_slug, '')), '\s+', '-', 'g'));
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF trim(coalesce(_titulo, '')) = '' OR trim(coalesce(_resumo, '')) = '' OR trim(coalesce(_conteudo, '')) = '' THEN
    RAISE EXCEPTION 'missing_blog_fields';
  END IF;

  IF v_slug = '' THEN
    RAISE EXCEPTION 'invalid_blog_slug';
  END IF;

  IF _id IS NULL THEN
    INSERT INTO public.blog_posts (
      slug,
      titulo,
      resumo,
      conteudo,
      categoria,
      tipo,
      autor,
      tempo_leitura,
      imagem,
      destaque,
    )
    VALUES (
      v_slug,
      trim(_titulo),
      trim(_resumo),
      trim(_conteudo),
      trim(coalesce(_categoria, 'Sem categoria')),
      trim(coalesce(_tipo, 'Artigo')),
      trim(coalesce(_autor, 'Equipe Obra Link')),
      trim(coalesce(_tempo_leitura, '5 min')),
      NULLIF(trim(coalesce(_imagem, '')), ''),
      coalesce(_destaque, false)
    )
    RETURNING * INTO saved;
  ELSE
    UPDATE public.blog_posts
    SET
      slug = v_slug,
      titulo = trim(_titulo),
      resumo = trim(_resumo),
      conteudo = trim(_conteudo),
      categoria = trim(coalesce(_categoria, 'Sem categoria')),
      tipo = trim(coalesce(_tipo, 'Artigo')),
      autor = trim(coalesce(_autor, 'Equipe Obra Link')),
      tempo_leitura = trim(coalesce(_tempo_leitura, '5 min')),
      imagem = NULLIF(trim(coalesce(_imagem, '')), ''),
      destaque = coalesce(_destaque, false)
    WHERE id = _id::integer
    RETURNING * INTO saved;
  END IF;

  IF saved.id IS NULL THEN
    RAISE EXCEPTION 'blog_post_not_found';
  END IF;

  PERFORM public.admin_log_action(
    CASE WHEN _id IS NULL THEN 'blog_post_created' ELSE 'blog_post_updated' END,
    'blog_post',
    saved.id::text,
    NULL,
    jsonb_build_object('slug', saved.slug, 'titulo', saved.titulo)
  );

  RETURN saved;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_upsert_blog_post(bigint, text, text, text, text, text, text, text, text, text, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_blog_post(_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_slug text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT slug
  INTO deleted_slug
  FROM public.blog_posts
  WHERE id = _id::integer;

  DELETE FROM public.blog_posts
  WHERE id = _id::integer;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  PERFORM public.admin_log_action(
    'blog_post_deleted',
    'blog_post',
    _id::text,
    NULL,
    jsonb_build_object('slug', deleted_slug)
  );

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_blog_post(bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_ai_runs(
  _query text DEFAULT NULL,
  _status text DEFAULT NULL,
  _limit integer DEFAULT 50,
  _offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  status text,
  stage text,
  error_message text,
  analysis_id uuid,
  document_id uuid,
  project_name text,
  owner_user_id uuid,
  owner_name text,
  owner_email text,
  payload_json jsonb,
  total_rows bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      r.id,
      r.created_at,
      r.updated_at,
      r.status,
      r.stage,
      r.error_message,
      r.analysis_id,
      r.document_id,
      a.nome_projeto AS project_name,
      a.user_id AS owner_user_id,
      COALESCE(NULLIF(trim(p.nome_completo), ''), NULLIF(trim(p.nome), ''), NULLIF(trim(p.nome_empresa), ''), 'Sem nome') AS owner_name,
      lower(coalesce(u.email, '')) AS owner_email,
      r.payload_json
    FROM public.analysis_extraction_runs r
    JOIN public.analyses a
      ON a.id = r.analysis_id
    LEFT JOIN public.profiles p
      ON p.user_id = a.user_id
    LEFT JOIN auth.users u
      ON u.id = a.user_id
  ),
  filtered AS (
    SELECT *
    FROM base
    WHERE (
      _query IS NULL
      OR trim(_query) = ''
      OR project_name ILIKE '%' || trim(_query) || '%'
      OR owner_name ILIKE '%' || trim(_query) || '%'
      OR owner_email ILIKE '%' || trim(_query) || '%'
      OR stage ILIKE '%' || trim(_query) || '%'
      OR status ILIKE '%' || trim(_query) || '%'
      OR id::text ILIKE '%' || trim(_query) || '%'
    )
    AND (
      _status IS NULL
      OR _status = ''
      OR status = lower(_status)
    )
  )
  SELECT
    filtered.id,
    filtered.created_at,
    filtered.updated_at,
    filtered.status,
    filtered.stage,
    filtered.error_message,
    filtered.analysis_id,
    filtered.document_id,
    filtered.project_name,
    filtered.owner_user_id,
    filtered.owner_name,
    filtered.owner_email,
    filtered.payload_json,
    count(*) OVER () AS total_rows
  FROM filtered
  ORDER BY filtered.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 50), 200))
  OFFSET GREATEST(COALESCE(_offset, 0), 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_ai_runs(text, text, integer, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_activity_feed(_limit integer DEFAULT 50)
RETURNS TABLE(
  id text,
  source text,
  action text,
  actor_label text,
  target_type text,
  target_id text,
  target_label text,
  details text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT *
  FROM (
    SELECT
      l.id::text AS id,
      'admin'::text AS source,
      l.action,
      COALESCE(NULLIF(trim(p.nome_completo), ''), NULLIF(trim(p.nome), ''), lower(u.email), 'Admin') AS actor_label,
      l.target_type,
      l.target_id,
      COALESCE(
        CASE WHEN l.target_type = 'store' THEN ps.nome_loja END,
        CASE WHEN l.target_type = 'blog_post' THEN bp.titulo END,
        CASE WHEN l.target_type = 'user' THEN COALESCE(NULLIF(trim(tp.nome_completo), ''), NULLIF(trim(tp.nome), ''), lower(tu.email)) END,
        CASE WHEN l.target_type = 'report' THEN mr.reason END,
        l.target_id
      ) AS target_label,
      COALESCE(NULLIF(trim(l.reason), ''), NULLIF(trim((l.metadata->>'status')), ''), NULLIF(trim((l.metadata->>'slug')), '')) AS details,
      l.created_at
    FROM public.admin_action_log l
    LEFT JOIN auth.users u
      ON u.id = l.actor_id
    LEFT JOIN public.profiles p
      ON p.user_id = l.actor_id
    LEFT JOIN public.perfil_lojista ps
      ON l.target_type = 'store'
     AND ps.user_id::text = l.target_id
    LEFT JOIN public.blog_posts bp
      ON l.target_type = 'blog_post'
     AND bp.id::text = l.target_id
    LEFT JOIN auth.users tu
      ON l.target_type = 'user'
     AND tu.id::text = l.target_id
    LEFT JOIN public.profiles tp
      ON l.target_type = 'user'
     AND tp.user_id::text = l.target_id
    LEFT JOIN public.marketplace_reports mr
      ON l.target_type = 'report'
     AND mr.id::text = l.target_id

    UNION ALL

    SELECT
      f.id::text AS id,
      f.source,
      f.action,
      COALESCE(NULLIF(trim(fp.nome_completo), ''), NULLIF(trim(fp.nome), ''), lower(fu.email), initcap(f.source)) AS actor_label,
      f.target_type,
      f.target_id::text,
      COALESCE(prod.nome_produto, loja.nome_loja, f.target_id::text) AS target_label,
      COALESCE(NULLIF(trim(f.justificativa), ''), 'Sem justificativa adicional') AS details,
      f.created_at
    FROM public.featured_audit_log f
    LEFT JOIN auth.users fu
      ON fu.id = f.actor_id
    LEFT JOIN public.profiles fp
      ON fp.user_id = f.actor_id
    LEFT JOIN public.produtos_loja prod
      ON f.target_type = 'produto'
     AND prod.id = f.target_id
    LEFT JOIN public.perfil_lojista loja
      ON f.target_type = 'loja'
     AND loja.user_id = f.target_id
  ) feed
  ORDER BY feed.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 50), 200));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_activity_feed(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_marketplace_reports(
  _status text DEFAULT NULL,
  _limit integer DEFAULT 50,
  _offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  created_at timestamptz,
  status text,
  reason text,
  details text,
  decision_reason text,
  target_type text,
  target_id uuid,
  reporter_id uuid,
  reporter_name text,
  reporter_email text,
  target_name text,
  target_owner_id uuid,
  target_owner_name text,
  target_hidden boolean,
  total_rows bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      r.id,
      r.created_at,
      r.status,
      r.reason,
      r.details,
      r.decision_reason,
      r.target_type,
      r.target_id,
      r.reporter_id,
      COALESCE(NULLIF(trim(rp.nome_completo), ''), NULLIF(trim(rp.nome), ''), lower(ru.email), 'UsuÃ¡rio') AS reporter_name,
      lower(coalesce(ru.email, '')) AS reporter_email,
      CASE
        WHEN r.target_type = 'produto' THEN prod.nome_produto
        ELSE loja.nome_loja
      END AS target_name,
      CASE
        WHEN r.target_type = 'produto' THEN prod.user_id
        ELSE loja.user_id
      END AS target_owner_id,
      CASE
        WHEN r.target_type = 'produto' THEN COALESCE(NULLIF(trim(op.nome_completo), ''), NULLIF(trim(op.nome), ''), NULLIF(trim(op.nome_empresa), ''), 'Sem nome')
        ELSE COALESCE(loja.nome_loja, 'Loja')
      END AS target_owner_name,
      CASE
        WHEN r.target_type = 'produto' THEN COALESCE(prod.admin_hidden, false)
        ELSE COALESCE(loja.admin_hidden, false)
      END AS target_hidden
    FROM public.marketplace_reports r
    LEFT JOIN auth.users ru
      ON ru.id = r.reporter_id
    LEFT JOIN public.profiles rp
      ON rp.user_id = r.reporter_id
    LEFT JOIN public.produtos_loja prod
      ON r.target_type = 'produto'
     AND prod.id = r.target_id
    LEFT JOIN public.profiles op
      ON prod.user_id = op.user_id
    LEFT JOIN public.perfil_lojista loja
      ON r.target_type = 'loja'
     AND loja.user_id = r.target_id
  ),
  filtered AS (
    SELECT *
    FROM base
    WHERE (
      _status IS NULL
      OR _status = ''
      OR status = lower(_status)
    )
  )
  SELECT
    filtered.id,
    filtered.created_at,
    filtered.status,
    filtered.reason,
    filtered.details,
    filtered.decision_reason,
    filtered.target_type,
    filtered.target_id,
    filtered.reporter_id,
    filtered.reporter_name,
    filtered.reporter_email,
    filtered.target_name,
    filtered.target_owner_id,
    filtered.target_owner_name,
    filtered.target_hidden,
    count(*) OVER () AS total_rows
  FROM filtered
  ORDER BY filtered.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 50), 200))
  OFFSET GREATEST(COALESCE(_offset, 0), 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_marketplace_reports(text, integer, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_moderate_marketplace_report(
  _report_id uuid,
  _status text,
  _decision_reason text DEFAULT NULL,
  _set_hidden boolean DEFAULT NULL
)
RETURNS public.marketplace_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  saved public.marketplace_reports;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF lower(trim(coalesce(_status, ''))) NOT IN ('reviewing', 'resolved', 'dismissed') THEN
    RAISE EXCEPTION 'invalid_report_status';
  END IF;

  UPDATE public.marketplace_reports
  SET
    status = lower(trim(_status)),
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    decision_reason = NULLIF(trim(coalesce(_decision_reason, '')), '')
  WHERE id = _report_id
  RETURNING * INTO saved;

  IF saved.id IS NULL THEN
    RAISE EXCEPTION 'report_not_found';
  END IF;

  IF _set_hidden IS NOT NULL THEN
    IF saved.target_type = 'produto' THEN
      UPDATE public.produtos_loja
      SET admin_hidden = _set_hidden
      WHERE id = saved.target_id;
    ELSIF saved.target_type = 'loja' THEN
      UPDATE public.perfil_lojista
      SET admin_hidden = _set_hidden
      WHERE user_id = saved.target_id;
    END IF;

    PERFORM public.admin_log_action(
      'marketplace_visibility_changed',
      saved.target_type,
      saved.target_id::text,
      _decision_reason,
      jsonb_build_object('hidden', _set_hidden, 'report_id', saved.id)
    );
  END IF;

  PERFORM public.admin_log_action(
    'marketplace_report_moderated',
    'report',
    saved.id::text,
    _decision_reason,
    jsonb_build_object(
      'status', saved.status,
      'target_type', saved.target_type,
      'target_id', saved.target_id,
      'set_hidden', _set_hidden
    )
  );

  RETURN saved;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_moderate_marketplace_report(uuid, text, text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_public_marketplace_products()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  nome_produto text,
  categoria text,
  preco numeric,
  unidade_medida text,
  foto_url text,
  created_at timestamptz,
  is_featured boolean,
  featured_until timestamptz,
  loja_nome text,
  loja_whatsapp text,
  loja_cidade text,
  loja_estado text,
  loja_is_premium boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.id,
    p.user_id,
    p.nome_produto,
    p.categoria,
    p.preco,
    p.unidade_medida,
    p.foto_url,
    p.created_at,
    p.is_featured,
    p.featured_until,
    l.nome_loja,
    l.whatsapp,
    l.cidade,
    l.estado,
    l.is_premium
  FROM public.produtos_loja p
  JOIN public.perfil_lojista l
    ON l.user_id = p.user_id
  WHERE p.status = 'ativo'
    AND p.admin_hidden = false
    AND l.status = 'approved'
    AND l.admin_hidden = false
  ORDER BY p.is_featured DESC, p.created_at DESC, p.id ASC;
$$;

CREATE OR REPLACE FUNCTION public.list_public_store_directory()
RETURNS TABLE(
  user_id uuid,
  nome_loja text,
  logo_url text,
  descricao text,
  categoria text,
  cidade text,
  estado text,
  is_premium boolean,
  featured_until timestamptz,
  total_produtos integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    l.user_id,
    l.nome_loja,
    l.logo_url,
    l.descricao,
    l.categoria,
    l.cidade,
    l.estado,
    l.is_premium,
    l.featured_until,
    COALESCE(count(p.id), 0)::int AS total_produtos
  FROM public.perfil_lojista l
  LEFT JOIN public.produtos_loja p
    ON p.user_id = l.user_id
   AND p.status = 'ativo'
   AND p.admin_hidden = false
  WHERE l.status = 'approved'
    AND l.admin_hidden = false
  GROUP BY
    l.user_id,
    l.nome_loja,
    l.logo_url,
    l.descricao,
    l.categoria,
    l.cidade,
    l.estado,
    l.is_premium,
    l.featured_until
  ORDER BY l.is_premium DESC, l.nome_loja ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_public_storefront(_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  nome_loja text,
  descricao text,
  categoria text,
  cidade text,
  estado text,
  whatsapp text,
  instagram text,
  horario_atendimento text,
  logo_url text,
  banner_url text,
  is_premium boolean,
  featured_until timestamptz,
  total_produtos integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    l.user_id,
    l.nome_loja,
    l.descricao,
    l.categoria,
    l.cidade,
    l.estado,
    l.whatsapp,
    l.instagram,
    l.horario_atendimento,
    l.logo_url,
    l.banner_url,
    l.is_premium,
    l.featured_until,
    COALESCE((
      SELECT count(*)::int
      FROM public.produtos_loja p
      WHERE p.user_id = l.user_id
        AND p.status = 'ativo'
        AND p.admin_hidden = false
    ), 0)
  FROM public.perfil_lojista l
  WHERE l.user_id = _user_id
    AND l.status = 'approved'
    AND l.admin_hidden = false
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.list_public_store_products(_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  nome_produto text,
  categoria text,
  preco numeric,
  unidade_medida text,
  foto_url text,
  created_at timestamptz,
  is_featured boolean,
  featured_until timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.id,
    p.user_id,
    p.nome_produto,
    p.categoria,
    p.preco,
    p.unidade_medida,
    p.foto_url,
    p.created_at,
    p.is_featured,
    p.featured_until
  FROM public.produtos_loja p
  JOIN public.perfil_lojista l
    ON l.user_id = p.user_id
  WHERE p.user_id = _user_id
    AND p.status = 'ativo'
    AND p.admin_hidden = false
    AND l.status = 'approved'
    AND l.admin_hidden = false
  ORDER BY p.is_featured DESC, p.created_at DESC, p.id ASC;
$$;

CREATE OR REPLACE FUNCTION public.list_public_seller_products(_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  nome_produto text,
  categoria text,
  preco numeric,
  unidade_medida text,
  foto_url text,
  created_at timestamptz,
  is_featured boolean,
  featured_until timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.id,
    p.user_id,
    p.nome_produto,
    p.categoria,
    p.preco,
    p.unidade_medida,
    p.foto_url,
    p.created_at,
    p.is_featured,
    p.featured_until
  FROM public.produtos_loja p
  JOIN public.profiles pr
    ON pr.user_id = p.user_id
  WHERE p.user_id = _user_id
    AND p.status = 'ativo'
    AND p.admin_hidden = false
    AND public.normalize_account_type(pr.account_type) = 'PF'
  ORDER BY p.is_featured DESC, p.created_at DESC, p.id ASC;
$$;
