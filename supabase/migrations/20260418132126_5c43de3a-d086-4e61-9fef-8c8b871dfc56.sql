CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.clash_conflicts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  conflict_type TEXT NOT NULL DEFAULT 'diario_vs_orcamento',
  severity TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  recommendation TEXT,
  related_stage TEXT,
  related_item TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clash_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own clashes" ON public.clash_conflicts
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users insert own clashes" ON public.clash_conflicts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own clashes" ON public.clash_conflicts
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users delete own clashes" ON public.clash_conflicts
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Service inserts clashes" ON public.clash_conflicts
  FOR INSERT TO service_role WITH CHECK (true);

CREATE INDEX idx_clash_analysis ON public.clash_conflicts(analysis_id, status);

CREATE TRIGGER update_clash_conflicts_updated_at
  BEFORE UPDATE ON public.clash_conflicts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();