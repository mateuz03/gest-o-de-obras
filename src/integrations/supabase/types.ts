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
      access_requests: {
        Row: {
          ano_criacao: number
          celular: string
          created_at: string
          email: string
          id: string
          nome_completo: string
          nome_empresa: string
          qtd_funcionarios: string
          qtd_obras: number
          status: string
          tipo_empresa: string
          updated_at: string
        }
        Insert: {
          ano_criacao: number
          celular: string
          created_at?: string
          email: string
          id?: string
          nome_completo: string
          nome_empresa: string
          qtd_funcionarios: string
          qtd_obras: number
          status?: string
          tipo_empresa: string
          updated_at?: string
        }
        Update: {
          ano_criacao?: number
          celular?: string
          created_at?: string
          email?: string
          id?: string
          nome_completo?: string
          nome_empresa?: string
          qtd_funcionarios?: string
          qtd_obras?: number
          status?: string
          tipo_empresa?: string
          updated_at?: string
        }
        Relationships: []
      }
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
          cover_image_url: string | null
          created_at: string
          escala: string | null
          id: string
          imagem_url: string | null
          nome_projeto: string
          regiao: string | null
          resultado_json: Json | null
          sinapi_uf: string | null
          status: string
          target_cost_per_m2: number | null
          tipo_construcao: string | null
          total_estimado: number | null
          user_id: string
        }
        Insert: {
          bdi_percentual?: number | null
          cover_image_url?: string | null
          created_at?: string
          escala?: string | null
          id?: string
          imagem_url?: string | null
          nome_projeto?: string
          regiao?: string | null
          resultado_json?: Json | null
          sinapi_uf?: string | null
          status?: string
          target_cost_per_m2?: number | null
          tipo_construcao?: string | null
          total_estimado?: number | null
          user_id: string
        }
        Update: {
          bdi_percentual?: number | null
          cover_image_url?: string | null
          created_at?: string
          escala?: string | null
          id?: string
          imagem_url?: string | null
          nome_projeto?: string
          regiao?: string | null
          resultado_json?: Json | null
          sinapi_uf?: string | null
          status?: string
          target_cost_per_m2?: number | null
          tipo_construcao?: string | null
          total_estimado?: number | null
          user_id?: string
        }
        Relationships: []
      }
      analysis_document_pages: {
        Row: {
          analysis_id: string
          classification_confidence: number | null
          created_at: string
          document_id: string
          embedded_text: string | null
          has_embedded_text: boolean | null
          id: string
          image_path: string | null
          metadata_json: Json | null
          ocr_text: string | null
          page_class: string | null
          page_number: number
        }
        Insert: {
          analysis_id: string
          classification_confidence?: number | null
          created_at?: string
          document_id: string
          embedded_text?: string | null
          has_embedded_text?: boolean | null
          id?: string
          image_path?: string | null
          metadata_json?: Json | null
          ocr_text?: string | null
          page_class?: string | null
          page_number: number
        }
        Update: {
          analysis_id?: string
          classification_confidence?: number | null
          created_at?: string
          document_id?: string
          embedded_text?: string | null
          has_embedded_text?: boolean | null
          id?: string
          image_path?: string | null
          metadata_json?: Json | null
          ocr_text?: string | null
          page_class?: string | null
          page_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "analysis_document_pages_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_document_pages_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "analysis_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_documents: {
        Row: {
          analysis_id: string
          created_at: string
          file_name: string
          id: string
          mime_type: string
          page_count: number | null
          status: string
          storage_path: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          analysis_id: string
          created_at?: string
          file_name: string
          id?: string
          mime_type: string
          page_count?: number | null
          status?: string
          storage_path: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          analysis_id?: string
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string
          page_count?: number | null
          status?: string
          storage_path?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_documents_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_extraction_runs: {
        Row: {
          analysis_id: string
          created_at: string
          document_id: string | null
          error_message: string | null
          id: string
          payload_json: Json | null
          stage: string
          status: string
          updated_at: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          document_id?: string | null
          error_message?: string | null
          id?: string
          payload_json?: Json | null
          stage: string
          status?: string
          updated_at?: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          document_id?: string | null
          error_message?: string | null
          id?: string
          payload_json?: Json | null
          stage?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_extraction_runs_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_extraction_runs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "analysis_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_favorites: {
        Row: {
          created_at: string
          id: number
          post_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          post_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          post_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_favorites_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          autor: string
          categoria: string
          conteudo: string
          created_at: string
          destaque: boolean | null
          id: number
          imagem: string | null
          resumo: string
          slug: string
          tempo_leitura: string
          tipo: string
          titulo: string
        }
        Insert: {
          autor: string
          categoria: string
          conteudo: string
          created_at?: string
          destaque?: boolean | null
          id?: number
          imagem?: string | null
          resumo: string
          slug: string
          tempo_leitura: string
          tipo: string
          titulo: string
        }
        Update: {
          autor?: string
          categoria?: string
          conteudo?: string
          created_at?: string
          destaque?: boolean | null
          id?: number
          imagem?: string | null
          resumo?: string
          slug?: string
          tempo_leitura?: string
          tipo?: string
          titulo?: string
        }
        Relationships: []
      }
      clash_conflicts: {
        Row: {
          analysis_id: string
          conflict_type: string
          created_at: string
          description: string | null
          detected_at: string
          id: string
          recommendation: string | null
          related_item: string | null
          related_stage: string | null
          resolved_at: string | null
          severity: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_id: string
          conflict_type?: string
          created_at?: string
          description?: string | null
          detected_at?: string
          id?: string
          recommendation?: string | null
          related_item?: string | null
          related_stage?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_id?: string
          conflict_type?: string
          created_at?: string
          description?: string | null
          detected_at?: string
          id?: string
          recommendation?: string | null
          related_item?: string | null
          related_stage?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clash_conflicts_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
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
      featured_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          justificativa: string | null
          new_featured_until: string | null
          new_is_featured: boolean | null
          old_featured_until: string | null
          old_is_featured: boolean | null
          source: string
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          justificativa?: string | null
          new_featured_until?: string | null
          new_is_featured?: boolean | null
          old_featured_until?: string | null
          old_is_featured?: boolean | null
          source: string
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          justificativa?: string | null
          new_featured_until?: string | null
          new_is_featured?: boolean | null
          old_featured_until?: string | null
          old_is_featured?: boolean | null
          source?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
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
      fornecedores: {
        Row: {
          cidade: string | null
          cnpj: string
          created_at: string
          email: string | null
          endereco: string
          estado: string | null
          id: string
          nome_loja: string
          plano: string
          responsavel: string
          status: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          cidade?: string | null
          cnpj: string
          created_at?: string
          email?: string | null
          endereco: string
          estado?: string | null
          id?: string
          nome_loja: string
          plano?: string
          responsavel: string
          status?: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          cidade?: string | null
          cnpj?: string
          created_at?: string
          email?: string | null
          endereco?: string
          estado?: string | null
          id?: string
          nome_loja?: string
          plano?: string
          responsavel?: string
          status?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      fornecedores_leads: {
        Row: {
          cidade: string | null
          cnpj: string
          created_at: string
          id: string
          nome_loja: string
          plano_escolhido: string
          status: string
          whatsapp: string
        }
        Insert: {
          cidade?: string | null
          cnpj: string
          created_at?: string
          id?: string
          nome_loja: string
          plano_escolhido: string
          status?: string
          whatsapp: string
        }
        Update: {
          cidade?: string | null
          cnpj?: string
          created_at?: string
          id?: string
          nome_loja?: string
          plano_escolhido?: string
          status?: string
          whatsapp?: string
        }
        Relationships: []
      }
      marketplace_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          is_featured: boolean
          metadata: Json
          target_id: string | null
          target_type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          is_featured?: boolean
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          is_featured?: boolean
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      password_reset_attempts: {
        Row: {
          created_at: string
          email: string
          id: string
          ip: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip?: string
        }
        Relationships: []
      }
      perfil_lojista: {
        Row: {
          banner_url: string | null
          categoria: string | null
          cidade: string
          cnpj: string
          created_at: string
          descricao: string | null
          estado: string | null
          featured_until: string | null
          horario_atendimento: string | null
          id: string
          instagram: string | null
          is_premium: boolean
          logo_url: string | null
          motivo_rejeicao: string | null
          nome_loja: string
          plano_atual: string
          status: string
          user_id: string
          whatsapp: string
        }
        Insert: {
          banner_url?: string | null
          categoria?: string | null
          cidade: string
          cnpj: string
          created_at?: string
          descricao?: string | null
          estado?: string | null
          featured_until?: string | null
          horario_atendimento?: string | null
          id?: string
          instagram?: string | null
          is_premium?: boolean
          logo_url?: string | null
          motivo_rejeicao?: string | null
          nome_loja: string
          plano_atual?: string
          status?: string
          user_id: string
          whatsapp: string
        }
        Update: {
          banner_url?: string | null
          categoria?: string | null
          cidade?: string
          cnpj?: string
          created_at?: string
          descricao?: string | null
          estado?: string | null
          featured_until?: string | null
          horario_atendimento?: string | null
          id?: string
          instagram?: string | null
          is_premium?: boolean
          logo_url?: string | null
          motivo_rejeicao?: string | null
          nome_loja?: string
          plano_atual?: string
          status?: string
          user_id?: string
          whatsapp?: string
        }
        Relationships: []
      }
      pix_payments: {
        Row: {
          created_at: string
          expires_at: string | null
          gateway: string
          gateway_payment_id: string | null
          id: string
          paid_at: string | null
          plano_dias: number
          purpose: string
          qr_code: string | null
          qr_code_base64: string | null
          status: string
          target_id: string | null
          ticket_url: string | null
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          gateway?: string
          gateway_payment_id?: string | null
          id?: string
          paid_at?: string | null
          plano_dias?: number
          purpose: string
          qr_code?: string | null
          qr_code_base64?: string | null
          status?: string
          target_id?: string | null
          ticket_url?: string | null
          updated_at?: string
          user_id: string
          valor: number
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          gateway?: string
          gateway_payment_id?: string | null
          id?: string
          paid_at?: string | null
          plano_dias?: number
          purpose?: string
          qr_code?: string | null
          qr_code_base64?: string | null
          status?: string
          target_id?: string | null
          ticket_url?: string | null
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      produtos_loja: {
        Row: {
          categoria: string
          created_at: string
          featured_until: string | null
          foto_url: string | null
          id: string
          is_featured: boolean
          nome_produto: string
          preco: number
          status: string
          unidade_medida: string
          user_id: string
        }
        Insert: {
          categoria: string
          created_at?: string
          featured_until?: string | null
          foto_url?: string | null
          id?: string
          is_featured?: boolean
          nome_produto: string
          preco: number
          status?: string
          unidade_medida: string
          user_id: string
        }
        Update: {
          categoria?: string
          created_at?: string
          featured_until?: string | null
          foto_url?: string | null
          id?: string
          is_featured?: boolean
          nome_produto?: string
          preco?: number
          status?: string
          unidade_medida?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_produtos_perfil"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfil_lojista"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string | null
          ano_criacao_negocio: number | null
          area_atuacao: string | null
          avatar_url: string | null
          celular_whatsapp: string | null
          cidade: string | null
          cnpj: string | null
          como_conheceu: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          empresa: string | null
          estado: string | null
          id: string
          inscricao_estadual: string | null
          motivo_uso: string | null
          nome: string | null
          nome_completo: string | null
          nome_empresa: string | null
          plano_marketplace: string
          plano_marketplace_until: string | null
          qtd_funcionarios: string | null
          qtd_obras_atual: number | null
          telefone_comercial: string | null
          tipo_empresa: string | null
          user_id: string
        }
        Insert: {
          account_type?: string | null
          ano_criacao_negocio?: number | null
          area_atuacao?: string | null
          avatar_url?: string | null
          celular_whatsapp?: string | null
          cidade?: string | null
          cnpj?: string | null
          como_conheceu?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          empresa?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          motivo_uso?: string | null
          nome?: string | null
          nome_completo?: string | null
          nome_empresa?: string | null
          plano_marketplace?: string
          plano_marketplace_until?: string | null
          qtd_funcionarios?: string | null
          qtd_obras_atual?: number | null
          telefone_comercial?: string | null
          tipo_empresa?: string | null
          user_id: string
        }
        Update: {
          account_type?: string | null
          ano_criacao_negocio?: number | null
          area_atuacao?: string | null
          avatar_url?: string | null
          celular_whatsapp?: string | null
          cidade?: string | null
          cnpj?: string | null
          como_conheceu?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          empresa?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          motivo_uso?: string | null
          nome?: string | null
          nome_completo?: string | null
          nome_empresa?: string | null
          plano_marketplace?: string
          plano_marketplace_until?: string | null
          qtd_funcionarios?: string | null
          qtd_obras_atual?: number | null
          telefone_comercial?: string | null
          tipo_empresa?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profissionais: {
        Row: {
          avatar_url: string | null
          created_at: string
          especialidade: string
          id: string
          regiao: string
          resumo: string
          telefone: string
          updated_at: string
          user_id: string
          valor_diaria: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          especialidade: string
          id?: string
          regiao: string
          resumo: string
          telefone: string
          updated_at?: string
          user_id: string
          valor_diaria?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          especialidade?: string
          id?: string
          regiao?: string
          resumo?: string
          telefone?: string
          updated_at?: string
          user_id?: string
          valor_diaria?: number
        }
        Relationships: []
      }
      project_chats: {
        Row: {
          content: string
          created_at: string
          id: string
          project_id: string
          proposal: Json | null
          proposal_status: string | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          project_id: string
          proposal?: Json | null
          proposal_status?: string | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          project_id?: string
          proposal?: Json | null
          proposal_status?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_chats_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
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
      sinapi_base_oficial: {
        Row: {
          codigo: string
          created_at: string
          descricao: string
          desonerado: boolean
          id: string
          mes_ano: string
          preco_mao_de_obra: number | null
          preco_material: number | null
          preco_total: number | null
          tipo: string | null
          uf: string
          unidade: string | null
        }
        Insert: {
          codigo: string
          created_at?: string
          descricao: string
          desonerado: boolean
          id?: string
          mes_ano: string
          preco_mao_de_obra?: number | null
          preco_material?: number | null
          preco_total?: number | null
          tipo?: string | null
          uf: string
          unidade?: string | null
        }
        Update: {
          codigo?: string
          created_at?: string
          descricao?: string
          desonerado?: boolean
          id?: string
          mes_ano?: string
          preco_mao_de_obra?: number | null
          preco_material?: number | null
          preco_total?: number | null
          tipo?: string | null
          uf?: string
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
      admin_override_featured: {
        Args: {
          _featured_until: string
          _is_featured: boolean
          _justificativa: string
          _target_id: string
          _target_type: string
        }
        Returns: undefined
      }
      can_user_publish: { Args: { _user_id: string }; Returns: boolean }
      confirm_pix_payment: {
        Args: { _gateway_payment_id: string }
        Returns: Json
      }
      expire_features: { Args: never; Returns: undefined }
      get_public_seller: {
        Args: { p_user_id: string }
        Returns: {
          account_type: string
          avatar_url: string
          nome: string
          user_id: string
        }[]
      }
      get_publish_status: {
        Args: { _user_id: string }
        Returns: {
          active_count: number
          can_publish: boolean
          free_limit: number
          is_pro: boolean
        }[]
      }
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
