
CREATE TABLE public.project_schedule (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id uuid REFERENCES public.analyses(id) ON DELETE CASCADE NOT NULL,
  task_name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  duration_days integer NOT NULL DEFAULT 10,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own schedule tasks"
ON public.project_schedule FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.analyses a WHERE a.id = project_schedule.analysis_id AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own schedule tasks"
ON public.project_schedule FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.analyses a WHERE a.id = project_schedule.analysis_id AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own schedule tasks"
ON public.project_schedule FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.analyses a WHERE a.id = project_schedule.analysis_id AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own schedule tasks"
ON public.project_schedule FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.analyses a WHERE a.id = project_schedule.analysis_id AND a.user_id = auth.uid()
  )
);
