-- Avatar do vendedor (foto exibida no perfil simples do CPF)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Função pública e segura para resolver dados básicos do vendedor
-- (evita expor dados sensíveis do profiles como CPF/CNPJ/telefone)
CREATE OR REPLACE FUNCTION public.get_public_seller(p_user_id uuid)
RETURNS TABLE (user_id uuid, nome text, account_type text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id,
         COALESCE(NULLIF(p.nome_completo, ''), NULLIF(p.nome, '')) AS nome,
         p.account_type,
         p.avatar_url
  FROM public.profiles p
  WHERE p.user_id = p_user_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_seller(uuid) TO anon, authenticated;