CREATE TABLE public.sinapi_parse_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome_arquivo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'insumo',
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  total_pages INTEGER,
  processed_pages INTEGER NOT NULL DEFAULT 0,
  total_chunks INTEGER,
  processed_chunks INTEGER NOT NULL DEFAULT 0,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sinapi_parse_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own parse jobs"
ON public.sinapi_parse_jobs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users create own parse jobs"
ON public.sinapi_parse_jobs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own parse jobs"
ON public.sinapi_parse_jobs FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_sinapi_parse_jobs_user_status ON public.sinapi_parse_jobs(user_id, status, created_at DESC);