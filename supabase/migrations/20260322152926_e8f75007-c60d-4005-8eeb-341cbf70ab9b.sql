-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  empresa TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'nome');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create analyses table
CREATE TABLE public.analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_projeto TEXT NOT NULL DEFAULT 'Sem título',
  imagem_url TEXT,
  escala TEXT,
  tipo_construcao TEXT,
  regiao TEXT,
  resultado_json JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own analyses" ON public.analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own analyses" ON public.analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own analyses" ON public.analyses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own analyses" ON public.analyses FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for blueprints
INSERT INTO storage.buckets (id, name, public) VALUES ('blueprints', 'blueprints', true);

CREATE POLICY "Anyone can view blueprints" ON storage.objects FOR SELECT USING (bucket_id = 'blueprints');
CREATE POLICY "Authenticated users can upload blueprints" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'blueprints' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own blueprints" ON storage.objects FOR UPDATE USING (bucket_id = 'blueprints' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own blueprints" ON storage.objects FOR DELETE USING (bucket_id = 'blueprints' AND auth.uid()::text = (storage.foldername(name))[1]);