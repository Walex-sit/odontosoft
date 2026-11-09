-- ==============================================================================
-- Migration: 20261103000005_hardening_rpc_and_security_definer.sql
-- Descrição: AUD-02 e AUD-05 (Etapa 6 - Correções de Segurança de Produção)
--
-- 1. AUD-02: Revogação de privilégios públicos na RPC provisionar_novo_tenant()
--    - Revoga EXECUTE de PUBLIC, anon e authenticated.
--    - Concede EXECUTE exclusivamente à service_role (Stripe Webhooks).
--    - Adiciona verificação interna em tempo de execução para defesa em profundidade.
--
-- 2. AUD-05: Correção de search_path na função protect_user_profiles_privileges()
--    - Adiciona explicitamente SET search_path = public para eliminar risco
--      de sequestro de caminho de busca (search_path hijacking) em SECURITY DEFINER.
-- ==============================================================================

-- ── 1. HARDENING DE PROVISIONAR_NOVO_TENANT (AUD-02) ─────────────────────────

DROP FUNCTION IF EXISTS public.provisionar_novo_tenant;
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
    v_jwt_role   TEXT;
BEGIN
    -- Defesa em profundidade: rejeita qualquer invocação que não venha de service_role ou postgres
    v_jwt_role := (auth.jwt() ->> 'role');
    IF v_jwt_role IS DISTINCT FROM 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
        RAISE EXCEPTION '[OdontoSoft Security] Execução não autorizada da RPC de provisionamento. Operação restrita a service_role (Stripe Webhook).'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    v_clean_nome := COALESCE(NULLIF(trim(p_nome_clinica), ''), 'Minha Clínica');

    -- Criação da Clínica com status ativo legítimo emitido pelo Stripe
    INSERT INTO public.clinicas (
        id, nome, plano, status_assinatura,
        stripe_customer_id, stripe_subscription_id, plano_preco_id, ativo
    ) VALUES (
        v_clinica_id, v_clean_nome,
        COALESCE(p_plano, 'profissional'), 'ativo',
        p_stripe_customer_id, p_stripe_subscription_id, p_plano_preco_id, true
    );

    -- Configurações iniciais com upsert
    INSERT INTO public.clinica_settings (clinica_id, nome, nome_exibido)
    VALUES (v_clinica_id, v_clean_nome, v_clean_nome)
    ON CONFLICT (clinica_id) DO UPDATE
        SET nome = EXCLUDED.nome, nome_exibido = EXCLUDED.nome_exibido;

    -- Vinculação segura do perfil do usuário como admin_clinica
    INSERT INTO public.user_profiles (id, clinica_id, role)
    VALUES (p_user_id, v_clinica_id, 'admin_clinica')
    ON CONFLICT (id) DO UPDATE
        SET clinica_id = EXCLUDED.clinica_id,
            role       = 'admin_clinica';

    RETURN v_clinica_id;
END;
$$;

-- Revogação estrita de execução: fecha brecha de criação gratuita de tenants
REVOKE ALL ON FUNCTION public.provisionar_novo_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provisionar_novo_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.provisionar_novo_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) IS
    'Provisiona novo tenant B2B após pagamento no Stripe. Execução restrita estritamente a service_role (AUD-02).';


-- ── 2. CORREÇÃO DE SEARCH_PATH EM PROTECT_USER_PROFILES_PRIVILEGES (AUD-05) ──

CREATE OR REPLACE FUNCTION public.protect_user_profiles_privileges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Permitir que operações do sistema (service_role ou supabaseAdmin) prossigam
    IF (auth.jwt() ->> 'role') = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- 1. Bloqueio de alteração de is_lifetime por usuários autenticados normais
    IF NEW.is_lifetime IS DISTINCT FROM OLD.is_lifetime THEN
        RAISE EXCEPTION 'Acesso negado: a flag is_lifetime não pode ser alterada diretamente.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- 2. Bloqueio de auto-elevação de role ou promoção para super_admin
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        -- Nenhum usuário comum pode se auto-promover para outro papel
        IF OLD.id = auth.uid() AND OLD.role::text != 'super_admin' THEN
            RAISE EXCEPTION 'Acesso negado: auto-alteração de nível de privilégio (role) não permitida.'
                USING ERRCODE = 'insufficient_privilege';
        END IF;

        -- Apenas super_admin pode atribuir o papel super_admin
        IF NEW.role::text = 'super_admin' THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.user_profiles
                WHERE id = auth.uid() AND role::text = 'super_admin'
            ) THEN
                RAISE EXCEPTION 'Acesso negado: apenas o Super Admin pode atribuir a função super_admin.'
                    USING ERRCODE = 'insufficient_privilege';
            END IF;
        END IF;
    END IF;

    -- 3. Bloqueio de troca de clínica não autorizada
    IF NEW.clinica_id IS DISTINCT FROM OLD.clinica_id AND OLD.clinica_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role::text = 'super_admin'
        ) THEN
            RAISE EXCEPTION 'Acesso negado: alteração de tenant (clinica_id) não permitida.'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.protect_user_profiles_privileges() IS
    'Protege campos sensíveis de autorização e tenant em user_profiles com search_path seguro (AUD-05).';

-- Garantir trigger ativo
DROP TRIGGER IF EXISTS tr_protect_user_profiles_privileges ON public.user_profiles;
CREATE TRIGGER tr_protect_user_profiles_privileges
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_user_profiles_privileges();
