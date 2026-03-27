
-- Tabela de Referência SINAPI (Preços Reais)
CREATE TABLE public.referencia_sinapi (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo text UNIQUE NOT NULL,
  descricao text NOT NULL,
  unidade text,
  preco_material numeric(15,2),
  preco_mao_de_obra numeric(15,2),
  regiao text,
  mes_ano text,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS para referencia_sinapi (leitura pública para autenticados, escrita para admins futuramente)
ALTER TABLE public.referencia_sinapi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read SINAPI references"
  ON public.referencia_sinapi
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert SINAPI references"
  ON public.referencia_sinapi
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update SINAPI references"
  ON public.referencia_sinapi
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete SINAPI references"
  ON public.referencia_sinapi
  FOR DELETE
  TO authenticated
  USING (true);

-- Adicionar total_estimado à tabela analyses
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS total_estimado numeric(15,2);

-- Adicionar bdi_percentual à tabela analyses
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS bdi_percentual numeric(5,2) DEFAULT 25;

-- Índice para busca por similaridade de texto na descrição SINAPI
CREATE INDEX IF NOT EXISTS idx_referencia_sinapi_descricao ON public.referencia_sinapi USING gin(to_tsvector('portuguese', descricao));
