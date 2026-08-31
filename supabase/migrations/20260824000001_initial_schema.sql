-- ==============================================================================
-- Migration: 20260824000001_initial_schema.sql
-- Description: Schema inicial do OdontoSoft (Tabelas base, enums e constraints)
-- ==============================================================================

-- 1. Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'dentista', 'recepcao', 'financeiro');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Tabela de Perfis de Usuário
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT,
    role user_role NOT NULL DEFAULT 'dentista',
    especialidade TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabela de Pacientes
CREATE TABLE IF NOT EXISTS public.pacientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    nome TEXT NOT NULL,
    cpf TEXT,
    rg TEXT,
    data_nascimento DATE,
    genero TEXT,
    telefone TEXT,
    whatsapp BOOLEAN DEFAULT false,
    email TEXT,
    cep TEXT,
    rua TEXT,
    numero TEXT,
    bairro TEXT,
    cidade TEXT,
    endereco TEXT,
    convenio TEXT,
    lgpd_aceite BOOLEAN DEFAULT false,
    lgpd_aceite_em TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tabela de Agendamentos
CREATE TABLE IF NOT EXISTS public.agendamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE,
    dentista_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    data_consulta DATE NOT NULL,
    hora_consulta TIME NOT NULL,
    hora_fim TIME,
    procedimento TEXT,
    observacoes TEXT,
    status TEXT NOT NULL DEFAULT 'agendado',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Tabela de Prontuários
CREATE TABLE IF NOT EXISTS public.prontuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE,
    dentista_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    descricao TEXT NOT NULL,
    tratamento TEXT,
    data_registro TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Tabela de Procedimentos e Catálogo
CREATE TABLE IF NOT EXISTS public.procedimentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    valor_padrao NUMERIC(10, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Procedimentos Realizados (Produção Clínica)
CREATE TABLE IF NOT EXISTS public.procedimentos_realizados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE,
    dentista_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    procedimento_id UUID REFERENCES public.procedimentos(id) ON DELETE SET NULL,
    data_realizacao TIMESTAMPTZ NOT NULL DEFAULT now(),
    valor_cobrado NUMERIC(10, 2),
    comissao_gerada NUMERIC(10, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Tabela de Regras de Comissões
CREATE TABLE IF NOT EXISTS public.comissoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    procedimento_id UUID REFERENCES public.procedimentos(id) ON DELETE CASCADE,
    dentista_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    porcentagem NUMERIC(5, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT comissoes_proc_dent_unique UNIQUE(procedimento_id, dentista_id)
);

-- 9. Financeiro: Despesas, Fornecedores, Compras e Cobranças
CREATE TABLE IF NOT EXISTS public.fornecedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    cnpj TEXT,
    telefone TEXT,
    email TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.compras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
    descricao TEXT NOT NULL,
    valor_total NUMERIC(10, 2) NOT NULL,
    data_compra DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'pendente',
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.despesas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    descricao TEXT NOT NULL,
    valor NUMERIC(10, 2) NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    status TEXT DEFAULT 'pendente',
    categoria TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cobrancas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE,
    valor NUMERIC(10, 2) NOT NULL,
    descricao TEXT,
    status TEXT DEFAULT 'pendente',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Tabela de Estoque
CREATE TABLE IF NOT EXISTS public.estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    quantidade NUMERIC(10, 2) DEFAULT 0,
    unidade TEXT DEFAULT 'un',
    minimo NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Tabela de Roles e Permissões Customizadas
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name TEXT UNIQUE NOT NULL,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
