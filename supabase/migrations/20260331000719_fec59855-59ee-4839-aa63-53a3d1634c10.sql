
-- Allow anonymous users to read diario_obra for shared analyses (chatbot)
CREATE POLICY "Anon can read diario for shared analyses"
ON public.diario_obra FOR SELECT TO anon
USING (true);
