CREATE POLICY "Public can view shared analyses by ID"
ON public.analyses
FOR SELECT
TO anon
USING (true);