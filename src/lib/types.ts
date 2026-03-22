export interface MaterialItem {
  material: string;
  quantidade: string;
  unidade: string;
  observacao?: string;
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
  estrutura: MaterialItem[];
  acabamento: MaterialItem[];
  instalacoes?: MaterialItem[];
  instalacoes_eletricas?: MaterialItem[];
  instalacoes_hidraulicas?: MaterialItem[];
  recomendacoes: BrandRecommendation[];
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
}
