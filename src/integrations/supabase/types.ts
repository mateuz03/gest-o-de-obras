export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      alertas_preditivos: {
        Row: {
          analysis_id: string
          created_at: string
          current_task: string | null
          fornecedor: string | null
          id: string
          mitigation: string | null
          probability: number
          reason: string | null
          severity: string
          stagnation_days: number | null
          suggested_new_date: string | null
          summary: string | null
          user_id: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          current_task?: string | null
          fornecedor?: string | null
          id?: string
          mitigation?: string | null
          probability?: number
          reason?: string | null
          severity?: string
          stagnation_days?: number | null
          suggested_new_date?: string | null
          summary?: string | null
          user_id: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          current_task?: string | null
          fornecedor?: string | null
          id?: string
          mitigation?: string | null
          probability?: number
          reason?: string | null
          severity?: string
          stagnation_days?: number | null
          suggested_new_date?: string | null
          summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_preditivos_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      analyses: {
        Row: {
          bdi_percentual: number | null
          created_at: string
          escala: string | null
          id: string
          imagem_url: string | null
          nome_projeto: string
          regiao: string | null
          resultado_json: Json | null
          status: string
          tipo_construcao: string | null
          total_estimado: number | null
          user_id: string
        }
        Insert: {
          bdi_percentual?: number | null
          created_at?: string
          escala?: string | null
          id?: string
          imagem_url?: string | null
          nome_projeto?: string
          regiao?: string | null
          resultado_json?: Json | null
          status?: string
          tipo_construcao?: string | null
          total_estimado?: number | null
          user_id: string
        }
        Update: {
          bdi_percentual?: number | null
          created_at?: string
          escala?: string | null
          id?: string
          imagem_url?: string | null
          nome_projeto?: string
          regiao?: string | null
          resultado_json?: Json | null
          status?: string
          tipo_construcao?: string | null
          total_estimado?: number | null
          user_id?: string
        }
        Relationships: []
      }
      compras_cotacao: {
        Row: {
          analysis_id: string
          created_at: string
          fornecedor_1_nome: string | null
          fornecedor_1_preco: number | null
          fornecedor_2_nome: string | null
          fornecedor_2_preco: number | null
          fornecedor_3_nome: string | null
          fornecedor_3_preco: number | null
          fornecedor_escolhido: string | null
          id: string
          item_descricao: string
          observacoes: string | null
          prazo_entrega_dias: number | null
          preco_escolhido: number | null
          quantidade: number
          status: string
          unidade: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          fornecedor_1_nome?: string | null
          fornecedor_1_preco?: number | null
          fornecedor_2_nome?: string | null
          fornecedor_2_preco?: number | null
          fornecedor_3_nome?: string | null
          fornecedor_3_preco?: number | null
          fornecedor_escolhido?: string | null
          id?: string
          item_descricao: string
          observacoes?: string | null
          prazo_entrega_dias?: number | null
          preco_escolhido?: number | null
          quantidade: number
          status?: string
          unidade?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          fornecedor_1_nome?: string | null
          fornecedor_1_preco?: number | null
          fornecedor_2_nome?: string | null
          fornecedor_2_preco?: number | null
          fornecedor_3_nome?: string | null
          fornecedor_3_preco?: number | null
          fornecedor_escolhido?: string | null
          id?: string
          item_descricao?: string
          observacoes?: string | null
          prazo_entrega_dias?: number | null
          preco_escolhido?: number | null
          quantidade?: number
          status?: string
          unidade?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_cotacao_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_a_pagar: {
        Row: {
          analysis_id: string
          created_at: string
          data_emissao: string | null
          data_pagamento: string | null
          data_vencimento: string | null
          descricao: string | null
          forma_pagamento: string | null
          fornecedor_cnpj: string | null
          fornecedor_nome: string
          id: string
          impostos_retidos: number | null
          nota_fiscal_numero: string | null
          nota_fiscal_url: string | null
          status: string
          updated_at: string
          user_id: string
          valor_total: number
        }
        Insert: {
          analysis_id: string
          created_at?: string
          data_emissao?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          forma_pagamento?: string | null
          fornecedor_cnpj?: string | null
          fornecedor_nome: string
          id?: string
          impostos_retidos?: number | null
          nota_fiscal_numero?: string | null
          nota_fiscal_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
          valor_total: number
        }
        Update: {
          analysis_id?: string
          created_at?: string
          data_emissao?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          forma_pagamento?: string | null
          fornecedor_cnpj?: string | null
          fornecedor_nome?: string
          id?: string
          impostos_retidos?: number | null
          nota_fiscal_numero?: string | null
          nota_fiscal_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_a_pagar_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma_marcos: {
        Row: {
          analysis_id: string
          created_at: string
          data_prevista: string
          data_realizada: string | null
          dependencia_marco_id: string | null
          descricao: string | null
          id: string
          nome_marco: string
          percentual_concluido: number | null
          responsavel: string | null
          sort_order: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          data_prevista: string
          data_realizada?: string | null
          dependencia_marco_id?: string | null
          descricao?: string | null
          id?: string
          nome_marco: string
          percentual_concluido?: number | null
          responsavel?: string | null
          sort_order?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          data_prevista?: string
          data_realizada?: string | null
          dependencia_marco_id?: string | null
          descricao?: string | null
          id?: string
          nome_marco?: string
          percentual_concluido?: number | null
          responsavel?: string | null
          sort_order?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_marcos_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_marcos_dependencia_marco_id_fkey"
            columns: ["dependencia_marco_id"]
            isOneToOne: false
            referencedRelation: "cronograma_marcos"
            referencedColumns: ["id"]
          },
        ]
      }
      diario_obra: {
        Row: {
          analysis_id: string
          atividades_realizadas: string | null
          clima: string | null
          created_at: string
          data_registro: string
          equipe_presente: number | null
          fotos_urls: string[] | null
          id: string
          observacoes: string | null
          problemas_ocorridos: string | null
          status_geral: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_id: string
          atividades_realizadas?: string | null
          clima?: string | null
          created_at?: string
          data_registro?: string
          equipe_presente?: number | null
          fotos_urls?: string[] | null
          id?: string
          observacoes?: string | null
          problemas_ocorridos?: string | null
          status_geral?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_id?: string
          atividades_realizadas?: string | null
          clima?: string | null
          created_at?: string
          data_registro?: string
          equipe_presente?: number | null
          fotos_urls?: string[] | null
          id?: string
          observacoes?: string | null
          problemas_ocorridos?: string | null
          status_geral?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diario_obra_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_obra: {
        Row: {
          analysis_id: string
          categoria: string | null
          created_at: string
          data_entrada: string | null
          fornecedor: string | null
          id: string
          localizacao_canteiro: string | null
          nome_produto: string
          nota_fiscal_ref: string | null
          quantidade: number
          unidade: string | null
          updated_at: string
          user_id: string
          valor_total: number | null
          valor_unitario: number | null
        }
        Insert: {
          analysis_id: string
          categoria?: string | null
          created_at?: string
          data_entrada?: string | null
          fornecedor?: string | null
          id?: string
          localizacao_canteiro?: string | null
          nome_produto: string
          nota_fiscal_ref?: string | null
          quantidade?: number
          unidade?: string | null
          updated_at?: string
          user_id: string
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Update: {
          analysis_id?: string
          categoria?: string | null
          created_at?: string
          data_entrada?: string | null
          fornecedor?: string | null
          id?: string
          localizacao_canteiro?: string | null
          nome_produto?: string
          nota_fiscal_ref?: string | null
          quantidade?: number
          unidade?: string | null
          updated_at?: string
          user_id?: string
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_obra_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_fluxo: {
        Row: {
          analysis_id: string
          categoria: string | null
          created_at: string
          data_prevista: string | null
          data_realizada: string | null
          descricao: string | null
          id: string
          referencia: string | null
          status: string
          tipo: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          analysis_id: string
          categoria?: string | null
          created_at?: string
          data_prevista?: string | null
          data_realizada?: string | null
          descricao?: string | null
          id?: string
          referencia?: string | null
          status?: string
          tipo: string
          updated_at?: string
          user_id: string
          valor: number
        }
        Update: {
          analysis_id?: string
          categoria?: string | null
          created_at?: string
          data_prevista?: string | null
          data_realizada?: string | null
          descricao?: string | null
          id?: string
          referencia?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_fluxo_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ano_criacao_negocio: number | null
          area_atuacao: string | null
          celular_whatsapp: string | null
          cidade: string | null
          como_conheceu: string | null
          created_at: string
          data_nascimento: string | null
          empresa: string | null
          estado: string | null
          id: string
          motivo_uso: string | null
          nome: string | null
          nome_completo: string | null
          nome_empresa: string | null
          qtd_funcionarios: string | null
          qtd_obras_atual: number | null
          tipo_empresa: string | null
          user_id: string
        }
        Insert: {
          ano_criacao_negocio?: number | null
          area_atuacao?: string | null
          celular_whatsapp?: string | null
          cidade?: string | null
          como_conheceu?: string | null
          created_at?: string
          data_nascimento?: string | null
          empresa?: string | null
          estado?: string | null
          id?: string
          motivo_uso?: string | null
          nome?: string | null
          nome_completo?: string | null
          nome_empresa?: string | null
          qtd_funcionarios?: string | null
          qtd_obras_atual?: number | null
          tipo_empresa?: string | null
          user_id: string
        }
        Update: {
          ano_criacao_negocio?: number | null
          area_atuacao?: string | null
          celular_whatsapp?: string | null
          cidade?: string | null
          como_conheceu?: string | null
          created_at?: string
          data_nascimento?: string | null
          empresa?: string | null
          estado?: string | null
          id?: string
          motivo_uso?: string | null
          nome?: string | null
          nome_completo?: string | null
          nome_empresa?: string | null
          qtd_funcionarios?: string | null
          qtd_obras_atual?: number | null
          tipo_empresa?: string | null
          user_id?: string
        }
        Relationships: []
      }
      project_schedule: {
        Row: {
          analysis_id: string
          created_at: string
          duration_days: number
          end_date: string
          id: string
          sort_order: number
          start_date: string
          task_name: string
          updated_at: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          duration_days?: number
          end_date: string
          id?: string
          sort_order?: number
          start_date: string
          task_name: string
          updated_at?: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          duration_days?: number
          end_date?: string
          id?: string
          sort_order?: number
          start_date?: string
          task_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_schedule_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      referencia_sinapi: {
        Row: {
          codigo: string
          created_at: string | null
          descricao: string
          fonte_arquivo: string | null
          id: string
          mes_ano: string | null
          preco_mao_de_obra: number | null
          preco_material: number | null
          regiao: string | null
          tipo: string | null
          unidade: string | null
        }
        Insert: {
          codigo: string
          created_at?: string | null
          descricao: string
          fonte_arquivo?: string | null
          id?: string
          mes_ano?: string | null
          preco_mao_de_obra?: number | null
          preco_material?: number | null
          regiao?: string | null
          tipo?: string | null
          unidade?: string | null
        }
        Update: {
          codigo?: string
          created_at?: string | null
          descricao?: string
          fonte_arquivo?: string | null
          id?: string
          mes_ano?: string | null
          preco_mao_de_obra?: number | null
          preco_material?: number | null
          regiao?: string | null
          tipo?: string | null
          unidade?: string | null
        }
        Relationships: []
      }
      sinapi_parse_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          items: Json
          nome_arquivo: string
          processed_chunks: number
          processed_pages: number
          progress: number
          status: string
          tipo: string
          total_chunks: number | null
          total_pages: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          items?: Json
          nome_arquivo: string
          processed_chunks?: number
          processed_pages?: number
          progress?: number
          status?: string
          tipo?: string
          total_chunks?: number | null
          total_pages?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          items?: Json
          nome_arquivo?: string
          processed_chunks?: number
          processed_pages?: number
          progress?: number
          status?: string
          tipo?: string
          total_chunks?: number | null
          total_pages?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sinapi_uploads: {
        Row: {
          created_at: string
          id: string
          mes_ano: string | null
          nome_arquivo: string
          observacoes: string | null
          qtd_itens: number
          qtd_paginas: number | null
          regiao: string | null
          status: string
          tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mes_ano?: string | null
          nome_arquivo: string
          observacoes?: string | null
          qtd_itens?: number
          qtd_paginas?: number | null
          regiao?: string | null
          status?: string
          tipo?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mes_ano?: string | null
          nome_arquivo?: string
          observacoes?: string | null
          qtd_itens?: number
          qtd_paginas?: number | null
          regiao?: string | null
          status?: string
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
