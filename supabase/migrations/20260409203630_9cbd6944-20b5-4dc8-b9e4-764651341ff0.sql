
-- Alert history table
CREATE TABLE public.alertas_preditivos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  probability integer NOT NULL DEFAULT 0,
  severity text NOT NULL DEFAULT 'low',
  summary text,
  reason text,
  suggested_new_date date,
  mitigation text,
  current_task text,
  fornecedor text,
  stagnation_days integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.alertas_preditivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts" ON public.alertas_preditivos FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own alerts" ON public.alertas_preditivos FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own alerts" ON public.alertas_preditivos FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_alertas_preditivos_analysis ON public.alertas_preditivos(analysis_id, created_at DESC);

-- Service role insert policy (for edge function)
CREATE POLICY "Service can insert alerts" ON public.alertas_preditivos FOR INSERT TO service_role WITH CHECK (true);

-- Diary photos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('diary-photos', 'diary-photos', true);

CREATE POLICY "Anyone can view diary photos" ON storage.objects FOR SELECT USING (bucket_id = 'diary-photos');
CREATE POLICY "Authenticated users can upload diary photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'diary-photos');
CREATE POLICY "Users can delete own diary photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'diary-photos');
