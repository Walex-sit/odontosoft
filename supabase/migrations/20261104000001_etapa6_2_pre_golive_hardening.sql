-- ==============================================================================
-- Migration: 20261104000001_etapa6_2_pre_golive_hardening.sql
-- Descrição: ETAPA 6.2/6.3 — Bloqueadores Pré-Go-Live e Hardening de Segurança
--
-- 1. OTP-01 / OTP Hash:
--    - Adição de coluna code_hash em public.user_verification_codes.
--    - Criação de índice para otimização de busca por hash.
--
-- 2. CLINICA_SETTINGS:
--    - Adição de constraint UNIQUE em clinica_id para viabilizar ON CONFLICT.
--
-- 3. RPC-02:
--    - Validação estrita de p_user_id contra auth.users em provisionar_novo_tenant().
--    - Verificação de privilégios de execução estrita a service_role e administrativo local.
--    - Eliminação de bypass baseado em current_user (utiliza session_user e role setting).
--    - Fallback resiliente para user_profiles.nome NOT NULL.
--    - Revogação de acesso de PUBLIC, anon e authenticated.
--
-- 4. USER_PROFILES RLS:
--    - Eliminação de recursão infinita (infinite recursion) na política de super_admin
--      utilizando a função SECURITY DEFINER is_super_admin().
--    - Defesa em protect_user_profiles_privileges para operações administrativas.
--
-- 5. STORAGE-01:
--    - Correção de roles na política DELETE do bucket consentimentos-evidencias.
--    - Remoção da role inexistente 'admin' e consolidação de 'admin_clinica' e 'super_admin'.
--    - Preservação da imutabilidade das evidências de consentimento (sem UPDATE).
-- ==============================================================================

-- ── 1. SUPORTE A HASH E ATOMICIDADE EM USER_VERIFICATION_CODES (OTP-01 / OTP-02) ───

ALTER TABLE public.user_verification_codes
    ADD COLUMN IF NOT EXISTS code_hash TEXT;

COMMENT ON COLUMN public.user_verification_codes.code_hash IS
    'Hash HMAC-SHA256 do código OTP para prevenção de leitura direta em caso de vazamento.';

CREATE INDEX IF NOT EXISTS idx_user_verification_codes_hash
    ON public.user_verification_codes (email, code_hash, used, expires_at);

-- Prevenção de múltiplos códigos ativos e mitigação de race condition
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_verification_codes_single_active 
    ON public.user_verification_codes (email) 
    WHERE (used = false);

-- Função atômica transacional para solicitação de OTP com cooldown garantido no PostgreSQL
CREATE OR REPLACE FUNCTION public.solicitar_codigo_otp(
    p_email      TEXT,
    p_code_hash  TEXT,
    p_expires_at TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_clean_email TEXT := lower(trim(p_email));
    v_recent_id   UUID;
    v_new_id      UUID;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext(v_clean_email));

    SELECT id INTO v_recent_id
    FROM public.user_verification_codes
    WHERE email = v_clean_email
      AND created_at > (now() - INTERVAL '60 seconds')
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_recent_id IS NOT NULL THEN
        RAISE EXCEPTION 'Aguarde 60 segundos antes de solicitar um novo código de confirmação.'
            USING ERRCODE = 'check_violation';
    END IF;

    UPDATE public.user_verification_codes
    SET used = true
    WHERE email = v_clean_email
      AND used = false;

    INSERT INTO public.user_verification_codes (
        email, code, code_hash, expires_at, used, attempts
    ) VALUES (
        v_clean_email, p_code_hash, p_code_hash, p_expires_at, false, 0
    )
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$;

-- Função atômica para incremento seguro de tentativas no PostgreSQL
CREATE OR REPLACE FUNCTION public.incrementar_tentativa_otp(p_code_id UUID)
RETURNS TABLE (new_attempts INT, is_blocked BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    UPDATE public.user_verification_codes
    SET attempts = attempts + 1,
        used = CASE WHEN attempts + 1 >= 5 THEN true ELSE used END
    WHERE id = p_code_id
    RETURNING attempts, (attempts >= 5);
END;
$$;

REVOKE ALL ON FUNCTION public.solicitar_codigo_otp(TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.solicitar_codigo_otp(TEXT, TEXT, TIMESTAMPTZ) TO service_role;

REVOKE ALL ON FUNCTION public.incrementar_tentativa_otp(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.incrementar_tentativa_otp(UUID) TO service_role;


-- ── 2. CONSTRAINT UNIQUE EM CLINICA_SETTINGS (SUPORTE A UPSERT/ON CONFLICT) ───

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'clinica_settings_clinica_id_unique'
    ) THEN
        -- Deduplicação preventiva mantendo o registro mais recentemente atualizado
        DELETE FROM public.clinica_settings a
        USING public.clinica_settings b
        WHERE a.clinica_id = b.clinica_id
          AND a.id <> b.id
          AND (a.updated_at < b.updated_at OR (a.updated_at = b.updated_at AND a.id < b.id));

        ALTER TABLE public.clinica_settings
            ADD CONSTRAINT clinica_settings_clinica_id_unique UNIQUE (clinica_id);
    END IF;
END $$;


-- ── 3. CORREÇÃO DE POLÍTICA RLS EM USER_PROFILES (ANTI-RECURSÃO INFINITA) ─────

DO $$ 
DECLARE 
    p RECORD; 
BEGIN 
    FOR p IN SELECT polname FROM pg_policy 
             WHERE polrelid = 'public.user_profiles'::regclass 
               AND polname LIKE '%Super Admin tem vis%' 
    LOOP 
        EXECUTE format('DROP POLICY %I ON public.user_profiles;', p.polname); 
    END LOOP; 
END $$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_profiles
        WHERE id = auth.uid()
          AND role::text = 'super_admin'
    );
$$;

DROP POLICY IF EXISTS "super_admin_select_user_profiles" ON public.user_profiles;
CREATE POLICY "super_admin_select_user_profiles" 
    ON public.user_profiles 
    FOR SELECT 
    USING (public.is_super_admin());

COMMENT ON POLICY "super_admin_select_user_profiles" ON public.user_profiles IS
    'Visão global para super_admin sem recursão infinita através da função SECURITY DEFINER is_super_admin().';


-- ── 4. CORREÇÃO DO TRIGGER PROTECT_USER_PROFILES_PRIVILEGES ───────────────────

CREATE OR REPLACE FUNCTION public.protect_user_profiles_privileges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Permitir que operações do sistema (service_role, supabaseAdmin ou DBA local) prossigam
    IF (auth.jwt() ->> 'role') = 'service_role' OR session_user IN ('postgres', 'supabase_admin') THEN
        RETURN NEW;
    END IF;

    -- 1. Bloqueio de alteração de is_lifetime por usuários autenticados normais
    IF NEW.is_lifetime IS DISTINCT FROM OLD.is_lifetime THEN
        RAISE EXCEPTION 'Acesso negado: a flag is_lifetime não pode ser alterada diretamente.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- 2. Bloqueio de auto-elevação de role ou promoção para super_admin
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        IF OLD.id = auth.uid() AND OLD.role::text != 'super_admin' THEN
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

    -- 3. Bloqueio de troca de clínica não autorizada
    IF NEW.clinica_id IS DISTINCT FROM OLD.clinica_id AND OLD.clinica_id IS NOT NULL THEN
        IF NOT public.is_super_admin() THEN
            RAISE EXCEPTION 'Acesso negado: alteração de tenant (clinica_id) não permitida.'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


-- ── 5. RPC-02: VALIDAÇÃO RIGOROSA EM PROVISIONAR_NOVO_TENANT ─────────────────

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
    v_clinica_id   UUID := gen_random_uuid();
    v_clean_nome   TEXT;
    v_jwt_role     TEXT;
    v_setting_role TEXT;
    v_user_nome    TEXT;
BEGIN
    -- 1. Defesa em profundidade rigorosa:
    --    PostgreSQL em SECURITY DEFINER altera current_user para o dono (postgres).
    --    Portanto, a verificação de segurança DEVE checar a role da sessão / requisição:
    --    (auth.jwt() ->> 'role') e current_setting('role', true), além de session_user.
    v_jwt_role     := (auth.jwt() ->> 'role');
    v_setting_role := current_setting('role', true);

    IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
        IF session_user NOT IN ('postgres', 'supabase_admin') OR v_setting_role IN ('anon', 'authenticated') THEN
            RAISE EXCEPTION '[OdontoSoft Security] Execução não autorizada da RPC de provisionamento. Operação restrita a service_role (Stripe Webhook).'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;

    -- 2. RPC-02: Validação estrita de existência de p_user_id em auth.users
    IF p_user_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM auth.users WHERE id = p_user_id
    ) THEN
        RAISE EXCEPTION '[OdontoSoft Security] p_user_id (%) inválido ou inexistente em auth.users.', p_user_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    v_clean_nome := COALESCE(NULLIF(trim(p_nome_clinica), ''), 'Minha Clínica');

    -- 3. Criação da Clínica com status ativo legítimo emitido pelo Stripe
    INSERT INTO public.clinicas (
        id, nome, plano, status_assinatura,
        stripe_customer_id, stripe_subscription_id, plano_preco_id, ativo
    ) VALUES (
        v_clinica_id, v_clean_nome,
        COALESCE(p_plano, 'profissional'), 'ativo',
        p_stripe_customer_id, p_stripe_subscription_id, p_plano_preco_id, true
    );

    -- 4. Configurações iniciais com upsert
    INSERT INTO public.clinica_settings (clinica_id, nome, nome_exibido)
    VALUES (v_clinica_id, v_clean_nome, v_clean_nome)
    ON CONFLICT (clinica_id) DO UPDATE
        SET nome = EXCLUDED.nome, nome_exibido = EXCLUDED.nome_exibido;

    -- 5. Extração de nome defensivo para respeitar user_profiles.nome NOT NULL
    SELECT COALESCE(raw_user_meta_data->>'nome', raw_user_meta_data->>'full_name', split_part(email, '@', 1), 'Administrador')
    INTO v_user_nome
    FROM auth.users
    WHERE id = p_user_id;

    -- 6. Vinculação segura do perfil do usuário como admin_clinica
    INSERT INTO public.user_profiles (id, clinica_id, role, nome)
    VALUES (p_user_id, v_clinica_id, 'admin_clinica', COALESCE(v_user_nome, 'Administrador'))
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
    'Provisiona novo tenant B2B após pagamento no Stripe com validação estrita de auth.users (RPC-02).';


-- ── 6. STORAGE-01: CORREÇÃO DE ROLES NO BUCKET CONSENTIMENTOS-EVIDENCIAS ─────

-- Garantir bucket privado
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'consentimentos-evidencias',
    'consentimentos-evidencias',
    false,
    10485760,
    ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
    SET public = false,
        file_size_limit = 10485760,
        allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png'];

-- Idempotência de políticas
DROP POLICY IF EXISTS "consentimentos-evidencias: download restrito ao tenant" ON storage.objects;
DROP POLICY IF EXISTS "consentimentos-evidencias: upload restrito ao tenant" ON storage.objects;
DROP POLICY IF EXISTS "consentimentos-evidencias: delete restrito ao admin" ON storage.objects;

-- Leitura / Download
CREATE POLICY "consentimentos-evidencias: download restrito ao tenant"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'consentimentos-evidencias'
    AND (
        public.is_super_admin()
        OR
        (storage.foldername(name))[1] = (
            SELECT clinica_id::text
            FROM public.user_profiles
            WHERE id = auth.uid()
            LIMIT 1
        )
    )
);

-- Upload
CREATE POLICY "consentimentos-evidencias: upload restrito ao tenant"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'consentimentos-evidencias'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = (
        SELECT clinica_id::text
        FROM public.user_profiles
        WHERE id = auth.uid()
        LIMIT 1
    )
);

-- Exclusão / Expulgo Regulatório: Apenas admin_clinica (do próprio tenant) e super_admin
CREATE POLICY "consentimentos-evidencias: delete restrito ao admin"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'consentimentos-evidencias'
    AND (
        public.is_super_admin()
        OR
        (storage.foldername(name))[1] = (
            SELECT clinica_id::text
            FROM public.user_profiles
            WHERE id = auth.uid()
              AND role = 'admin_clinica'
            LIMIT 1
        )
    )
);

COMMENT ON POLICY "consentimentos-evidencias: delete restrito ao admin" ON storage.objects IS
    'Expurgo regulatório restrito a admin_clinica do tenant proprietário e super_admin (STORAGE-01).';
