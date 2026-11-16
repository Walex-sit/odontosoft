-- ================================================================================
-- Migration: 20261115000004_stripe_provisionamento_e_concorrencia_hardening.sql
-- Descrição:
--   1. Hardening de stripe_complete_event:
--      - Validação segura de claim_token UUID sem crash em strings nulas ou inválidas,
--        espelhando o comportamento seguro já existente em stripe_fail_event.
--   2. Correção de stripe_apply_checkout_completed:
--      - Exigência estrita de comprovação temporal (p_subscription_created) para
--        qualquer reativação de clínica com status_assinatura = 'cancelado'.
--      - Exigência de cancelamento_em presente e p_subscription_created > cancelamento_em.
--      - Bloqueio de substituição silenciosa quando a clínica já possui outra
--        assinatura ativa ('Clínica já possui assinatura ativa diferente da informada — substituição bloqueada').
--      - Bloqueio de eventos atrasados sob SELECT ... FOR UPDATE.
--   3. Correção de provisionar_novo_tenant:
--      - Bloqueio explícito com SELECT ... FOR UPDATE na linha do perfil do usuário,
--        garantindo serialização estrita e impedindo criação concorrente de tenants duplicados.
--      - Idempotência segura: não reativa clínicas canceladas por eventos antigos ou sem
--        comprovação temporal de subscription_created pós-cancelamento.
--      - Não substitui assinatura ativa por outra sem validação.
--      - Validação rigorosa de p_user_id contra auth.users e verificação de afetação
--        exata de 1 perfil em user_profiles.
--      - Validação estrita de planos aceitos ('basico', 'profissional', 'enterprise').
--      - Validação temporal: exige p_subscription_created confiável para provisionar com Stripe.
--      - Preservação integral de privilégios service_role e search_path = ''.
-- ================================================================================

BEGIN;

-- ── 1. RPC: stripe_complete_event (Hardened com Tratamento Seguro de Token) ───
CREATE OR REPLACE FUNCTION public.stripe_complete_event(
  p_event_id    TEXT,
  p_claim_token TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_token_uuid UUID;
  v_rows       INTEGER;
BEGIN
  IF p_claim_token IS NULL THEN
    RETURN FALSE;
  END IF;

  BEGIN
    v_token_uuid := p_claim_token::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
  END;

  UPDATE private.stripe_webhook_events
  SET
    status       = 'processed',
    processed_at = clock_timestamp(),
    last_error   = NULL,
    claim_token  = NULL
  WHERE id          = p_event_id
    AND status      = 'processing'
    AND claim_token = v_token_uuid;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.stripe_complete_event(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_complete_event(TEXT, TEXT) TO service_role;


-- ── 2. RPC: stripe_apply_checkout_completed (Validação Temporal e Substituição) ──
CREATE OR REPLACE FUNCTION public.stripe_apply_checkout_completed(
  p_clinica_id           UUID,
  p_customer_id          TEXT,
  p_subscription_id      TEXT,
  p_plano                TEXT,
  p_event_created        TIMESTAMPTZ DEFAULT NULL,
  p_subscription_created TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  clinica_id      UUID,
  applied         BOOLEAN,
  motivo_bloqueio TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_clinica RECORD;
  v_is_replacement BOOLEAN;
  v_new_last_event_at TIMESTAMPTZ;
  v_valid_plano TEXT;
BEGIN
  -- 1. Bloqueia linha da clínica sob SELECT ... FOR UPDATE
  SELECT
    c.id,
    c.status_assinatura,
    c.stripe_subscription_id,
    c.stripe_customer_id,
    c.stripe_last_event_at,
    c.stripe_subscription_created,
    c.cancelamento_em,
    c.plano,
    c.ativo
  INTO v_clinica
  FROM public.clinicas c
  WHERE c.id = p_clinica_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Clínica não encontrada para o id informado';
    RETURN;
  END IF;

  v_is_replacement := (v_clinica.stripe_subscription_id IS NOT NULL AND p_subscription_id IS NOT NULL AND v_clinica.stripe_subscription_id != p_subscription_id);

  -- 2. Concorrência e integridade: assinatura diferente da atual registrada
  -- Se a clínica já possui outra assinatura ativa, NUNCA permite substituição silenciosa
  IF v_is_replacement AND v_clinica.status_assinatura = 'ativo' THEN
    RETURN QUERY SELECT
      v_clinica.id,
      FALSE,
      'Clínica já possui assinatura ativa diferente da informada — substituição bloqueada';
    RETURN;
  END IF;

  -- 3. Validações estritas quando a clínica está cancelada
  IF v_clinica.status_assinatura = 'cancelado' THEN
    -- Bloqueio 1: Mesma assinatura já cancelada tentando reativar (terminal)
    IF v_clinica.stripe_subscription_id IS NOT NULL AND p_subscription_id IS NOT NULL AND v_clinica.stripe_subscription_id = p_subscription_id THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Assinatura do checkout já foi cancelada no sistema — reativação bloqueada';
      RETURN;
    END IF;

    -- Bloqueio 2: cancelamento_em deve existir
    IF v_clinica.cancelamento_em IS NULL THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Clínica cancelada sem registro de cancelamento_em — reativação bloqueada';
      RETURN;
    END IF;

    -- Bloqueio 3: p_subscription_created deve ser obrigatório
    IF p_subscription_created IS NULL THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Reativação pós-cancelamento exige comprovação temporal de criação da assinatura';
      RETURN;
    END IF;

    -- Bloqueio 4: Assinatura criada antes ou durante o cancelamento deve ser rejeitada
    IF p_subscription_created <= v_clinica.cancelamento_em THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Checkout com assinatura criada antes ou durante o cancelamento rejeitado';
      RETURN;
    END IF;

    -- Bloqueio 5: Evento gerado antes ou durante o cancelamento
    IF p_event_created IS NOT NULL AND p_event_created <= v_clinica.cancelamento_em THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Evento gerado antes ou durante o cancelamento — evento fora de ordem bloqueado';
      RETURN;
    END IF;
  END IF;

  -- 4. Proteção anti-regressão temporal para a MESMA assinatura
  IF NOT v_is_replacement AND v_clinica.stripe_last_event_at IS NOT NULL AND p_event_created IS NOT NULL THEN
    IF p_event_created < v_clinica.stripe_last_event_at THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Evento antigo descartado: timestamp do evento anterior ao último processado';
      RETURN;
    END IF;

    -- Tratamento para timestamps iguais (mesmo segundo): não permitir regressões de cancelado para ativo
    IF p_event_created = v_clinica.stripe_last_event_at AND v_clinica.status_assinatura = 'cancelado' THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Regressão descartada: cancelamento não pode ser revertido no mesmo timestamp';
      RETURN;
    END IF;
  END IF;

  -- Normaliza plano aceito
  v_valid_plano := CASE
    WHEN lower(trim(COALESCE(p_plano, 'profissional'))) IN ('enterprise', 'premium') THEN 'enterprise'
    WHEN lower(trim(COALESCE(p_plano, 'profissional'))) IN ('basico', 'essencial') THEN 'basico'
    ELSE 'profissional'
  END;

  -- 5. Aplica ativação e atualiza billing atomicamente na mesma transação sob FOR UPDATE
  v_new_last_event_at := CASE
    WHEN v_is_replacement THEN COALESCE(p_event_created, now())
    ELSE GREATEST(COALESCE(v_clinica.stripe_last_event_at, '-infinity'::timestamptz), COALESCE(p_event_created, now()))
  END;

  UPDATE public.clinicas
  SET
    stripe_customer_id          = COALESCE(p_customer_id, v_clinica.stripe_customer_id),
    stripe_subscription_id      = COALESCE(p_subscription_id, v_clinica.stripe_subscription_id),
    status_assinatura           = 'ativo',
    plano                       = v_valid_plano,
    ativo                       = true,
    cancelamento_em             = NULL,
    stripe_last_event_at        = v_new_last_event_at,
    stripe_subscription_created = COALESCE(p_subscription_created, v_clinica.stripe_subscription_created),
    atualizado_em               = now()
  WHERE id = v_clinica.id;

  RETURN QUERY SELECT v_clinica.id, TRUE, NULL::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.stripe_apply_checkout_completed(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_apply_checkout_completed(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;


-- ── 3. RPC: provisionar_novo_tenant (Concorrência, Idempotência e Validação) ──
DROP FUNCTION IF EXISTS public.provisionar_novo_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.provisionar_novo_tenant(
    p_user_id                UUID,
    p_nome_clinica           TEXT,
    p_plano                  TEXT DEFAULT 'profissional',
    p_stripe_customer_id     TEXT DEFAULT NULL,
    p_stripe_subscription_id TEXT DEFAULT NULL,
    p_plano_preco_id         TEXT DEFAULT NULL,
    p_subscription_created   TIMESTAMPTZ DEFAULT NULL,
    p_event_created          TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_clinica_id     UUID;
    v_clean_nome     TEXT;
    v_valid_plano    TEXT;
    v_jwt_role       TEXT;
    v_setting_role   TEXT;
    v_user_nome      TEXT;
    v_existing_cid   UUID;
    v_clinica        RECORD;
    v_user_rows      INTEGER;
    v_is_replacement BOOLEAN;
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

    -- 2. Validação estrita de p_user_id em auth.users
    IF p_user_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM auth.users WHERE id = p_user_id
    ) THEN
        RAISE EXCEPTION '[OdontoSoft Security] p_user_id (%) inválido ou inexistente em auth.users.', p_user_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    -- Validação estrita do plano aceito
    v_valid_plano := CASE
        WHEN lower(trim(COALESCE(p_plano, 'profissional'))) IN ('enterprise', 'premium') THEN 'enterprise'
        WHEN lower(trim(COALESCE(p_plano, 'profissional'))) IN ('basico', 'essencial') THEN 'basico'
        WHEN lower(trim(COALESCE(p_plano, 'profissional'))) = 'profissional' THEN 'profissional'
        ELSE NULL
    END;

    IF v_valid_plano IS NULL THEN
        RAISE EXCEPTION '[OdontoSoft Security] Plano informado (%) é inválido. Valores aceitos: basico, profissional, enterprise.', p_plano
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- 3. Concorrência: Assegura existência do perfil e aplica SELECT ... FOR UPDATE
    -- Serializa workers concorrentes para o mesmo usuário antes de qualquer verificação
    INSERT INTO public.user_profiles (id, nome, role)
    SELECT
        p_user_id,
        COALESCE(raw_user_meta_data->>'nome', raw_user_meta_data->>'full_name', split_part(email, '@', 1), 'Administrador'),
        'admin_clinica'::public.user_role
    FROM auth.users
    WHERE id = p_user_id
    ON CONFLICT (id) DO NOTHING;

    SELECT clinica_id INTO v_existing_cid
    FROM public.user_profiles
    WHERE id = p_user_id
    FOR UPDATE;

    -- 4. Tratamento Idempotente Seguro para Usuário já Vinculado
    IF v_existing_cid IS NOT NULL THEN
        SELECT
            c.id,
            c.status_assinatura,
            c.stripe_subscription_id,
            c.stripe_customer_id,
            c.cancelamento_em,
            c.stripe_last_event_at,
            c.stripe_subscription_created
        INTO v_clinica
        FROM public.clinicas c
        WHERE c.id = v_existing_cid
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION '[OdontoSoft Security] Inconsistência: clínica % vinculada ao perfil % não existe.', v_existing_cid, p_user_id
                USING ERRCODE = 'data_exception';
        END IF;

        v_is_replacement := (v_clinica.stripe_subscription_id IS NOT NULL AND p_stripe_subscription_id IS NOT NULL AND v_clinica.stripe_subscription_id != p_stripe_subscription_id);

        -- Se a clínica estiver cancelada: NUNCA reativa sem comprovação temporal válida pós-cancelamento
        IF v_clinica.status_assinatura = 'cancelado' THEN
            -- Reativação permitida EXCLUSIVAMENTE se for nova assinatura comprovadamente criada após o cancelamento
            IF p_stripe_subscription_id IS NOT NULL
               AND (v_clinica.stripe_subscription_id IS NULL OR v_clinica.stripe_subscription_id != p_stripe_subscription_id)
               AND v_clinica.cancelamento_em IS NOT NULL
               AND p_subscription_created IS NOT NULL
               AND p_subscription_created > v_clinica.cancelamento_em
               AND (p_event_created IS NULL OR p_event_created > v_clinica.cancelamento_em) THEN

                UPDATE public.clinicas
                SET stripe_customer_id          = COALESCE(p_stripe_customer_id, stripe_customer_id),
                    stripe_subscription_id      = p_stripe_subscription_id,
                    plano                       = v_valid_plano,
                    plano_preco_id              = COALESCE(p_plano_preco_id, plano_preco_id),
                    status_assinatura           = 'ativo',
                    ativo                       = true,
                    cancelamento_em             = NULL,
                    stripe_last_event_at        = COALESCE(p_event_created, now()),
                    stripe_subscription_created = p_subscription_created,
                    atualizado_em               = now()
                WHERE id = v_existing_cid;
            ELSE
                -- Tentativa sem comprovação temporal, com evento atrasado ou mesma assinatura:
                -- NÃO reativa. Preserva estado cancelado e cancelamento_em intactos.
                NULL;
            END IF;

            RETURN v_existing_cid;
        END IF;

        -- Se a clínica já está ativa com outra assinatura: NÃO permite substituição silenciosa
        IF v_is_replacement AND v_clinica.status_assinatura = 'ativo' THEN
            RETURN v_existing_cid;
        END IF;

        -- Proteção contra eventos atrasados para a mesma assinatura
        IF NOT v_is_replacement AND v_clinica.stripe_last_event_at IS NOT NULL AND p_event_created IS NOT NULL THEN
            IF p_event_created < v_clinica.stripe_last_event_at THEN
                RETURN v_existing_cid;
            END IF;
        END IF;

        -- Atualização idempotente segura de metadados na assinatura atual
        UPDATE public.clinicas
        SET stripe_customer_id          = COALESCE(p_stripe_customer_id, stripe_customer_id),
            stripe_subscription_id      = COALESCE(p_stripe_subscription_id, stripe_subscription_id),
            plano_preco_id              = COALESCE(p_plano_preco_id, plano_preco_id),
            stripe_last_event_at        = CASE
                WHEN v_is_replacement THEN COALESCE(p_event_created, now())
                ELSE GREATEST(COALESCE(v_clinica.stripe_last_event_at, '-infinity'::timestamptz), COALESCE(p_event_created, now()))
            END,
            stripe_subscription_created = COALESCE(p_subscription_created, v_clinica.stripe_subscription_created),
            atualizado_em               = now()
        WHERE id = v_existing_cid;

        RETURN v_existing_cid;
    END IF;

    -- 5. Integração Temporal no Provisionamento de Novo Tenant:
    -- Se provisionando com assinatura Stripe, exige comprovação temporal confiável de subscription_created
    IF p_stripe_subscription_id IS NOT NULL AND p_subscription_created IS NULL THEN
        RAISE EXCEPTION '[OdontoSoft Security] Provisionamento com assinatura Stripe exige comprovação temporal confiável (p_subscription_created).'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    v_clinica_id := gen_random_uuid();
    v_clean_nome := COALESCE(NULLIF(trim(p_nome_clinica), ''), 'Minha Clínica');

    -- 6. Criação da Clínica
    INSERT INTO public.clinicas (
        id, nome, plano, status_assinatura,
        stripe_customer_id, stripe_subscription_id, plano_preco_id, ativo,
        stripe_last_event_at, stripe_subscription_created
    ) VALUES (
        v_clinica_id, v_clean_nome,
        v_valid_plano, 'ativo',
        p_stripe_customer_id, p_stripe_subscription_id, p_plano_preco_id, true,
        COALESCE(p_event_created, now()), p_subscription_created
    );

    -- 7. Configurações da clínica
    INSERT INTO public.clinica_settings (clinica_id, nome, nome_exibido)
    VALUES (v_clinica_id, v_clean_nome, v_clean_nome)
    ON CONFLICT (clinica_id) DO UPDATE
        SET nome = EXCLUDED.nome, nome_exibido = EXCLUDED.nome_exibido;

    -- 8. Extração defensiva de nome do usuário
    SELECT COALESCE(raw_user_meta_data->>'nome', raw_user_meta_data->>'full_name', split_part(email, '@', 1), 'Administrador')
    INTO v_user_nome
    FROM auth.users
    WHERE id = p_user_id;

    -- 9. Vinculação do perfil do usuário como admin_clinica
    UPDATE public.user_profiles
    SET clinica_id = v_clinica_id,
        role       = 'admin_clinica',
        nome       = COALESCE(nome, v_user_nome, 'Administrador')
    WHERE id = p_user_id;

    GET DIAGNOSTICS v_user_rows = ROW_COUNT;
    IF v_user_rows != 1 THEN
        RAISE EXCEPTION '[OdontoSoft Security] Falha ao vincular usuário % ao tenant %: exatamente 1 linha esperada, afetados: %', p_user_id, v_clinica_id, v_user_rows
            USING ERRCODE = 'data_exception';
    END IF;

    RETURN v_clinica_id;
END;
$$;

REVOKE ALL ON FUNCTION public.provisionar_novo_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provisionar_novo_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

COMMENT ON FUNCTION public.provisionar_novo_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS
  'Provisiona novo tenant B2B com concorrência serializada via FOR UPDATE, idempotência temporal segura e vinculação atômica.';

COMMIT;

