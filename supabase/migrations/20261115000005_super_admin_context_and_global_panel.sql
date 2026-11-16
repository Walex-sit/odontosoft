-- ==============================================================================
-- Migration: 20261115000005_super_admin_context_and_global_panel.sql
-- Descrição: Implementação do Contexto Administrativo Dinâmico e Painel Global
--            para usuários com papel super_admin, sem alterar identidade permanente
--            (user_profiles.role permanece super_admin, user_profiles.clinica_id permanece NULL).
--
-- Regras de Segurança:
--   1. super_admin permanece imutável em user_profiles (role=super_admin, clinica_id=NULL).
--   2. O contexto administrativo é armazenado separadamente em super_admin_clinic_contexts.
--   3. get_my_clinica_id() retorna a clínica de contexto SE E SOMENTE SE o usuário autenticado
--      for super_admin e houver uma seleção ativa validada.
--   4. Usuários normais (admin_clinica, dentista, recepcao, financeiro) NUNCA têm acesso
--      ao contexto administrativo dinâmico — get_my_clinica_id() sempre retorna a clínica fixa.
--   5. Ações de entrada e saída de contexto são registradas em system_logs para auditoria.
--   6. search_path = '' em todas as funções SECURITY DEFINER.
-- ==============================================================================

-- 1. Tabela de Contexto Administrativo Seguro para Super Admin
CREATE TABLE IF NOT EXISTS public.super_admin_clinic_contexts (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
    selected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.super_admin_clinic_contexts IS
    'Armazena o contexto de clínica temporariamente selecionado por um super_admin. '
    'Isola o contexto da identidade permanente do usuário (user_profiles).';

-- Habilitar RLS estrito
ALTER TABLE public.super_admin_clinic_contexts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Apenas super_admin acessa contexto administrativo" ON public.super_admin_clinic_contexts;
CREATE POLICY "Apenas super_admin acessa contexto administrativo"
    ON public.super_admin_clinic_contexts
    FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

REVOKE ALL ON public.super_admin_clinic_contexts FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.super_admin_clinic_contexts TO authenticated, service_role;


-- 2. Atualização de get_my_clinica_id() para resolução segura de contexto
CREATE OR REPLACE FUNCTION public.get_my_clinica_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_role TEXT;
    v_profile_clinica_id UUID;
    v_context_clinica_id UUID;
BEGIN
    -- Se não houver usuário autenticado (ex: anon), retorna NULL
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;

    -- 1. Obter role e clinica_id fixos do perfil do usuário autenticado
    SELECT role::text, clinica_id INTO v_role, v_profile_clinica_id
    FROM public.user_profiles
    WHERE id = auth.uid()
    LIMIT 1;

    -- 2. Usuários comuns NUNCA utilizam contexto dinâmico:
    --    retornam estritamente o clinica_id fixo do seu user_profile
    IF v_role IS DISTINCT FROM 'super_admin' THEN
        RETURN v_profile_clinica_id;
    END IF;

    -- 3. Para o super_admin, busca a clínica contextual ativa validada no banco
    SELECT c.clinica_id INTO v_context_clinica_id
    FROM public.super_admin_clinic_contexts c
    JOIN public.clinicas cl ON cl.id = c.clinica_id
    WHERE c.user_id = auth.uid()
    LIMIT 1;

    -- Se houver contexto dinâmico ativo, ele tem precedência absoluta.
    -- Se não houver contexto ativo, recorre a v_profile_clinica_id (NULL em modo global puro, ou fallback para testes legados).
    RETURN COALESCE(v_context_clinica_id, v_profile_clinica_id);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_my_clinica_id() TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.get_my_clinica_id() IS
    'Retorna a clinica_id do usuário autenticado. '
    'Para usuários comuns: retorna user_profiles.clinica_id. '
    'Para super_admin: retorna a clínica do contexto ativo selecionado (ou NULL se em painel global).';


-- 3. Trigger set_clinica_id(): permite NULL para super_admin em tabelas onde clinica_id é opcional
CREATE OR REPLACE FUNCTION public.set_clinica_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_clinica_id uuid;
BEGIN
  IF NEW.clinica_id IS NULL THEN
    v_clinica_id := public.get_my_clinica_id();
    IF v_clinica_id IS NULL THEN
      -- Se for super_admin operando em modo global, permite prosseguir com clinica_id = NULL
      IF public.is_super_admin() THEN
        RETURN NEW;
      END IF;
      RAISE EXCEPTION 'Não foi possível determinar a clínica do usuário autenticado';
    END IF;
    NEW.clinica_id := v_clinica_id;
  END IF;
  RETURN NEW;
END;
$function$;


-- 4. RPC para Definir Contexto de Clínica (set_super_admin_context)
CREATE OR REPLACE FUNCTION public.set_super_admin_context(p_clinica_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_nome TEXT;
    v_clinica RECORD;
BEGIN
    -- 1. Validação estrita: apenas super_admin
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas o Super Admin pode selecionar contexto de clínica.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- 2. Validar existência da clínica alvo
    SELECT id, nome, status_assinatura, plano, ativo INTO v_clinica
    FROM public.clinicas
    WHERE id = p_clinica_id;

    IF v_clinica.id IS NULL THEN
        RAISE EXCEPTION 'Clínica não encontrada.'
            USING ERRCODE = 'data_exception';
    END IF;

    -- 3. Obter nome do operador super_admin para auditoria
    SELECT nome INTO v_user_nome
    FROM public.user_profiles
    WHERE id = v_user_id;

    -- 4. Registrar ou atualizar contexto administrativo seguro
    INSERT INTO public.super_admin_clinic_contexts (user_id, clinica_id, selected_at, updated_at)
    VALUES (v_user_id, p_clinica_id, now(), now())
    ON CONFLICT (user_id)
    DO UPDATE SET clinica_id = EXCLUDED.clinica_id, updated_at = now();

    -- 5. Registrar log de auditoria
    INSERT INTO public.system_logs (
        clinica_id,
        user_id,
        user_nome,
        action,
        entity,
        details,
        created_at
    ) VALUES (
        p_clinica_id,
        v_user_id,
        v_user_nome,
        'contexto_entrada',
        'super_admin_context',
        jsonb_build_object(
            'target_clinica_id', p_clinica_id,
            'target_clinica_nome', v_clinica.nome,
            'action', 'entered_clinic_context'
        ),
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'clinica_id', v_clinica.id,
        'nome', v_clinica.nome,
        'status_assinatura', v_clinica.status_assinatura,
        'plano', v_clinica.plano,
        'ativo', v_clinica.ativo
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.set_super_admin_context(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_super_admin_context(UUID) TO authenticated, service_role;


-- 5. RPC para Limpar Contexto de Clínica (clear_super_admin_context)
CREATE OR REPLACE FUNCTION public.clear_super_admin_context()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_nome TEXT;
    v_previous_clinica_id UUID;
BEGIN
    -- 1. Validação estrita: apenas super_admin
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas o Super Admin pode limpar contexto de clínica.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- 2. Identificar clínica anterior para log
    SELECT clinica_id INTO v_previous_clinica_id
    FROM public.super_admin_clinic_contexts
    WHERE user_id = v_user_id;

    SELECT nome INTO v_user_nome
    FROM public.user_profiles
    WHERE id = v_user_id;

    -- 3. Remover contexto ativo
    DELETE FROM public.super_admin_clinic_contexts
    WHERE user_id = v_user_id;

    -- 4. Registrar log de auditoria
    INSERT INTO public.system_logs (
        clinica_id,
        user_id,
        user_nome,
        action,
        entity,
        details,
        created_at
    ) VALUES (
        v_previous_clinica_id,
        v_user_id,
        v_user_nome,
        'contexto_saida',
        'super_admin_context',
        jsonb_build_object(
            'previous_clinica_id', v_previous_clinica_id,
            'action', 'exited_clinic_context'
        ),
        now()
    );

    RETURN jsonb_build_object('success', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.clear_super_admin_context() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_super_admin_context() TO authenticated, service_role;


-- 6. RPC para Consultar Contexto Ativo de Super Admin
CREATE OR REPLACE FUNCTION public.get_super_admin_context()
RETURNS TABLE (
    clinica_id UUID,
    nome TEXT,
    status_assinatura TEXT,
    plano TEXT,
    ativo BOOLEAN,
    selected_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    IF NOT public.is_super_admin() THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        cl.id AS clinica_id,
        cl.nome,
        cl.status_assinatura,
        cl.plano,
        cl.ativo,
        c.selected_at
    FROM public.super_admin_clinic_contexts c
    JOIN public.clinicas cl ON cl.id = c.clinica_id
    WHERE c.user_id = auth.uid()
    LIMIT 1;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_super_admin_context() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_super_admin_context() TO authenticated, service_role;


-- 7. Políticas de RLS Adicionais para Super Admin
-- Permite que super_admin atualize dados cadastrais de clínicas no painel global
DROP POLICY IF EXISTS "Super Admin pode atualizar clinicas" ON public.clinicas;
CREATE POLICY "Super Admin pode atualizar clinicas"
    ON public.clinicas
    FOR UPDATE
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- Permite que super_admin visualize configurações de clínicas (logos, etc.) no painel global
DROP POLICY IF EXISTS "Super Admin tem visão global de clinica_settings" ON public.clinica_settings;
CREATE POLICY "Super Admin tem visão global de clinica_settings"
    ON public.clinica_settings
    FOR SELECT
    TO authenticated
    USING (public.is_super_admin());

-- Permite que super_admin visualize logs de auditoria no painel global
DROP POLICY IF EXISTS "Super Admin tem visão global de system_logs" ON public.system_logs;
CREATE POLICY "Super Admin tem visão global de system_logs"
    ON public.system_logs
    FOR SELECT
    TO authenticated
    USING (public.is_super_admin());
