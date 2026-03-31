
-- 1. DIÁRIO DE OBRA (registros diários do canteiro)
CREATE TABLE public.diario_obra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  data_registro date NOT NULL DEFAULT CURRENT_DATE,
  clima text,
  equipe_presente integer DEFAULT 0,
  atividades_realizadas text,
  problemas_ocorridos text,
  observacoes text,
  fotos_urls text[],
  status_geral text DEFAULT 'normal' CHECK (status_geral IN ('normal', 'atencao', 'critico')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.diario_obra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own diario" ON public.diario_obra FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can insert own diario" ON public.diario_obra FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own diario" ON public.diario_obra FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can delete own diario" ON public.diario_obra FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 2. ESTOQUE DE OBRA (materiais em estoque no canteiro)
CREATE TABLE public.estoque_obra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  nome_produto text NOT NULL,
  categoria text,
  quantidade numeric(15,3) NOT NULL DEFAULT 0,
  unidade text,
  valor_unitario numeric(15,2),
  valor_total numeric(15,2),
  fornecedor text,
  nota_fiscal_ref text,
  data_entrada date DEFAULT CURRENT_DATE,
  localizacao_canteiro text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.estoque_obra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own estoque" ON public.estoque_obra FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can insert own estoque" ON public.estoque_obra FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own estoque" ON public.estoque_obra FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can delete own estoque" ON public.estoque_obra FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 3. CONTAS A PAGAR (financeiro de pagamentos)
CREATE TABLE public.contas_a_pagar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  fornecedor_nome text NOT NULL,
  fornecedor_cnpj text,
  descricao text,
  valor_total numeric(15,2) NOT NULL,
  data_emissao date,
  data_vencimento date,
  data_pagamento date,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'vencido', 'cancelado')),
  forma_pagamento text,
  nota_fiscal_numero text,
  nota_fiscal_url text,
  impostos_retidos numeric(15,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contas_a_pagar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contas" ON public.contas_a_pagar FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can insert own contas" ON public.contas_a_pagar FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own contas" ON public.contas_a_pagar FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can delete own contas" ON public.contas_a_pagar FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 4. FINANCEIRO - FLUXO DE CAIXA
CREATE TABLE public.financeiro_fluxo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  categoria text,
  descricao text,
  valor numeric(15,2) NOT NULL,
  data_prevista date,
  data_realizada date,
  status text NOT NULL DEFAULT 'previsto' CHECK (status IN ('previsto', 'realizado', 'cancelado')),
  referencia text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.financeiro_fluxo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fluxo" ON public.financeiro_fluxo FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can insert own fluxo" ON public.financeiro_fluxo FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own fluxo" ON public.financeiro_fluxo FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can delete own fluxo" ON public.financeiro_fluxo FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 5. COMPRAS - COTAÇÕES
CREATE TABLE public.compras_cotacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  item_descricao text NOT NULL,
  quantidade numeric(15,3) NOT NULL,
  unidade text,
  fornecedor_1_nome text,
  fornecedor_1_preco numeric(15,2),
  fornecedor_2_nome text,
  fornecedor_2_preco numeric(15,2),
  fornecedor_3_nome text,
  fornecedor_3_preco numeric(15,2),
  fornecedor_escolhido text,
  preco_escolhido numeric(15,2),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'cotado', 'aprovado', 'comprado')),
  prazo_entrega_dias integer,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.compras_cotacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cotacoes" ON public.compras_cotacao FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can insert own cotacoes" ON public.compras_cotacao FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own cotacoes" ON public.compras_cotacao FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can delete own cotacoes" ON public.compras_cotacao FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 6. CRONOGRAMA - MARCOS (milestones de alto nível)
CREATE TABLE public.cronograma_marcos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  nome_marco text NOT NULL,
  descricao text,
  data_prevista date NOT NULL,
  data_realizada date,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido', 'atrasado')),
  percentual_concluido numeric(5,2) DEFAULT 0,
  responsavel text,
  dependencia_marco_id uuid REFERENCES public.cronograma_marcos(id),
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cronograma_marcos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own marcos" ON public.cronograma_marcos FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can insert own marcos" ON public.cronograma_marcos FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own marcos" ON public.cronograma_marcos FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can delete own marcos" ON public.cronograma_marcos FOR DELETE TO authenticated
  USING (user_id = auth.uid());
