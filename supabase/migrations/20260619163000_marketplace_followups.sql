CREATE POLICY "Admins view all store profiles"
ON public.perfil_lojista
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all marketplace products"
ON public.produtos_loja
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.list_public_seller_products(_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  nome_produto text,
  categoria text,
  preco numeric,
  unidade_medida text,
  foto_url text,
  created_at timestamptz,
  is_featured boolean,
  featured_until timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.user_id,
    p.nome_produto,
    p.categoria,
    p.preco,
    p.unidade_medida,
    p.foto_url,
    p.created_at,
    p.is_featured,
    p.featured_until
  FROM public.produtos_loja p
  JOIN public.profiles pr
    ON pr.user_id = p.user_id
  WHERE p.user_id = _user_id
    AND p.status = 'ativo'
    AND public.normalize_account_type(pr.account_type) = 'CPF'
  ORDER BY p.is_featured DESC, p.created_at DESC, p.id ASC;
$$;

GRANT EXECUTE ON FUNCTION public.list_public_seller_products(uuid) TO anon, authenticated;
