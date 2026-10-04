-- ==============================================================================
-- Migration: 20260824000003_multitenant_rls_security.sql
-- Description: Multi-Tenancy nativo via clinica_id, RLS, Funções de Segurança e Triggers
-- ==============================================================================

-- 1. Tabela Principal de Clínicas (Tenants)
CREATE TABLE IF NOT EXISTS public.clinicas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    cnpj TEXT UNIQUE,
    telefone TEXT,
    email TEXT,
    endereco TEXT,
    plano TEXT NOT NULL DEFAULT 'profissional' CHECK (plano IN ('basico', 'profissional', 'enterprise')),
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Adiciona clinica_id em todas as tabelas de domínio
DO $$ BEGIN
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES public.clinicas(id) ON DELETE RESTRICT;
    ALTER TABLE public.clinica_settings ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE;
    ALTER TABLE public.pacientes ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE;
    ALTER TABLE public.agendamentos ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE;
    ALTER TABLE public.prontuarios ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE;
    ALTER TABLE public.receitas ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE;
    ALTER TABLE public.receita_itens ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE;
    ALTER TABLE public.atestados ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE;
    ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE;
    ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE;
    ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE;
    ALTER TABLE public.procedimentos ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE;
    ALTER TABLE public.procedimentos_realizados ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE;
    ALTER TABLE public.comissoes ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE;
    ALTER TABLE public.estoque ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE;
    ALTER TABLE public.cobrancas ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE;
END $$;

-- 3. Funções de Contexto e Segurança (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_my_clinica_id()
RETURNS UUID AS $$
    SELECT clinica_id 
    FROM public.user_profiles 
    WHERE id = auth.uid()
    LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
    SELECT role::text 
    FROM public.user_profiles 
    WHERE id = auth.uid()
    LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

-- 4. Trigger de Auto-Preenchimento de clinica_id
CREATE OR REPLACE FUNCTION public.set_clinica_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.clinica_id IS NULL THEN
        NEW.clinica_id := public.get_my_clinica_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Associa o trigger em todas as tabelas multi-tenant
DO $$ 
DECLARE
    t text;
    tables text[] := ARRAY[
        'pacientes', 'agendamentos', 'prontuarios', 'receitas', 'receita_itens',
        'atestados', 'despesas', 'fornecedores', 'compras', 'notas_fiscais',
        'procedimentos', 'procedimentos_realizados', 'comissoes', 'estoque',
        'cobrancas', 'clinica_settings'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_set_clinica_id ON public.%I;', t);
        EXECUTE format('CREATE TRIGGER trg_set_clinica_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_clinica_id();', t);
    END LOOP;
END $$;

-- 5. Habilitar RLS em todas as tabelas
DO $$ 
DECLARE
    t text;
    tables text[] := ARRAY[
        'clinicas', 'user_profiles', 'clinica_settings', 'pacientes', 'agendamentos',
        'prontuarios', 'receitas', 'receita_itens', 'atestados', 'despesas',
        'fornecedores', 'compras', 'notas_fiscais', 'procedimentos',
        'procedimentos_realizados', 'comissoes', 'estoque', 'cobrancas', 'roles'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    END LOOP;
END $$;

-- 6. Políticas de RLS por Domínio

-- 6.1 Clínicas
DROP POLICY IF EXISTS "Usuários leem apenas sua própria clínica" ON public.clinicas;
CREATE POLICY "Usuários leem apenas sua própria clínica" ON public.clinicas
    FOR SELECT USING (id = public.get_my_clinica_id());

DROP POLICY IF EXISTS "Admins podem atualizar sua própria clínica" ON public.clinicas;
CREATE POLICY "Admins podem atualizar sua própria clínica" ON public.clinicas
    FOR UPDATE USING (id = public.get_my_clinica_id() AND public.is_admin());

-- 6.2 user_profiles
DROP POLICY IF EXISTS "Usuários visualizam membros de sua própria clínica" ON public.user_profiles;
CREATE POLICY "Usuários visualizam membros de sua própria clínica" ON public.user_profiles
    FOR SELECT USING (clinica_id = public.get_my_clinica_id() OR id = auth.uid());

DROP POLICY IF EXISTS "Usuários atualizam seu próprio perfil ou admin atualiza da clínica" ON public.user_profiles;
CREATE POLICY "Usuários atualizam seu próprio perfil ou admin atualiza da clínica" ON public.user_profiles
    FOR UPDATE USING (id = auth.uid() OR (clinica_id = public.get_my_clinica_id() AND public.is_admin()));

-- 6.3 Políticas multi-tenant para tabelas de dados
DO $$ 
DECLARE
    t text;
    tables text[] := ARRAY[
        'clinica_settings', 'pacientes', 'agendamentos', 'prontuarios', 'receitas',
        'receita_itens', 'atestados', 'despesas', 'fornecedores', 'compras',
        'notas_fiscais', 'procedimentos', 'procedimentos_realizados',
        'comissoes', 'estoque', 'cobrancas'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Tenant Select %I" ON public.%I;', t, t);
        EXECUTE format('CREATE POLICY "Tenant Select %I" ON public.%I FOR SELECT USING (clinica_id = public.get_my_clinica_id());', t, t);

        EXECUTE format('DROP POLICY IF EXISTS "Tenant Insert %I" ON public.%I;', t, t);
        EXECUTE format('CREATE POLICY "Tenant Insert %I" ON public.%I FOR INSERT WITH CHECK (clinica_id = public.get_my_clinica_id() OR clinica_id IS NULL);', t, t);

        EXECUTE format('DROP POLICY IF EXISTS "Tenant Update %I" ON public.%I;', t, t);
        EXECUTE format('CREATE POLICY "Tenant Update %I" ON public.%I FOR UPDATE USING (clinica_id = public.get_my_clinica_id());', t, t);

        EXECUTE format('DROP POLICY IF EXISTS "Tenant Delete %I" ON public.%I;', t, t);
        EXECUTE format('CREATE POLICY "Tenant Delete %I" ON public.%I FOR DELETE USING (clinica_id = public.get_my_clinica_id());', t, t);
    END LOOP;
END $$;
