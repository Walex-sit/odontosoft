/**
 * app/lib/database.types.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Tipos TypeScript para o banco OdontoSoft compatíveis com Supabase JS v2.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type UserRole = 'admin' | 'dentista' | 'recepcao' | 'financeiro'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      clinicas: {
        Row: {
          id: string
          nome: string
          cnpj: string | null
          telefone: string | null
          email: string | null
          endereco: string | null
          plano: 'basico' | 'profissional' | 'enterprise'
          ativo: boolean
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          nome: string
          cnpj?: string | null
          telefone?: string | null
          email?: string | null
          endereco?: string | null
          plano?: 'basico' | 'profissional' | 'enterprise'
          ativo?: boolean
          criado_em?: string
          atualizado_em?: string
        }
        Update: {
          id?: string
          nome?: string
          cnpj?: string | null
          telefone?: string | null
          email?: string | null
          endereco?: string | null
          plano?: 'basico' | 'profissional' | 'enterprise'
          ativo?: boolean
          criado_em?: string
          atualizado_em?: string
        }
        Relationships: []
      }
      clinica_settings: {
        Row: {
          id: string
          clinica_id: string | null
          nome: string
          cnpj: string | null
          telefone: string | null
          email: string | null
          endereco: string | null
          cro_responsavel: string | null
          nome_responsavel: string | null
          logo_url: string | null
          nome_exibido: string | null
          site: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          clinica_id?: string | null
          nome?: string
          cnpj?: string | null
          telefone?: string | null
          email?: string | null
          endereco?: string | null
          cro_responsavel?: string | null
          nome_responsavel?: string | null
          logo_url?: string | null
          nome_exibido?: string | null
          site?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          clinica_id?: string | null
          nome?: string
          cnpj?: string | null
          telefone?: string | null
          email?: string | null
          endereco?: string | null
          cro_responsavel?: string | null
          nome_responsavel?: string | null
          logo_url?: string | null
          nome_exibido?: string | null
          site?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          id: string
          nome: string
          email: string | null
          role: UserRole
          especialidade: string | null
          clinica_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          nome: string
          email?: string | null
          role?: UserRole
          especialidade?: string | null
          clinica_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          email?: string | null
          role?: UserRole
          especialidade?: string | null
          clinica_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      pacientes: {
        Row: {
          id: string
          clinica_id: string | null
          user_id: string | null
          nome: string
          cpf_hash: string
          cpf_encrypted: string | null
          cpf_raw?: string | null
          rg: string | null
          data_nascimento: string | null
          genero: string | null
          telefone: string | null
          whatsapp: boolean | null
          email: string | null
          cep: string | null
          rua: string | null
          numero: string | null
          bairro: string | null
          cidade: string | null
          endereco: string | null
          convenio: string | null
          lgpd_aceite: boolean | null
          lgpd_aceite_em: string | null
          created_at: string
          // Campos estendidos do formulário de edição
          celular: string | null
          ddi: string | null
          ddd: string | null
          lembrete_automatico: string | null
          telefone_fixo: string | null
          como_conheceu: string | null
          profissao: string | null
          estrangeiro: boolean | null
          observacoes: string | null
          categoria: string | null
          categoria_id: string | null
          contato_emergencia_nome: string | null
          contato_emergencia_telefone: string | null
          contato_emerg_nome: string | null
          contato_emerg_telefone: string | null
          complemento: string | null
          estado: string | null
          responsavel_nome: string | null
          responsavel_cpf: string | null
          responsavel_nascimento: string | null
          titular_convenio: string | null
          numero_carteirinha: string | null
          cpf_responsavel_convenio: string | null
          lembretes: string | null
          foto_url: string | null
        }
        Insert: {
          id?: string
          clinica_id?: string | null
          user_id?: string | null
          nome: string
          cpf_hash?: string
          cpf_encrypted?: string | null
          cpf_raw?: string | null
          rg?: string | null
          data_nascimento?: string | null
          genero?: string | null
          telefone?: string | null
          whatsapp?: boolean | null
          email?: string | null
          cep?: string | null
          rua?: string | null
          numero?: string | null
          bairro?: string | null
          cidade?: string | null
          endereco?: string | null
          convenio?: string | null
          lgpd_aceite?: boolean | null
          lgpd_aceite_em?: string | null
          created_at?: string
          celular?: string | null
          ddi?: string | null
          ddd?: string | null
          lembrete_automatico?: string | null
          telefone_fixo?: string | null
          como_conheceu?: string | null
          profissao?: string | null
          estrangeiro?: boolean | null
          observacoes?: string | null
          categoria?: string | null
          categoria_id?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          contato_emerg_nome?: string | null
          contato_emerg_telefone?: string | null
          complemento?: string | null
          estado?: string | null
          responsavel_nome?: string | null
          responsavel_cpf?: string | null
          responsavel_nascimento?: string | null
          titular_convenio?: string | null
          numero_carteirinha?: string | null
          cpf_responsavel_convenio?: string | null
          lembretes?: string | null
          foto_url?: string | null
        }
        Update: {
          id?: string
          clinica_id?: string | null
          user_id?: string | null
          nome?: string
          cpf_hash?: string
          cpf_encrypted?: string | null
          cpf_raw?: string | null
          rg?: string | null
          data_nascimento?: string | null
          genero?: string | null
          telefone?: string | null
          whatsapp?: boolean | null
          email?: string | null
          cep?: string | null
          rua?: string | null
          numero?: string | null
          bairro?: string | null
          cidade?: string | null
          endereco?: string | null
          convenio?: string | null
          lgpd_aceite?: boolean | null
          lgpd_aceite_em?: string | null
          created_at?: string
          celular?: string | null
          ddi?: string | null
          ddd?: string | null
          lembrete_automatico?: string | null
          telefone_fixo?: string | null
          como_conheceu?: string | null
          profissao?: string | null
          estrangeiro?: boolean | null
          observacoes?: string | null
          categoria?: string | null
          categoria_id?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          contato_emerg_nome?: string | null
          contato_emerg_telefone?: string | null
          complemento?: string | null
          estado?: string | null
          responsavel_nome?: string | null
          responsavel_cpf?: string | null
          responsavel_nascimento?: string | null
          titular_convenio?: string | null
          numero_carteirinha?: string | null
          cpf_responsavel_convenio?: string | null
          lembretes?: string | null
          foto_url?: string | null
        }
        Relationships: []
      }
      agendamentos: {
        Row: {
          id: string
          clinica_id: string | null
          paciente_id: string | null
          dentista_id: string | null
          data_consulta: string
          hora_consulta: string
          hora_fim: string | null
          procedimento: string | null
          observacoes: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          clinica_id?: string | null
          paciente_id?: string | null
          dentista_id?: string | null
          data_consulta: string
          hora_consulta: string
          hora_fim?: string | null
          procedimento?: string | null
          observacoes?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          clinica_id?: string | null
          paciente_id?: string | null
          dentista_id?: string | null
          data_consulta?: string
          hora_consulta?: string
          hora_fim?: string | null
          procedimento?: string | null
          observacoes?: string | null
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      prontuarios: {
        Row: {
          id: string
          clinica_id: string | null
          paciente_id: string | null
          dentista_id: string | null
          descricao: string
          tratamento: string | null
          data_registro: string
        }
        Insert: {
          id?: string
          clinica_id?: string | null
          paciente_id?: string | null
          dentista_id?: string | null
          descricao: string
          tratamento?: string | null
          data_registro?: string
        }
        Update: {
          id?: string
          clinica_id?: string | null
          paciente_id?: string | null
          dentista_id?: string | null
          descricao?: string
          tratamento?: string | null
          data_registro?: string
        }
        Relationships: []
      }
      receitas: {
        Row: {
          id: string
          clinica_id: string | null
          paciente_id: string | null
          profissional_id: string | null
          tipo_receituario: string | null
          descricao: string | null
          valor: number | null
          status: string | null
          observacoes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          clinica_id?: string | null
          paciente_id?: string | null
          profissional_id?: string | null
          tipo_receituario?: string | null
          descricao?: string | null
          valor?: number | null
          status?: string | null
          observacoes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          clinica_id?: string | null
          paciente_id?: string | null
          profissional_id?: string | null
          tipo_receituario?: string | null
          descricao?: string | null
          valor?: number | null
          status?: string | null
          observacoes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      receita_itens: {
        Row: {
          id: string
          receita_id: string | null
          medicamento: string
          concentracao: string | null
          forma_farm: string | null
          quantidade: string | null
          posologia: string | null
          instrucoes: string | null
          ordem: number | null
          created_at: string
        }
        Insert: {
          id?: string
          receita_id?: string | null
          medicamento: string
          concentracao?: string | null
          forma_farm?: string | null
          quantidade?: string | null
          posologia?: string | null
          instrucoes?: string | null
          ordem?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          receita_id?: string | null
          medicamento?: string
          concentracao?: string | null
          forma_farm?: string | null
          quantidade?: string | null
          posologia?: string | null
          instrucoes?: string | null
          ordem?: number | null
          created_at?: string
        }
        Relationships: []
      }
      atestados: {
        Row: {
          id: string
          clinica_id: string | null
          paciente_id: string | null
          profissional_id: string | null
          data_inicio: string | null
          dias_afastamento: number | null
          motivo: string | null
          cid: string | null
          cid_descricao: string | null
          establishment_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          clinica_id?: string | null
          paciente_id?: string | null
          profissional_id?: string | null
          data_inicio?: string | null
          dias_afastamento?: number | null
          motivo?: string | null
          cid?: string | null
          cid_descricao?: string | null
          establishment_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          clinica_id?: string | null
          paciente_id?: string | null
          profissional_id?: string | null
          data_inicio?: string | null
          dias_afastamento?: number | null
          motivo?: string | null
          cid?: string | null
          cid_descricao?: string | null
          establishment_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      despesas: {
        Row: {
          id: string
          clinica_id: string | null
          descricao: string
          valor: number
          data_vencimento: string
          data_pagamento: string | null
          status: string | null
          categoria: string | null
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          clinica_id?: string | null
          descricao: string
          valor: number
          data_vencimento: string
          data_pagamento?: string | null
          status?: string | null
          categoria?: string | null
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          clinica_id?: string | null
          descricao?: string
          valor?: number
          data_vencimento?: string
          data_pagamento?: string | null
          status?: string | null
          categoria?: string | null
          user_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          id: string
          clinica_id: string | null
          nome: string
          cnpj: string | null
          telefone: string | null
          email: string | null
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          clinica_id?: string | null
          nome: string
          cnpj?: string | null
          telefone?: string | null
          email?: string | null
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          clinica_id?: string | null
          nome?: string
          cnpj?: string | null
          telefone?: string | null
          email?: string | null
          user_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      compras: {
        Row: {
          id: string
          clinica_id: string | null
          fornecedor_id: string | null
          descricao: string
          valor_total: number
          data_compra: string
          status: string | null
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          clinica_id?: string | null
          fornecedor_id?: string | null
          descricao: string
          valor_total: number
          data_compra: string
          status?: string | null
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          clinica_id?: string | null
          fornecedor_id?: string | null
          descricao?: string
          valor_total?: number
          data_compra?: string
          status?: string | null
          user_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      notas_fiscais: {
        Row: {
          id: string
          clinica_id: string | null
          receita_id: string | null
          numero_nota: string
          valor: number
          data_emissao: string
          link_pdf: string | null
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          clinica_id?: string | null
          receita_id?: string | null
          numero_nota: string
          valor: number
          data_emissao?: string
          link_pdf?: string | null
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          clinica_id?: string | null
          receita_id?: string | null
          numero_nota?: string
          valor?: number
          data_emissao?: string
          link_pdf?: string | null
          user_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      procedimentos: {
        Row: {
          id: string
          clinica_id: string | null
          nome: string
          descricao: string | null
          valor_padrao: number | null
          created_at: string
        }
        Insert: {
          id?: string
          clinica_id?: string | null
          nome: string
          descricao?: string | null
          valor_padrao?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          clinica_id?: string | null
          nome?: string
          descricao?: string | null
          valor_padrao?: number | null
          created_at?: string
        }
        Relationships: []
      }
      procedimentos_realizados: {
        Row: {
          id: string
          clinica_id: string | null
          paciente_id: string | null
          dentista_id: string | null
          procedimento_id: string | null
          data_realizacao: string
          valor_cobrado: number | null
          comissao_gerada: number | null
          created_at: string
        }
        Insert: {
          id?: string
          clinica_id?: string | null
          paciente_id?: string | null
          dentista_id?: string | null
          procedimento_id?: string | null
          data_realizacao?: string
          valor_cobrado?: number | null
          comissao_gerada?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          clinica_id?: string | null
          paciente_id?: string | null
          dentista_id?: string | null
          procedimento_id?: string | null
          data_realizacao?: string
          valor_cobrado?: number | null
          comissao_gerada?: number | null
          created_at?: string
        }
        Relationships: []
      }
      comissoes: {
        Row: {
          id: string
          clinica_id: string | null
          procedimento_id: string | null
          dentista_id: string | null
          porcentagem: number
          created_at: string
        }
        Insert: {
          id?: string
          clinica_id?: string | null
          procedimento_id?: string | null
          dentista_id?: string | null
          porcentagem: number
          created_at?: string
        }
        Update: {
          id?: string
          clinica_id?: string | null
          procedimento_id?: string | null
          dentista_id?: string | null
          porcentagem?: number
          created_at?: string
        }
        Relationships: []
      }
      estoque: {
        Row: {
          id: string
          clinica_id: string | null
          nome: string
          descricao: string | null
          quantidade: number | null
          unidade: string | null
          minimo: number | null
          created_at: string
        }
        Insert: {
          id?: string
          clinica_id?: string | null
          nome: string
          descricao?: string | null
          quantidade?: number | null
          unidade?: string | null
          minimo?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          clinica_id?: string | null
          nome?: string
          descricao?: string | null
          quantidade?: number | null
          unidade?: string | null
          minimo?: number | null
          created_at?: string
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          id: string
          clinica_id: string | null
          user_id: string | null
          user_nome: string | null
          action: string
          entity: string
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          clinica_id?: string | null
          user_id?: string | null
          user_nome?: string | null
          action: string
          entity: string
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          clinica_id?: string | null
          user_id?: string | null
          user_nome?: string | null
          action?: string
          entity?: string
          details?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      alertas: {
        Row: {
          id: string
          clinica_id: string | null
          user_id: string | null
          tipo: string | null
          mensagem: string | null
          read: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          clinica_id?: string | null
          user_id?: string | null
          tipo?: string | null
          mensagem?: string | null
          read?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          clinica_id?: string | null
          user_id?: string | null
          tipo?: string | null
          mensagem?: string | null
          read?: boolean | null
          created_at?: string
        }
        Relationships: []
      }
      evolucao: {
        Row: {
          id: string
          clinica_id: string | null
          paciente_id: string | null
          dentista_id: string | null
          descricao: string
          data_evolucao: string
          created_at: string
        }
        Insert: {
          id?: string
          clinica_id?: string | null
          paciente_id?: string | null
          dentista_id?: string | null
          descricao: string
          data_evolucao?: string
          created_at?: string
        }
        Update: {
          id?: string
          clinica_id?: string | null
          paciente_id?: string | null
          dentista_id?: string | null
          descricao?: string
          data_evolucao?: string
          created_at?: string
        }
        Relationships: []
      }
      cobrancas: {
        Row: {
          id: string
          clinica_id: string | null
          paciente_id: string | null
          valor: number
          descricao: string | null
          status: string | null
          created_at: string
        }
        Insert: {
          id?: string
          clinica_id?: string | null
          paciente_id?: string | null
          valor: number
          descricao?: string | null
          status?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          clinica_id?: string | null
          paciente_id?: string | null
          valor?: number
          descricao?: string | null
          status?: string | null
          created_at?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          id: string
          role_name: string
          permissions: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          role_name: string
          permissions?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          role_name?: string
          permissions?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      receituarios: {
        Row: {
          id: string
          prontuario_id: string | null
          establishment_id: string | null
          dentista_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          prontuario_id?: string | null
          establishment_id?: string | null
          dentista_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          prontuario_id?: string | null
          establishment_id?: string | null
          dentista_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      itens_receituario: {
        Row: {
          id: string
          receituario_id: string | null
          establishment_id: string | null
          medicamento_id: string | null
          posologia: string | null
          quantidade: string | null
          created_at: string
        }
        Insert: {
          id?: string
          receituario_id?: string | null
          establishment_id?: string | null
          medicamento_id?: string | null
          posologia?: string | null
          quantidade?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          receituario_id?: string | null
          establishment_id?: string | null
          medicamento_id?: string | null
          posologia?: string | null
          quantidade?: string | null
          created_at?: string
        }
        Relationships: []
      }
      termos_privacidade: {
        Row: {
          id: string
          clinica_id: string
          tipo: 'LGPD' | 'TCLE' | 'TCLE_MENOR'
          versao: string
          texto_hash: string
          publicado_em: string
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          clinica_id?: string
          tipo: 'LGPD' | 'TCLE' | 'TCLE_MENOR'
          versao: string
          texto_hash: string
          publicado_em?: string
          ativo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          clinica_id?: string
          tipo?: 'LGPD' | 'TCLE' | 'TCLE_MENOR'
          versao?: string
          texto_hash?: string
          publicado_em?: string
          ativo?: boolean
          created_at?: string
        }
        Relationships: []
      }
      paciente_consentimentos: {
        Row: {
          id: string
          paciente_id: string
          clinica_id: string
          termo_id: string
          status: 'ativo' | 'revogado' | 'expirado' | 'pendente'
          manifestado_em: string | null
          revogado_em: string | null
          meio: 'eletronico_interno' | 'upload_legado' | 'email_confirmado' | 'whatsapp_confirmado'
          responsavel_nome: string | null
          responsavel_tipo: 'proprio_paciente' | 'pai_mae' | 'tutor_legal' | 'curador'
          registrado_por_user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          paciente_id: string
          clinica_id?: string
          termo_id: string
          status?: 'ativo' | 'revogado' | 'expirado' | 'pendente'
          manifestado_em?: string | null
          revogado_em?: string | null
          meio?: 'eletronico_interno' | 'upload_legado' | 'email_confirmado' | 'whatsapp_confirmado'
          responsavel_nome?: string | null
          responsavel_tipo?: 'proprio_paciente' | 'pai_mae' | 'tutor_legal' | 'curador'
          registrado_por_user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          paciente_id?: string
          clinica_id?: string
          termo_id?: string
          status?: 'ativo' | 'revogado' | 'expirado' | 'pendente'
          manifestado_em?: string | null
          revogado_em?: string | null
          meio?: 'eletronico_interno' | 'upload_legado' | 'email_confirmado' | 'whatsapp_confirmado'
          responsavel_nome?: string | null
          responsavel_tipo?: 'proprio_paciente' | 'pai_mae' | 'tutor_legal' | 'curador'
          registrado_por_user_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      consentimento_finalidades: {
        Row: {
          id: string
          paciente_consentimento_id: string
          clinica_id: string
          finalidade: string
          autorizado: boolean
          created_at: string
        }
        Insert: {
          id?: string
          paciente_consentimento_id: string
          clinica_id?: string
          finalidade: string
          autorizado?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          paciente_consentimento_id?: string
          clinica_id?: string
          finalidade?: string
          autorizado?: boolean
          created_at?: string
        }
        Relationships: []
      }
      consentimento_evidencias: {
        Row: {
          id: string
          paciente_consentimento_id: string
          clinica_id: string
          tipo: string
          storage_path: string | null
          hash_sha256: string | null
          ip: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          paciente_consentimento_id: string
          clinica_id?: string
          tipo: string
          storage_path?: string | null
          hash_sha256?: string | null
          ip?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          paciente_consentimento_id?: string
          clinica_id?: string
          tipo?: string
          storage_path?: string | null
          hash_sha256?: string | null
          ip?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_fluxo_caixa: {
        Row: {
          total_receitas: number | null
          total_despesas: number | null
          saldo_liquido: number | null
        }
        Relationships: []
      }
      vw_conformidade_consentimentos: {
        Row: {
          paciente_id: string | null
          paciente_nome: string | null
          clinica_id: string | null
          tipo_termo: 'LGPD' | 'TCLE' | 'TCLE_MENOR' | null
          versao_termo: string | null
          consentimento_id: string | null
          status: 'ativo' | 'revogado' | 'expirado' | 'pendente' | null
          manifestado_em: string | null
          revogado_em: string | null
          meio: 'eletronico_interno' | 'upload_legado' | 'email_confirmado' | 'whatsapp_confirmado' | null
          responsavel_nome: string | null
          responsavel_tipo: 'proprio_paciente' | 'pai_mae' | 'tutor_legal' | 'curador' | null
          finalidades: Record<string, boolean> | null
          possui_evidencia: boolean | null
          registrado_em: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_my_clinica_id: {
        Args: Record<string, never>
        Returns: string
      }
      get_my_role: {
        Args: Record<string, never>
        Returns: string
      }
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      registrar_revogacao_consentimento: {
        Args: {
          p_paciente_consentimento_id: string
        }
        Returns: void
      }
    }
    Enums: {
      user_role: UserRole
      tipo_termo: 'LGPD' | 'TCLE' | 'TCLE_MENOR'
      meio_consentimento: 'eletronico_interno' | 'upload_legado' | 'email_confirmado' | 'whatsapp_confirmado'
      status_consentimento: 'ativo' | 'revogado' | 'expirado' | 'pendente'
      status_prontuario: 'registrada' | 'retificada' | 'cancelada'
      tipo_responsavel: 'proprio_paciente' | 'pai_mae' | 'tutor_legal' | 'curador'
    }
    CompositeTypes: Record<string, never>
  }
}
