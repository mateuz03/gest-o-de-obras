-- Add type and source file columns to referencia_sinapi
ALTER TABLE public.referencia_sinapi
  ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'insumo',
  ADD COLUMN IF NOT EXISTS fonte_arquivo TEXT;

CREATE INDEX IF NOT EXISTS idx_referencia_sinapi_tipo ON public.referencia_sinapi(tipo);
CREATE INDEX IF NOT EXISTS idx_referencia_sinapi_regiao ON public.referencia_sinapi(regiao);

-- Create upload history table
CREATE TABLE IF NOT EXISTS public.sinapi_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome_arquivo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'insumo',
  regiao TEXT,
  mes_ano TEXT,
  qtd_itens INTEGER NOT NULL DEFAULT 0,
  qtd_paginas INTEGER,
  status TEXT NOT NULL DEFAULT 'concluido',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sinapi_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sinapi uploads"
  ON public.sinapi_uploads FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own sinapi uploads"
  ON public.sinapi_uploads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own sinapi uploads"
  ON public.sinapi_uploads FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_sinapi_uploads_user ON public.sinapi_uploads(user_id, created_at DESC);