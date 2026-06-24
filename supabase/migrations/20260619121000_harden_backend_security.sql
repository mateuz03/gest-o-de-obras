CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.only_digits(_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(regexp_replace(COALESCE(_value, ''), '\D', '', 'g'), '');
$$;

CREATE OR REPLACE FUNCTION public.is_valid_cpf(_cpf text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits text := public.only_digits(_cpf);
  sum_val integer;
  rem_val integer;
  i integer;
BEGIN
  IF digits IS NULL OR length(digits) <> 11 OR digits ~ '^(\d)\1{10}$' THEN
    RETURN false;
  END IF;

  sum_val := 0;
  FOR i IN 1..9 LOOP
    sum_val := sum_val + CAST(substr(digits, i, 1) AS integer) * (11 - i);
  END LOOP;
  rem_val := (sum_val * 10) % 11;
  IF rem_val = 10 THEN rem_val := 0; END IF;
  IF rem_val <> CAST(substr(digits, 10, 1) AS integer) THEN
    RETURN false;
  END IF;

  sum_val := 0;
  FOR i IN 1..10 LOOP
    sum_val := sum_val + CAST(substr(digits, i, 1) AS integer) * (12 - i);
  END LOOP;
  rem_val := (sum_val * 10) % 11;
  IF rem_val = 10 THEN rem_val := 0; END IF;

  RETURN rem_val = CAST(substr(digits, 11, 1) AS integer);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_valid_cnpj(_cnpj text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits text := public.only_digits(_cnpj);
  weights_1 integer[] := ARRAY[5,4,3,2,9,8,7,6,5,4,3,2];
  weights_2 integer[] := ARRAY[6,5,4,3,2,9,8,7,6,5,4,3,2];
  sum_val integer;
  rem_val integer;
  i integer;
BEGIN
  IF digits IS NULL OR length(digits) <> 14 OR digits ~ '^(\d)\1{13}$' THEN
    RETURN false;
  END IF;

  sum_val := 0;
  FOR i IN 1..12 LOOP
    sum_val := sum_val + CAST(substr(digits, i, 1) AS integer) * weights_1[i];
  END LOOP;
  rem_val := sum_val % 11;
  rem_val := CASE WHEN rem_val < 2 THEN 0 ELSE 11 - rem_val END;
  IF rem_val <> CAST(substr(digits, 13, 1) AS integer) THEN
    RETURN false;
  END IF;

  sum_val := 0;
  FOR i IN 1..13 LOOP
    sum_val := sum_val + CAST(substr(digits, i, 1) AS integer) * weights_2[i];
  END LOOP;
  rem_val := sum_val % 11;
  rem_val := CASE WHEN rem_val < 2 THEN 0 ELSE 11 - rem_val END;

  RETURN rem_val = CAST(substr(digits, 14, 1) AS integer);
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_account_type(_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN upper(trim(COALESCE(_value, ''))) IN ('PF', 'CPF') THEN 'PF'
    WHEN upper(trim(COALESCE(_value, ''))) IN ('PJ', 'CNPJ') THEN 'PJ'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_profile_identity_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_type text := public.normalize_account_type(OLD.account_type);
  new_type text := public.normalize_account_type(NEW.account_type);
  old_cpf text := public.only_digits(OLD.cpf);
  new_cpf text := public.only_digits(NEW.cpf);
  old_cnpj text := public.only_digits(OLD.cnpj);
  new_cnpj text := public.only_digits(NEW.cnpj);
  old_is_defined boolean := old_type IS NOT NULL OR old_cpf IS NOT NULL OR old_cnpj IS NOT NULL;
BEGIN
  NEW.account_type := new_type;

  IF TG_OP = 'UPDATE' AND auth.uid() = OLD.user_id AND old_is_defined AND (
    new_type IS DISTINCT FROM old_type OR
    new_cpf IS DISTINCT FROM old_cpf OR
    new_cnpj IS DISTINCT FROM old_cnpj
  ) THEN
    RAISE EXCEPTION 'identity_fields_are_immutable';
  END IF;

  IF new_type = 'PF' THEN
    IF new_cpf IS NULL OR NOT public.is_valid_cpf(new_cpf) THEN
      RAISE EXCEPTION 'cpf_invalido';
    END IF;
    NEW.cnpj := NULL;
  ELSIF new_type = 'PJ' THEN
    IF new_cnpj IS NULL OR NOT public.is_valid_cnpj(new_cnpj) THEN
      RAISE EXCEPTION 'cnpj_invalido';
    END IF;
    NEW.cpf := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_identity_integrity ON public.profiles;
CREATE TRIGGER trg_profiles_identity_integrity
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_identity_integrity();

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_cpf_digits_unique
  ON public.profiles ((public.only_digits(cpf)))
  WHERE public.only_digits(cpf) IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_cnpj_digits_unique
  ON public.profiles ((public.only_digits(cnpj)))
  WHERE public.only_digits(cnpj) IS NOT NULL;

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.analysis_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  revoked_at timestamptz,
  last_accessed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analysis_shares_analysis_id
  ON public.analysis_shares (analysis_id, expires_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.analysis_shares TO authenticated;
GRANT ALL ON public.analysis_shares TO service_role;

ALTER TABLE public.analysis_shares ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'analysis_shares'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.analysis_shares', p.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "Owners manage own analysis shares"
ON public.analysis_shares
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.analyses a
    WHERE a.id = analysis_id
      AND (a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.analyses a
    WHERE a.id = analysis_id
      AND (a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE OR REPLACE FUNCTION public.create_analysis_share(
  _analysis_id uuid,
  _expires_hours integer DEFAULT 168
)
RETURNS TABLE(share_token text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token text;
  expiry timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.analyses
    WHERE id = _analysis_id
      AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.analysis_shares
    SET revoked_at = now()
    WHERE analysis_id = _analysis_id
      AND revoked_at IS NULL;

  token := encode(gen_random_bytes(24), 'hex');
  expiry := now() + make_interval(hours => GREATEST(1, LEAST(COALESCE(_expires_hours, 168), 24 * 30)));

  INSERT INTO public.analysis_shares (analysis_id, created_by, token_hash, expires_at)
  VALUES (_analysis_id, auth.uid(), encode(digest(token, 'sha256'), 'hex'), expiry);

  RETURN QUERY SELECT token, expiry;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_shared_analysis(
  _analysis_id uuid,
  _token text
)
RETURNS TABLE(
  id uuid,
  nome_projeto text,
  resultado_json jsonb,
  bdi_percentual numeric,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hashed_token text;
BEGIN
  IF _token IS NULL OR length(trim(_token)) < 16 THEN
    RETURN;
  END IF;

  hashed_token := encode(digest(_token, 'sha256'), 'hex');

  UPDATE public.analysis_shares
    SET last_accessed_at = now()
    WHERE analysis_id = _analysis_id
      AND token_hash = hashed_token
      AND revoked_at IS NULL
      AND expires_at > now();

  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT a.id, a.nome_projeto, a.resultado_json, a.bdi_percentual, a.status
  FROM public.analyses a
  WHERE a.id = _analysis_id
    AND a.status = 'completed'
    AND a.resultado_json IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_analysis_share(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_analysis(uuid, text) TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view shared analyses by ID" ON public.analyses;
DROP POLICY IF EXISTS "Anon can read diario for shared analyses" ON public.diario_obra;

CREATE OR REPLACE FUNCTION public.get_marketplace_base_limit(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.normalize_account_type(account_type) = 'PJ' THEN 50
    ELSE 10
  END
  FROM public.profiles
  WHERE user_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.can_user_publish(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  limit_count integer := 10;
  active_count integer := 0;
  is_pro boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF _user_id IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT
    COALESCE(public.get_marketplace_base_limit(_user_id), 10),
    COALESCE(
      plano_marketplace = 'pro'
      AND (plano_marketplace_until IS NULL OR plano_marketplace_until > now()),
      false
    )
  INTO limit_count, is_pro
  FROM public.profiles
  WHERE user_id = _user_id;

  SELECT count(*)::int
  INTO active_count
  FROM public.produtos_loja
  WHERE user_id = _user_id
    AND status = 'ativo';

  RETURN is_pro OR active_count < limit_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_publish_status(_user_id uuid)
RETURNS TABLE(active_count integer, free_limit integer, is_pro boolean, can_publish boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF _user_id IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*)::int FROM public.produtos_loja WHERE user_id = _user_id AND status = 'ativo'),
    COALESCE(public.get_marketplace_base_limit(_user_id), 10),
    COALESCE(
      (
        SELECT plano_marketplace = 'pro'
          AND (plano_marketplace_until IS NULL OR plano_marketplace_until > now())
        FROM public.profiles
        WHERE user_id = _user_id
      ),
      false
    ),
    public.can_user_publish(_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_marketplace_publish_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  limit_count integer := 10;
  is_pro boolean := false;
  active_count integer := 0;
BEGIN
  IF NEW.status IS DISTINCT FROM 'ativo' THEN
    RETURN NEW;
  END IF;

  SELECT
    COALESCE(public.get_marketplace_base_limit(NEW.user_id), 10),
    COALESCE(
      plano_marketplace = 'pro'
      AND (plano_marketplace_until IS NULL OR plano_marketplace_until > now()),
      false
    )
  INTO limit_count, is_pro
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  IF is_pro THEN
    RETURN NEW;
  END IF;

  SELECT count(*)::int
  INTO active_count
  FROM public.produtos_loja
  WHERE user_id = NEW.user_id
    AND status = 'ativo'
    AND id IS DISTINCT FROM COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF active_count >= limit_count THEN
    RAISE EXCEPTION 'publish_limit_exceeded';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_produtos_loja_publish_limit ON public.produtos_loja;
CREATE TRIGGER trg_produtos_loja_publish_limit
  BEFORE INSERT OR UPDATE OF status, user_id ON public.produtos_loja
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_marketplace_publish_limit();

CREATE OR REPLACE FUNCTION public.upsert_marketplace_product(
  _id uuid DEFAULT NULL,
  _nome_produto text DEFAULT NULL,
  _categoria text DEFAULT NULL,
  _preco numeric DEFAULT NULL,
  _unidade_medida text DEFAULT NULL,
  _foto_url text DEFAULT NULL
)
RETURNS public.produtos_loja
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  saved public.produtos_loja;
  v_nome text := LEFT(trim(COALESCE(_nome_produto, '')), 160);
  v_categoria text := LEFT(trim(COALESCE(_categoria, '')), 120);
  v_unidade text := LEFT(trim(COALESCE(_unidade_medida, '')), 30);
  v_foto text := NULLIF(LEFT(trim(COALESCE(_foto_url, '')), 500), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF length(v_nome) < 3 THEN
    RAISE EXCEPTION 'nome_produto_invalido';
  END IF;
  IF v_categoria = '' THEN
    RAISE EXCEPTION 'categoria_invalida';
  END IF;
  IF v_unidade = '' THEN
    RAISE EXCEPTION 'unidade_invalida';
  END IF;
  IF COALESCE(_preco, 0) <= 0 THEN
    RAISE EXCEPTION 'preco_invalido';
  END IF;

  IF _id IS NULL THEN
    INSERT INTO public.produtos_loja (
      user_id,
      nome_produto,
      categoria,
      preco,
      unidade_medida,
      foto_url,
      status
    )
    VALUES (
      auth.uid(),
      v_nome,
      v_categoria,
      _preco,
      v_unidade,
      v_foto,
      'ativo'
    )
    RETURNING * INTO saved;
  ELSE
    UPDATE public.produtos_loja
      SET nome_produto = v_nome,
          categoria = v_categoria,
          preco = _preco,
          unidade_medida = v_unidade,
          foto_url = v_foto
      WHERE id = _id
        AND user_id = auth.uid()
      RETURNING * INTO saved;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'produto_nao_encontrado';
    END IF;
  END IF;

  RETURN saved;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_marketplace_product(_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  DELETE FROM public.produtos_loja
  WHERE id = _id
    AND user_id = auth.uid();

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_marketplace_product(uuid, text, text, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_marketplace_product(uuid) TO authenticated;

ALTER TABLE public.perfil_lojista ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos_loja ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'perfil_lojista'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.perfil_lojista', p.policyname);
  END LOOP;

  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'produtos_loja'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.produtos_loja', p.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "Owners view own store profile"
ON public.perfil_lojista
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update any store profile"
ON public.perfil_lojista
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners view own marketplace products"
ON public.produtos_loja
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

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
SET search_path = public
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
    AND l.status = 'approved'
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
SET search_path = public
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
  WHERE l.status = 'approved'
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
SET search_path = public
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
    ), 0)
  FROM public.perfil_lojista l
  WHERE l.user_id = _user_id
    AND l.status = 'approved'
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
SET search_path = public
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
    AND l.status = 'approved'
  ORDER BY p.is_featured DESC, p.created_at DESC, p.id ASC;
$$;

GRANT EXECUTE ON FUNCTION public.list_public_marketplace_products() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_store_directory() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_storefront(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_store_products(uuid) TO anon, authenticated;

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'referencia_sinapi'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.referencia_sinapi', p.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "Authenticated users can read SINAPI references"
  ON public.referencia_sinapi
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage SINAPI references"
  ON public.referencia_sinapi
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Qualquer um registra eventos" ON public.marketplace_events;
DROP POLICY IF EXISTS "Admin le eventos" ON public.marketplace_events;

CREATE POLICY "Marketplace events insert safe"
  ON public.marketplace_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    event_type IN ('feature_click', 'feature_conversion', 'item_impression', 'item_click')
    AND (target_type IS NULL OR target_type IN ('produto', 'loja', 'plano'))
    AND length(COALESCE(metadata::text, '{}')) <= 2000
  );

CREATE POLICY "Admin le eventos"
  ON public.marketplace_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
