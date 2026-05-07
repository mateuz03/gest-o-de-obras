CREATE TABLE public.project_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_chats_project ON public.project_chats(project_id, created_at);

ALTER TABLE public.project_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own project chats"
ON public.project_chats FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users insert own project chats"
ON public.project_chats FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own project chats"
ON public.project_chats FOR DELETE TO authenticated
USING (user_id = auth.uid());