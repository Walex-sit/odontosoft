-- ==============================================================================
-- Migration: 20261027000001_enforce_admin_clinica_on_register.sql
-- Description:
--  Substitui o UPDATE por um UPSERT (INSERT ... ON CONFLICT DO UPDATE) dentro
--  de provisionar_novo_tenant() para garantir que:
--    1. O perfil e sempre criado/actualizado com role = 'admin_clinica'.
--    2. Qualquer perfil pre-existente com role diferente e corrigido.
--    3. O SECURITY DEFINER garante que isto funciona mesmo com RLS activo.
--
--  Tambem adiciona 'admin_clinica' a tabela de permissoes padrao (roles),
--  para que getRolePermissions() devolva configuracoes: true sem consultar
--  o banco quando nao houver override.
-- ==============================================================================

-- 1. Substituicao segura de provisionar_novo_tenant() -------------------------

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
    v_clean_nome := COALESCE(NULLIF(trim(p_nome_clinica), ''), 'Minha Clinica');

    -- Criacao da Clinica
    INSERT INTO public.clinicas (
        id, nome, plano, status_assinatura,
        stripe_customer_id, stripe_subscription_id, plano_preco_id, ativo
    ) VALUES (
        v_clinica_id, v_clean_nome,
        COALESCE(p_plano, 'profissional'), 'ativo',
        p_stripe_customer_id, p_stripe_subscription_id, p_plano_preco_id, true
    );

    -- Configuracoes iniciais com upsert
    INSERT INTO public.clinica_settings (clinica_id, nome, nome_exibido)
    VALUES (v_clinica_id, v_clean_nome, v_clean_nome)
    ON CONFLICT (clinica_id) DO UPDATE
        SET nome = EXCLUDED.nome, nome_exibido = EXCLUDED.nome_exibido;

    -- CORRECCAO CRITICA: UPSERT em vez de UPDATE simples
    INSERT INTO public.user_profiles (id, clinica_id, role)
    VALUES (p_user_id, v_clinica_id, 'admin_clinica')
    ON CONFLICT (id) DO UPDATE
        SET clinica_id = EXCLUDED.clinica_id,
            role       = 'admin_clinica';

    RETURN v_clinica_id;
END;
$$;

COMMENT ON FUNCTION public.provisionar_novo_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) IS
    'Provisiona nova clinica exclusiva (UUID unico). Usa UPSERT em user_profiles para garantir role=admin_clinica independentemente do estado anterior do perfil.';

-- 2. Seed de permissoes padrao para admin_clinica na tabela roles
INSERT INTO public.roles (role_name, permissions)
VALUES (
    'admin_clinica',
    '{"agenda": true, "pacientes": true, "financeiro": true, "configuracoes": true}'::jsonb
)
ON CONFLICT (role_name) DO UPDATE
    SET permissions = jsonb_set(
        COALESCE(public.roles.permissions, '{}'::jsonb),
        '{configuracoes}',
        'true'::jsonb
    );
