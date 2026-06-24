CREATE TABLE IF NOT EXISTS public.auth_rate_limit_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL CHECK (action IN ('login', 'password_reset')),
  identifier_hash text NOT NULL,
  ip_hash text NOT NULL,
  succeeded boolean NOT NULL DEFAULT false,
  user_agent text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.auth_rate_limit_attempts TO authenticated;
GRANT ALL ON public.auth_rate_limit_attempts TO service_role;

ALTER TABLE public.auth_rate_limit_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read auth rate attempts" ON public.auth_rate_limit_attempts;
CREATE POLICY "Admins read auth rate attempts"
  ON public.auth_rate_limit_attempts
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_auth_rate_limit_attempts_identifier
  ON public.auth_rate_limit_attempts (action, identifier_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_rate_limit_attempts_ip
  ON public.auth_rate_limit_attempts (action, ip_hash, created_at DESC);

CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  actor_user_id uuid NULL,
  identifier_hash text NULL,
  ip_hash text NULL,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read security events" ON public.security_events;
CREATE POLICY "Admins read security events"
  ON public.security_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_security_events_created_at
  ON public.security_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_type
  ON public.security_events (event_type, severity, created_at DESC);

CREATE TABLE IF NOT EXISTS public.app_error_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  function_name text NOT NULL,
  severity text NOT NULL DEFAULT 'error' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  error_code text NULL,
  message text NOT NULL,
  request_path text NULL,
  request_method text NULL,
  actor_user_id uuid NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_error_events TO authenticated;
GRANT ALL ON public.app_error_events TO service_role;

ALTER TABLE public.app_error_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read app error events" ON public.app_error_events;
CREATE POLICY "Admins read app error events"
  ON public.app_error_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_app_error_events_created_at
  ON public.app_error_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_error_events_source
  ON public.app_error_events (function_name, severity, created_at DESC);

DROP POLICY IF EXISTS "Authenticated users can upload diary photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload diary photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'diary-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own diary photos" ON storage.objects;
CREATE POLICY "Users can delete own diary photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'diary-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update own diary photos" ON storage.objects;
CREATE POLICY "Users can update own diary photos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'diary-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
CREATE POLICY "Avatars are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
CREATE POLICY "Users can upload their own avatars"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
CREATE POLICY "Users can update their own avatars"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
CREATE POLICY "Users can delete their own avatars"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

INSERT INTO storage.buckets (id, name, public)
VALUES ('plant-uploads', 'plant-uploads', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Plant uploads are publicly accessible" ON storage.objects;
CREATE POLICY "Plant uploads are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'plant-uploads');

DROP POLICY IF EXISTS "Users can upload their own plant uploads" ON storage.objects;
CREATE POLICY "Users can upload their own plant uploads"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'plant-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their own plant uploads" ON storage.objects;
CREATE POLICY "Users can update their own plant uploads"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'plant-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own plant uploads" ON storage.objects;
CREATE POLICY "Users can delete their own plant uploads"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'plant-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE OR REPLACE FUNCTION public.admin_list_security_events(
  _query text DEFAULT NULL,
  _limit integer DEFAULT 50,
  _offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  source text,
  event_type text,
  severity text,
  actor_user_id uuid,
  identifier_hash text,
  ip_hash text,
  message text,
  metadata jsonb,
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
  WITH filtered AS (
    SELECT *
    FROM public.security_events
    WHERE (
      _query IS NULL
      OR trim(_query) = ''
      OR source ILIKE '%' || trim(_query) || '%'
      OR event_type ILIKE '%' || trim(_query) || '%'
      OR severity ILIKE '%' || trim(_query) || '%'
      OR message ILIKE '%' || trim(_query) || '%'
    )
  )
  SELECT
    filtered.id,
    filtered.source,
    filtered.event_type,
    filtered.severity,
    filtered.actor_user_id,
    filtered.identifier_hash,
    filtered.ip_hash,
    filtered.message,
    filtered.metadata,
    filtered.created_at,
    count(*) OVER () AS total_rows
  FROM filtered
  ORDER BY filtered.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 50), 200))
  OFFSET GREATEST(COALESCE(_offset, 0), 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_security_events(text, integer, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_app_error_events(
  _query text DEFAULT NULL,
  _limit integer DEFAULT 50,
  _offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  source text,
  function_name text,
  severity text,
  error_code text,
  message text,
  request_path text,
  request_method text,
  actor_user_id uuid,
  metadata jsonb,
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
  WITH filtered AS (
    SELECT *
    FROM public.app_error_events
    WHERE (
      _query IS NULL
      OR trim(_query) = ''
      OR source ILIKE '%' || trim(_query) || '%'
      OR function_name ILIKE '%' || trim(_query) || '%'
      OR severity ILIKE '%' || trim(_query) || '%'
      OR COALESCE(error_code, '') ILIKE '%' || trim(_query) || '%'
      OR message ILIKE '%' || trim(_query) || '%'
      OR COALESCE(request_path, '') ILIKE '%' || trim(_query) || '%'
    )
  )
  SELECT
    filtered.id,
    filtered.source,
    filtered.function_name,
    filtered.severity,
    filtered.error_code,
    filtered.message,
    filtered.request_path,
    filtered.request_method,
    filtered.actor_user_id,
    filtered.metadata,
    filtered.created_at,
    count(*) OVER () AS total_rows
  FROM filtered
  ORDER BY filtered.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 50), 200))
  OFFSET GREATEST(COALESCE(_offset, 0), 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_app_error_events(text, integer, integer) TO authenticated;
