ALTER TABLE public.project_chats
  ADD COLUMN IF NOT EXISTS proposal JSONB,
  ADD COLUMN IF NOT EXISTS proposal_status TEXT;

CREATE POLICY "Users update own project chats"
ON public.project_chats FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());