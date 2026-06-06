export interface SinapiMatch {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string | null;
  preco_material: number | null;
  preco_mao_de_obra: number | null;
  regiao: string | null;
  mes_ano: string | null;
}

export interface BudgetItem {
  item: string;
  descricao: string;
  local_aplicacao?: string;
  fornecedor: string;
  marca: string;
  marca_sugerida?: string;
  quantidade: number | string;
  unidade: string;
  preco_unitario: number | string;
  preco_total: number | string;
  codigo_sinapi?: string;
  origem_preco: string;
  perda_aplicada?: string;
  // Price reconciliation fields
  sinapi_match?: SinapiMatch | null;
  preco_sinapi_unitario?: number | null;
  preco_conciliado?: boolean;
  // How the SINAPI reconciliation was applied (auto vs manual link)
  modo_conciliacao?: "automatica" | "manual" | string;
  // Hybrid SINAPI flow: true when match-sinapi could not find a match in the local DB
  sem_preco_sinapi?: boolean;
  // Hybrid SINAPI flow: true when price came from AI estimate (fallback)
  estimado_ia?: boolean;
  // Guardrail: true when unit price exceeds sanity threshold (R$ 50.000)
  alerta_revisao?: boolean;
}

export interface MacroEtapa {
  nome: string;
  itens: BudgetItem[];
  subtotal: number | string;
  duracao_dias_estimada?: number;
}

export interface ComodoQuantitativo {
  comodo: string;
  itens: BudgetItem[];
  subtotal: number | string;
}

export interface ResumoFinal {
  total_materiais: number | string;
  total_mao_de_obra: number | string;
  total_geral: number | string;
  bdi_percentual?: number | string;
  bdi_valor?: number | string;
  premissas_bdi?: string;
}

export interface BrandRecommendation {
  material: string;
  marcas: {
    nome: string;
    justificativa: string;
  }[];
}

export interface AnalysisResult {
  resumo: string;
  area_total_m2: number;
  escala_detectada: string;
  referencia_sinapi?: string;
  macro_etapas: MacroEtapa[];
  quantitativo_por_comodo?: ComodoQuantitativo[];
  resumo_final: ResumoFinal;
  recomendacoes: BrandRecommendation[];
  // Legacy fields for backward compatibility
  estrutura?: any[];
  acabamento?: any[];
  instalacoes?: any[];
  instalacoes_eletricas?: any[];
  instalacoes_hidraulicas?: any[];
}

export interface Analysis {
  id: string;
  user_id: string;
  nome_projeto: string;
  imagem_url: string;
  escala?: string;
  tipo_construcao?: string;
  regiao?: string;
  resultado_json: AnalysisResult | null;
  status: 'pending' | 'processing' | 'completed' | 'error';
  created_at: string;
  bdi_percentual?: number;
  total_estimado?: number;
}
