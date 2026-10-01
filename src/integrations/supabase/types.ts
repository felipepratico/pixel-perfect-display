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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      atendimentos: {
        Row: {
          aberto_em: string
          assunto: string
          cliente_id: string
          concluido_em: string | null
          created_at: string
          deleted_at: string | null
          descricao: string
          id: string
          prioridade: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aberto_em?: string
          assunto: string
          cliente_id: string
          concluido_em?: string | null
          created_at?: string
          deleted_at?: string | null
          descricao?: string
          id?: string
          prioridade?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          aberto_em?: string
          assunto?: string
          cliente_id?: string
          concluido_em?: string | null
          created_at?: string
          deleted_at?: string | null
          descricao?: string
          id?: string
          prioridade?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atendimentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria: {
        Row: {
          acao: string
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          id: string
          registro_id: string
          resumo: string
          tabela: string
          user_id: string
        }
        Insert: {
          acao: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          registro_id: string
          resumo?: string
          tabela: string
          user_id: string
        }
        Update: {
          acao?: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          registro_id?: string
          resumo?: string
          tabela?: string
          user_id?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          chave_pix: string
          cnpj: string
          created_at: string
          data_ultima_atualizacao: string | null
          deleted_at: string | null
          email: string
          grupo_id: string | null
          id: string
          modulos: string[]
          nome_fantasia: string
          observacoes: string
          plano: string
          quantidade_computadores: number
          razao_social: string
          rede_vpn: string
          status: string
          telefone: string
          tipo_certificado: string
          ultimo_backup: string | null
          updated_at: string
          user_id: string
          validade_certificado: string | null
          valor_base: number
          valor_computador_adicional: number
          vencimento: number
          versao_instalada: string
        }
        Insert: {
          chave_pix?: string
          cnpj?: string
          created_at?: string
          data_ultima_atualizacao?: string | null
          deleted_at?: string | null
          email?: string
          grupo_id?: string | null
          id?: string
          modulos?: string[]
          nome_fantasia?: string
          observacoes?: string
          plano?: string
          quantidade_computadores?: number
          razao_social: string
          rede_vpn?: string
          status?: string
          telefone?: string
          tipo_certificado?: string
          ultimo_backup?: string | null
          updated_at?: string
          user_id: string
          validade_certificado?: string | null
          valor_base?: number
          valor_computador_adicional?: number
          vencimento?: number
          versao_instalada?: string
        }
        Update: {
          chave_pix?: string
          cnpj?: string
          created_at?: string
          data_ultima_atualizacao?: string | null
          deleted_at?: string | null
          email?: string
          grupo_id?: string | null
          id?: string
          modulos?: string[]
          nome_fantasia?: string
          observacoes?: string
          plano?: string
          quantidade_computadores?: number
          razao_social?: string
          rede_vpn?: string
          status?: string
          telefone?: string
          tipo_certificado?: string
          ultimo_backup?: string | null
          updated_at?: string
          user_id?: string
          validade_certificado?: string | null
          valor_base?: number
          valor_computador_adicional?: number
          vencimento?: number
          versao_instalada?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      cobrancas_efi: {
        Row: {
          cliente_id: string
          created_at: string
          deleted_at: string | null
          efi_charge_id: number | null
          efi_subscription_id: number | null
          id: string
          idempotency_key: string
          linha_digitavel: string
          link_pagamento: string
          pago_em: string | null
          payload_referencia: Json
          pix_copia_cola: string
          status: string
          titulo_id: string | null
          ultimo_erro: string
          updated_at: string
          user_id: string
          valor: number
          vencimento: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          deleted_at?: string | null
          efi_charge_id?: number | null
          efi_subscription_id?: number | null
          id?: string
          idempotency_key: string
          linha_digitavel?: string
          link_pagamento?: string
          pago_em?: string | null
          payload_referencia?: Json
          pix_copia_cola?: string
          status?: string
          titulo_id?: string | null
          ultimo_erro?: string
          updated_at?: string
          user_id: string
          valor: number
          vencimento: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          deleted_at?: string | null
          efi_charge_id?: number | null
          efi_subscription_id?: number | null
          id?: string
          idempotency_key?: string
          linha_digitavel?: string
          link_pagamento?: string
          pago_em?: string | null
          payload_referencia?: Json
          pix_copia_cola?: string
          status?: string
          titulo_id?: string | null
          ultimo_erro?: string
          updated_at?: string
          user_id?: string
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "cobrancas_efi_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_efi_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "titulos"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_usuario: {
        Row: {
          created_at: string
          dias_alerta_backup: number
          dias_alerta_certificado: number
          efi_ambiente: string
          updated_at: string
          user_id: string
          versao_atual: string
        }
        Insert: {
          created_at?: string
          dias_alerta_backup?: number
          dias_alerta_certificado?: number
          efi_ambiente?: string
          updated_at?: string
          user_id: string
          versao_atual?: string
        }
        Update: {
          created_at?: string
          dias_alerta_backup?: number
          dias_alerta_certificado?: number
          efi_ambiente?: string
          updated_at?: string
          user_id?: string
          versao_atual?: string
        }
        Relationships: []
      }
      grupos_clientes: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          nome: string
          observacoes: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome: string
          observacoes?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome?: string
          observacoes?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      titulos: {
        Row: {
          cliente: string
          cliente_id: string | null
          cnpj: string
          created_at: string
          custo_boleto: number
          deleted_at: string | null
          efi_linha_digitavel: string
          efi_link_pagamento: string
          efi_status: string
          francisco_pct: number
          id: string
          mensal_real: number
          mensal_site: number
          mes_ano: string
          pago_em: string | null
          situacao: string
          status_assinatura: string
          telefone: string
          tipo_cobranca: string
          updated_at: string
          user_id: string
          vencimento: number
        }
        Insert: {
          cliente: string
          cliente_id?: string | null
          cnpj?: string
          created_at?: string
          custo_boleto?: number
          deleted_at?: string | null
          efi_linha_digitavel?: string
          efi_link_pagamento?: string
          efi_status?: string
          francisco_pct?: number
          id?: string
          mensal_real?: number
          mensal_site?: number
          mes_ano?: string
          pago_em?: string | null
          situacao?: string
          status_assinatura?: string
          telefone?: string
          tipo_cobranca?: string
          updated_at?: string
          user_id: string
          vencimento?: number
        }
        Update: {
          cliente?: string
          cliente_id?: string | null
          cnpj?: string
          created_at?: string
          custo_boleto?: number
          deleted_at?: string | null
          efi_linha_digitavel?: string
          efi_link_pagamento?: string
          efi_status?: string
          francisco_pct?: number
          id?: string
          mensal_real?: number
          mensal_site?: number
          mes_ano?: string
          pago_em?: string | null
          situacao?: string
          status_assinatura?: string
          telefone?: string
          tipo_cobranca?: string
          updated_at?: string
          user_id?: string
          vencimento?: number
        }
        Relationships: [
          {
            foreignKeyName: "titulos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
