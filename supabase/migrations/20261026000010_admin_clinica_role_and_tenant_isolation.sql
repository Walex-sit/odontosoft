-- ==============================================================================
-- Migration: 20261026000010_admin_clinica_role_and_tenant_isolation.sql
-- Description:
--  1. Adiciona o papel 'admin_clinica' ao enum user_role (se aplicável).
--  2. Atualiza a função public.is_admin() para reconhecer 'admin_clinica'.
--  3. Atualiza public.provisionar_novo_tenant() para gerar UUID exclusivo,
--     nome inicial limpo ('Minha Clínica') e vincular como 'admin_clinica'.
-- ==============================================================================

-- 1. Expansão de Role (admin_clinica)
DO $$
BEGIN
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin_clinica';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_object THEN null;
END $$;

-- 2. Atualização de public.is_admin() para suporte a 'admin_clinica'
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.user_profiles 
        WHERE id = auth.uid() AND (role::text = 'admin' OR role::text = 'admin_clinica')
    );
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

-- 3. Atualização de public.provisionar_novo_tenant()
CREATE OR REPLACE FUNCTION public.provisionar_novo_tenant(
    p_user_id                UUID,
    p_nome_clinica           TEXT,
    p_plano                  TEXT DEFAULT 'profissional',
    p_stripe_customer_id     TEXT DEFAULT NULL,
    p_stripe_subscription_id TEXT DEFAULT NULL,
    p_plano_preco_id         TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clinica_id UUID := gen_random_uuid();
    v_clean_nome TEXT;
BEGIN
    v_clean_nome := COALESCE(NULLIF(trim(p_nome_clinica), ''), 'Minha Clínica');

    -- Criação da Clínica com UUID exclusivo e isolado (nunca 'dentalmedic')
    INSERT INTO public.clinicas (
        id,
        nome,
        plano,
        status_assinatura,
        stripe_customer_id,
        stripe_subscription_id,
        plano_preco_id,
        ativo
    ) VALUES (
        v_clinica_id,
        v_clean_nome,
        COALESCE(p_plano, 'profissional'),
        'ativo',
        p_stripe_customer_id,
        p_stripe_subscription_id,
        p_plano_preco_id,
        true
    );

    -- Criação de configurações iniciais da clínica
    INSERT INTO public.clinica_settings (
        clinica_id,
        nome,
        nome_exibido
    ) VALUES (
        v_clinica_id,
        v_clean_nome,
        v_clean_nome
    );

    -- Vinculação obrigatória do usuário como admin_clinica da nova clínica
    UPDATE public.user_profiles
    SET
        clinica_id = v_clinica_id,
        role       = 'admin_clinica'
    WHERE id = p_user_id;

    RETURN v_clinica_id;
END;
$$;

COMMENT ON FUNCTION public.provisionar_novo_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) IS
    'Provisiona uma nova clínica exclusiva e limpa com UUID único, atribuindo a role admin_clinica ao usuário.';
