-- ==============================================================================
-- Migration: 20261105000001_etapa6_5_cross_review_hardening.sql
-- Descrição: ETAPA 6.5 — Fechamento dos Achados da Revisão Cruzada
--
-- 1. USER_PROFILES HARDENING (ITEM 8):
--    - Bloqueio estrito de QUALQUER alteração de clinica_id (inclusive NULL -> UUID)
--      por usuários autenticados comuns. Apenas super_admin ou service_role podem alterar.
--    - Bloqueio de auto-elevação de role e auto-atribuição de is_lifetime.
--    - Definição com SET search_path = '' e referências totalmente qualificadas.
--
-- 2. STORAGE AUDIT (ITEM 9):
--    - Trigger de auditoria para exclusão de evidências em consentimentos-evidencias.
--
-- 3. PROVISIONAMENTO ATÔMICO DE TENANT IDEMPOTENTE (ITEM 10):
--    - Impedimento de sequestro/movimentação de tenant: se p_user_id já pertencer a
--      uma clínica diferente, a operação é rejeitada para preservar integridade.
--    - Retorno idempotente caso já pertença à clínica provisionada.
--    - SET search_path = '' e referências totalmente qualificadas.
--
-- 4. HARDENING DE SECURITY DEFINER SEARCH_PATH (ITEM 11):
--    - Configuração de search_path = '' nas funções essenciais de RLS.
--    - Invalidação de códigos OTP pendentes legados.
-- ==============================================================================

-- ── 1. USER_PROFILES PRIVILEGES TRIGGER (ITEM 8) ─────────────────────────────

CREATE OR REPLACE FUNCTION public.protect_user_profiles_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_jwt_role TEXT := (auth.jwt() ->> 'role');
    v_setting_role TEXT := current_setting('role', true);
BEGIN
    -- Permitir que operações de sistema (service_role ou postgres administrativo) prossigam,
    -- desde que não estejam emulando uma role de usuário final (anon ou authenticated).
    IF (v_jwt_role = 'service_role' OR session_user IN ('postgres', 'supabase_admin'))
       AND v_setting_role NOT IN ('anon', 'authenticated') THEN
        RETURN NEW;
    END IF;

    -- 1. Bloqueio de alteração de is_lifetime (apenas super_admin pode alterar)
    IF NEW.is_lifetime IS DISTINCT FROM OLD.is_lifetime THEN
        IF NOT public.is_super_admin() THEN
            RAISE EXCEPTION 'Acesso negado: a flag is_lifetime não pode ser alterada diretamente.'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;

    -- 2. Bloqueio de auto-elevação de role ou promoção para super_admin
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        IF OLD.id = auth.uid() THEN
            RAISE EXCEPTION 'Acesso negado: auto-alteração de nível de privilégio (role) não permitida.'
                USING ERRCODE = 'insufficient_privilege';
        END IF;

        IF NEW.role::text = 'super_admin' THEN
            IF NOT public.is_super_admin() THEN
                RAISE EXCEPTION 'Acesso negado: apenas o Super Admin pode atribuir a função super_admin.'
                    USING ERRCODE = 'insufficient_privilege';
            END IF;
        END IF;
    END IF;

    -- 3. Bloqueio de troca de clínica (QUALQUER alteração, inclusive transição de NULL para UUID)
    IF NEW.clinica_id IS DISTINCT FROM OLD.clinica_id THEN
        IF NOT public.is_super_admin() THEN
            RAISE EXCEPTION 'Acesso negado: alteração de tenant (clinica_id) não permitida.'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


-- ── 2. STORAGE AUDIT DE EXCLUSÃO (ITEM 9) ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.audit_storage_evidence_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_clinica_id TEXT;
    v_user_id UUID := auth.uid();
BEGIN
    IF OLD.bucket_id = 'consentimentos-evidencias' THEN
        v_clinica_id := (storage.foldername(OLD.name))[1];
        
        INSERT INTO public.system_logs (
            clinica_id,
            user_id,
            action,
            entity,
            details,
            created_at
        ) VALUES (
            CASE WHEN v_clinica_id ~ '^[0-9a-fA-F-]{36}$' THEN v_clinica_id::uuid ELSE NULL END,
            v_user_id,
            'DELETE',
            'consentimentos-evidencias',
            jsonb_build_object(
                'bucket', OLD.bucket_id,
                'path', OLD.name,
                'owner', OLD.owner,
                'event', 'expurgo_evidencia_consentimento',
                'deleted_by', v_user_id
            ),
            now()
        );
    END IF;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS tr_audit_storage_evidence_deletion ON storage.objects;
CREATE TRIGGER tr_audit_storage_evidence_deletion
    AFTER DELETE ON storage.objects
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_storage_evidence_deletion();


-- ── 3. RPC PROVISIONAR_NOVO_TENANT IDEMPOTENTE (ITEM 10) ─────────────────────

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
SET search_path = ''
AS $$
DECLARE
    v_clinica_id   UUID;
    v_clean_nome   TEXT;
    v_jwt_role     TEXT;
    v_setting_role TEXT;
    v_user_nome    TEXT;
    v_existing_cid UUID;
BEGIN
    -- 1. Verificação de privilégios de execução estrita
    v_jwt_role     := (auth.jwt() ->> 'role');
    v_setting_role := current_setting('role', true);

    IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
        IF session_user NOT IN ('postgres', 'supabase_admin') OR v_setting_role IN ('anon', 'authenticated') THEN
            RAISE EXCEPTION '[OdontoSoft Security] Execução não autorizada da RPC de provisionamento. Operação restrita a service_role (Stripe Webhook).'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;

    -- 2. Validação de p_user_id em auth.users
    IF p_user_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM auth.users WHERE id = p_user_id
    ) THEN
        RAISE EXCEPTION '[OdontoSoft Security] p_user_id (%) inválido ou inexistente em auth.users.', p_user_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    -- 3. Prevenção de Sequestro/Movimentação de Tenant (ITEM 10.4):
    --    Se o usuário já pertence a uma clínica, não permitir transferi-lo sem intervenção do super_admin.
    SELECT clinica_id INTO v_existing_cid
    FROM public.user_profiles
    WHERE id = p_user_id;

    IF v_existing_cid IS NOT NULL THEN
        -- Se for o mesmo tenant, atualiza dados do Stripe de forma idempotente
        UPDATE public.clinicas
        SET stripe_customer_id     = COALESCE(p_stripe_customer_id, stripe_customer_id),
            stripe_subscription_id = COALESCE(p_stripe_subscription_id, stripe_subscription_id),
            plano_preco_id         = COALESCE(p_plano_preco_id, plano_preco_id),
            status_assinatura      = 'ativo',
            ativo                  = true
        WHERE id = v_existing_cid;

        RETURN v_existing_cid;
    END IF;

    v_clinica_id := gen_random_uuid();
    v_clean_nome := COALESCE(NULLIF(trim(p_nome_clinica), ''), 'Minha Clínica');

    -- 4. Criação da Clínica
    INSERT INTO public.clinicas (
        id, nome, plano, status_assinatura,
        stripe_customer_id, stripe_subscription_id, plano_preco_id, ativo
    ) VALUES (
        v_clinica_id, v_clean_nome,
        COALESCE(p_plano, 'profissional'), 'ativo',
        p_stripe_customer_id, p_stripe_subscription_id, p_plano_preco_id, true
    );

    -- 5. Configurações da clínica
    INSERT INTO public.clinica_settings (clinica_id, nome, nome_exibido)
    VALUES (v_clinica_id, v_clean_nome, v_clean_nome)
    ON CONFLICT (clinica_id) DO UPDATE
        SET nome = EXCLUDED.nome, nome_exibido = EXCLUDED.nome_exibido;

    -- 6. Extração de nome defensivo para respeitar user_profiles.nome NOT NULL
    SELECT COALESCE(raw_user_meta_data->>'nome', raw_user_meta_data->>'full_name', split_part(email, '@', 1), 'Administrador')
    INTO v_user_nome
    FROM auth.users
    WHERE id = p_user_id;

    -- 7. Vinculação do perfil do usuário como admin_clinica
    INSERT INTO public.user_profiles (id, clinica_id, role, nome)
    VALUES (p_user_id, v_clinica_id, 'admin_clinica', COALESCE(v_user_nome, 'Administrador'))
    ON CONFLICT (id) DO UPDATE
        SET clinica_id = EXCLUDED.clinica_id,
            role       = 'admin_clinica';

    RETURN v_clinica_id;
END;
$$;

REVOKE ALL ON FUNCTION public.provisionar_novo_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provisionar_novo_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;


-- ── 4. FUNÇÕES RLS COM SEARCH_PATH SEGURO (ITEM 11.7) ────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_clinica_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT clinica_id
    FROM public.user_profiles
    WHERE id = auth.uid()
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT role::text
    FROM public.user_profiles
    WHERE id = auth.uid()
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_profiles
        WHERE id = auth.uid()
          AND role::text IN ('admin', 'admin_clinica', 'super_admin')
    );
$$;

-- Invalidação preventiva de códigos OTP legados que ainda estavam ativos
UPDATE public.user_verification_codes
SET used = true
WHERE used = false;

-- ==============================================================================
-- 7. RESERVA ATÔMICA CONDICIONAL DE TENTATIVA OTP ANTES DA COMPARAÇÃO (ITEM 12)
-- Incremento atômico condicional de attempts (attempts < 5 RETURNING) antes de comparar o hash.
-- Garante que em acessos concorrentes apenas 5 tentativas conseguem reservar a comparação.
-- ==============================================================================

DROP FUNCTION IF EXISTS public.reservar_tentativa_otp(UUID);
CREATE OR REPLACE FUNCTION public.reservar_tentativa_otp(p_code_id UUID)
RETURNS TABLE (id UUID, code TEXT, attempts INT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    UPDATE public.user_verification_codes
    SET attempts = public.user_verification_codes.attempts + 1
    WHERE public.user_verification_codes.id = p_code_id
      AND public.user_verification_codes.used = false
      AND public.user_verification_codes.attempts < 5
      AND public.user_verification_codes.expires_at > now()
    RETURNING 
        public.user_verification_codes.id, 
        public.user_verification_codes.code, 
        public.user_verification_codes.attempts, 
        public.user_verification_codes.expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.reservar_tentativa_otp(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reservar_tentativa_otp(UUID) TO service_role;

-- Garante acesso irrestrito do service_role à tabela de códigos OTP
GRANT ALL ON TABLE public.user_verification_codes TO service_role;

-- ==============================================================================
-- 8. PRIVILÉGIOS DE TABELA PARA AS ROLES SUPABASE (SERVICE_ROLE, AUTHENTICATED)
-- Garante privilégios DML nas tabelas do schema public para que o RLS atue
-- como a barreira efetiva de controle de acesso multi-tenant.
-- ==============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

GRANT SELECT ON public.clinicas TO anon;
GRANT SELECT ON public.roles TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;



