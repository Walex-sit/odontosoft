-- ================================================================================
-- Migration: 20261115000009_reconciliacao_stripe_remoto.sql (Revisão Corretiva)
-- Descrição:
--   Migration consolidada de reconciliação para o banco de dados remoto do OdontoSoft.
--
-- Contexto do Banco Remoto:
--   - As migrations 20261115000005 e 20261115000007 foram aplicadas manualmente.
--   - As triggers trg_guard_super_admin_profile e trg_guard_clinica_billing_integrity já existem.
--   - As colunas stripe_last_event_at e stripe_subscription_created em clinicas NÃO existem.
--   - As RPCs de ciclo de vida Stripe (stripe_apply_*) NÃO existem.
--   - Funções antigas provisionar_novo_tenant (6 parâmetros) e stripe_should_activate_on_invoice
--     (4 parâmetros) precisam ser substituídas pelas versões finais sem ambiguidades.
--
-- Correções e Blindagens Implementadas nesta Revisão:
--   1. Parâmetros Obrigatórios e Defensivos:
--      - stripe_apply_subscription_update, stripe_apply_invoice_payment_succeeded,
--        stripe_apply_checkout_completed e stripe_should_activate_on_invoice rejeitam
--        imediatamente p_subscription_id NULL ou vazio ('') antes de qualquer busca ou UPDATE.
--      - Nenhuma chamada consegue limpar ou desvincular a assinatura atual (stripe_subscription_id nunca é anulado).
--   2. Validação Estrita de Status de Assinatura:
--      - stripe_apply_subscription_update valida p_status contra os valores aceitos pelo contrato
--        ('trial', 'ativo', 'inadimplente', 'cancelado', 'pendente'), rejeitando status arbitrário ou NULL.
--   3. Validação Estrita no Provisionamento:
--      - provisionar_novo_tenant valida p_user_id contra auth.users e bloqueia role='super_admin'
--        antes de qualquer operação DML.
--      - Detecta divergência entre p_stripe_customer_id e o Customer ID já registrado, lançando exceção
--        explícita (integrity_constraint_violation) sem ignorar ou sobrescrever silenciosamente.
--      - Impede criação de nova clínica com Customer ID já pertencente a outra clínica.
--   4. Eliminação de Ambiguidade nos Fallbacks por stripe_customer_id:
--      - Em stripe_apply_subscription_update, stripe_apply_invoice_payment_succeeded e
--        stripe_should_activate_on_invoice, a busca por customer_id valida previamente a contagem
--        de clínicas correspondentes (count(*)). Se houver mais de uma correspondência (duplicidade),
--        a operação é rejeitada com applied = false ('Ambiguidade: múltiplos registros...').
--   5. Separação de Responsabilidade e Validação Final:
--      - stripe_should_activate_on_invoice é consulta preliminar puramente informativa sem locks.
--      - stripe_apply_invoice_payment_succeeded é a validação definitiva transacional sob SELECT FOR UPDATE.
--   6. Preservação Integral:
--      - Mantém intocadas as triggers 000007 (trg_guard_super_admin_profile, trg_guard_clinica_billing_integrity)
--        e os objetos de contexto da 000005 (super_admin_clinic_contexts).
--      - Preserva SECURITY DEFINER, search_path = '', permissões restritas a service_role e locks FOR UPDATE.
-- ================================================================================

BEGIN;

-- ── 1. Verificação de Pré-Requisitos ──────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clinicas') THEN
    RAISE EXCEPTION '[OdontoSoft Reconciliação] Tabela public.clinicas não encontrada. Abortando.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    RAISE EXCEPTION '[OdontoSoft Reconciliação] Tabela public.user_profiles não encontrada. Abortando.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'private' AND table_name = 'stripe_webhook_events') THEN
    RAISE EXCEPTION '[OdontoSoft Reconciliação] Tabela private.stripe_webhook_events não encontrada. Abortando.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    RAISE EXCEPTION '[OdontoSoft Reconciliação] Tipo enum public.user_role não encontrado. Abortando.';
  END IF;
END $$;


-- ── 2. Colunas de Rastreabilidade Concorrente na Tabela Clinicas ───────────────
ALTER TABLE public.clinicas
  ADD COLUMN IF NOT EXISTS stripe_last_event_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_subscription_created TIMESTAMPTZ;

COMMENT ON COLUMN public.clinicas.stripe_last_event_at IS
  'Timestamp do evento Stripe mais recente aplicado com sucesso na assinatura atual.';

COMMENT ON COLUMN public.clinicas.stripe_subscription_created IS
  'Timestamp de criação real da assinatura Stripe ativa (subscription.created). Comprova legitimidade pós-cancelamento.';


-- ── 3. Limpeza de Sobrecargas Antigas / Obsoletas ──────────────────────────────
-- Remove a sobrecarga legada de 4 parâmetros de stripe_should_activate_on_invoice
DROP FUNCTION IF EXISTS public.stripe_should_activate_on_invoice(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.stripe_should_activate_on_invoice(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ);

-- Remove a sobrecarga legada de 6 parâmetros de provisionar_novo_tenant
DROP FUNCTION IF EXISTS public.provisionar_novo_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.provisionar_novo_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ);


-- ── 4. RPC: stripe_complete_event (Hardened com Tratamento Seguro de Token) ───
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
  IF p_claim_token IS NULL OR trim(p_claim_token) = '' THEN
    RETURN FALSE;
  END IF;

  BEGIN
    v_token_uuid := trim(p_claim_token)::UUID;
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

COMMENT ON FUNCTION public.stripe_complete_event(TEXT, TEXT) IS
  'Finaliza o processamento de um evento Stripe com sucesso, validando de forma segura a posse do claim_token.';


-- ── 5. RPC: stripe_fail_event (Hardened com Tratamento Seguro de Token) ─────────
CREATE OR REPLACE FUNCTION public.stripe_fail_event(
  p_event_id    TEXT,
  p_claim_token TEXT,
  p_error_msg   TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_token_uuid UUID;
  v_safe_error TEXT;
  v_rows       INTEGER;
BEGIN
  IF p_claim_token IS NULL OR trim(p_claim_token) = '' THEN
    RETURN FALSE;
  END IF;

  BEGIN
    v_token_uuid := trim(p_claim_token)::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
  END;

  -- Sanitiza caracteres de controle e limita tamanho
  v_safe_error := regexp_replace(COALESCE(p_error_msg, 'unknown error'), '[\x00-\x08\x0B\x0C\x0E-\x1F]', ' ', 'g');
  v_safe_error := left(trim(v_safe_error), 500);

  -- Atualiza exclusivamente se o claim_token corresponder à posse atual do worker
  UPDATE private.stripe_webhook_events
  SET
    status      = 'failed',
    last_error  = v_safe_error,
    claim_token = NULL
  WHERE id          = p_event_id
    AND status      = 'processing'
    AND claim_token = v_token_uuid;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.stripe_fail_event(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_fail_event(TEXT, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.stripe_fail_event(TEXT, TEXT, TEXT) IS
  'Registra falha no processamento de evento Stripe, liberando claim_token com sanitização defensiva da mensagem de erro.';


-- ── 6. RPC: stripe_apply_subscription_deleted (Cancelamento Concorrente Seguro) ─
CREATE OR REPLACE FUNCTION public.stripe_apply_subscription_deleted(
  p_subscription_id TEXT,
  p_event_created   TIMESTAMPTZ DEFAULT NULL
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
  v_clean_sub_id TEXT;
BEGIN
  IF p_subscription_id IS NULL OR trim(p_subscription_id) = '' THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Parâmetro p_subscription_id inválido ou vazio';
    RETURN;
  END IF;

  v_clean_sub_id := trim(p_subscription_id);

  SELECT
    c.id,
    c.status_assinatura,
    c.stripe_subscription_id,
    c.stripe_last_event_at
  INTO v_clinica
  FROM public.clinicas c
  WHERE c.stripe_subscription_id = v_clean_sub_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Assinatura não vinculada à clínica atual (possivelmente já substituída)';
    RETURN;
  END IF;

  IF v_clinica.stripe_last_event_at IS NOT NULL AND p_event_created IS NOT NULL AND p_event_created < v_clinica.stripe_last_event_at THEN
    RETURN QUERY SELECT v_clinica.id, FALSE, 'Evento antigo descartado: timestamp anterior ao último registrado';
    RETURN;
  END IF;

  UPDATE public.clinicas
  SET
    status_assinatura    = 'cancelado',
    cancelamento_em      = COALESCE(p_event_created, now()),
    ativo                = false,
    stripe_last_event_at = GREATEST(COALESCE(v_clinica.stripe_last_event_at, '-infinity'::timestamptz), COALESCE(p_event_created, now())),
    atualizado_em        = now()
  WHERE id = v_clinica.id
    AND stripe_subscription_id = v_clean_sub_id;

  RETURN QUERY SELECT v_clinica.id, TRUE, NULL::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.stripe_apply_subscription_deleted(TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_apply_subscription_deleted(TEXT, TIMESTAMPTZ) TO service_role;

COMMENT ON FUNCTION public.stripe_apply_subscription_deleted(TEXT, TIMESTAMPTZ) IS
  'Aplica cancelamento de assinatura sob SELECT FOR UPDATE, protegendo contra cancelamentos tardios de assinaturas substituídas.';


-- ── 7. RPC: stripe_apply_invoice_payment_failed (Proteção Temporal de Inadimplência) ─
CREATE OR REPLACE FUNCTION public.stripe_apply_invoice_payment_failed(
  p_subscription_id TEXT,
  p_event_created   TIMESTAMPTZ DEFAULT NULL
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
  v_clean_sub_id TEXT;
BEGIN
  IF p_subscription_id IS NULL OR trim(p_subscription_id) = '' THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Parâmetro p_subscription_id inválido ou vazio';
    RETURN;
  END IF;

  v_clean_sub_id := trim(p_subscription_id);

  -- 1. Bloqueia linha da clínica sob SELECT ... FOR UPDATE
  SELECT
    c.id,
    c.status_assinatura,
    c.stripe_subscription_id,
    c.stripe_last_event_at
  INTO v_clinica
  FROM public.clinicas c
  WHERE c.stripe_subscription_id = v_clean_sub_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Assinatura não vinculada à clínica ativa (possivelmente já substituída)';
    RETURN;
  END IF;

  -- 2. Impedir que uma clínica cancelada seja marcada como inadimplente
  IF v_clinica.status_assinatura = 'cancelado' THEN
    RETURN QUERY SELECT v_clinica.id, FALSE, 'Clínica já se encontra cancelada — inadimplência rejeitada';
    RETURN;
  END IF;

  -- 3. Proteção temporal contra eventos antigos ou fora de ordem
  IF v_clinica.stripe_last_event_at IS NOT NULL AND p_event_created IS NOT NULL THEN
    IF p_event_created < v_clinica.stripe_last_event_at THEN
      RETURN QUERY SELECT v_clinica.id, FALSE, 'Evento antigo descartado: timestamp anterior ao último registrado';
      RETURN;
    END IF;

    -- Em timestamps idênticos, não permitir regressão de estado ativo para inadimplente
    IF p_event_created = v_clinica.stripe_last_event_at AND v_clinica.status_assinatura = 'ativo' THEN
      RETURN QUERY SELECT v_clinica.id, FALSE, 'Regressão descartada: falha com timestamp igual a evento ativo';
      RETURN;
    END IF;
  END IF;

  -- 4. Aplica inadimplência sob lock transacional
  UPDATE public.clinicas
  SET
    status_assinatura    = 'inadimplente',
    stripe_last_event_at = GREATEST(COALESCE(v_clinica.stripe_last_event_at, '-infinity'::timestamptz), COALESCE(p_event_created, now())),
    atualizado_em        = now()
  WHERE id = v_clinica.id
    AND stripe_subscription_id = v_clean_sub_id;

  RETURN QUERY SELECT v_clinica.id, TRUE, NULL::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.stripe_apply_invoice_payment_failed(TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_apply_invoice_payment_failed(TEXT, TIMESTAMPTZ) TO service_role;

COMMENT ON FUNCTION public.stripe_apply_invoice_payment_failed(TEXT, TIMESTAMPTZ) IS
  'Marca clínica como inadimplente sob SELECT FOR UPDATE, impedindo regressão em clínicas canceladas ou por eventos antigos.';


-- ── 8. RPC: stripe_apply_checkout_completed (Anti-Substituição e Assinatura Válida) ───
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
  v_clean_sub_id TEXT;
  v_clean_cust_id TEXT;
BEGIN
  -- 1. Validação estrita de parâmetros obrigatórios
  IF p_clinica_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Parâmetro p_clinica_id obrigatório';
    RETURN;
  END IF;

  IF p_subscription_id IS NULL OR trim(p_subscription_id) = '' THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Parâmetro p_subscription_id inválido ou vazio — checkout exige assinatura Stripe válida';
    RETURN;
  END IF;

  v_clean_sub_id := trim(p_subscription_id);
  v_clean_cust_id := NULLIF(trim(COALESCE(p_customer_id, '')), '');

  -- 2. Bloqueia linha da clínica sob SELECT ... FOR UPDATE
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

  -- 3. Validação de divergência de Customer ID: nunca permite alterar customer já registrado
  IF v_clinica.stripe_customer_id IS NOT NULL AND v_clean_cust_id IS NOT NULL AND v_clinica.stripe_customer_id != v_clean_cust_id THEN
    RETURN QUERY SELECT
      v_clinica.id,
      FALSE,
      'Divergência de Stripe Customer ID: não é permitido alterar o customer registrado';
    RETURN;
  END IF;

  v_is_replacement := (v_clinica.stripe_subscription_id IS NOT NULL AND v_clinica.stripe_subscription_id != v_clean_sub_id);

  -- 4. Concorrência e integridade: bloqueia substituição para clínica em qualquer estado não cancelado
  IF v_is_replacement THEN
    IF v_clinica.status_assinatura != 'cancelado' THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Clínica possui assinatura vinculada em estado não cancelado — substituição bloqueada';
      RETURN;
    END IF;

    -- Quando a clínica está cancelada, exige cancelamento_em e comprovação temporal confiável
    IF v_clinica.cancelamento_em IS NULL THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Clínica cancelada sem registro de cancelamento_em — reativação/substituição bloqueada';
      RETURN;
    END IF;

    IF p_subscription_created IS NULL THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Reativação pós-cancelamento exige comprovação temporal de criação da assinatura';
      RETURN;
    END IF;

    IF p_subscription_created <= v_clinica.cancelamento_em THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Checkout com assinatura criada antes ou durante o cancelamento rejeitado';
      RETURN;
    END IF;

    IF p_event_created IS NOT NULL AND p_event_created <= v_clinica.cancelamento_em THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Evento gerado antes ou durante o cancelamento — evento fora de ordem bloqueado';
      RETURN;
    END IF;
  END IF;

  -- 5. Validações estritas quando a clínica está cancelada e o evento é para a MESMA assinatura
  IF NOT v_is_replacement AND v_clinica.status_assinatura = 'cancelado' THEN
    IF v_clinica.stripe_subscription_id IS NOT NULL AND v_clinica.stripe_subscription_id = v_clean_sub_id THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Assinatura do checkout já foi cancelada no sistema — reativação bloqueada';
      RETURN;
    END IF;

    IF p_event_created IS NOT NULL AND v_clinica.cancelamento_em IS NOT NULL AND p_event_created <= v_clinica.cancelamento_em THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Evento gerado antes ou durante o cancelamento — evento fora de ordem bloqueado';
      RETURN;
    END IF;
  END IF;

  -- 6. Proteção anti-regressão temporal para a MESMA assinatura
  IF NOT v_is_replacement AND v_clinica.stripe_last_event_at IS NOT NULL AND p_event_created IS NOT NULL THEN
    IF p_event_created < v_clinica.stripe_last_event_at THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Evento antigo descartado: timestamp do evento anterior ao último processado';
      RETURN;
    END IF;

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

  -- 7. Aplica ativação e atualiza billing atomicamente na mesma transação sob FOR UPDATE
  v_new_last_event_at := CASE
    WHEN v_is_replacement THEN COALESCE(p_event_created, now())
    ELSE GREATEST(COALESCE(v_clinica.stripe_last_event_at, '-infinity'::timestamptz), COALESCE(p_event_created, now()))
  END;

  UPDATE public.clinicas
  SET
    stripe_customer_id          = COALESCE(v_clinica.stripe_customer_id, v_clean_cust_id),
    stripe_subscription_id      = v_clean_sub_id,
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

COMMENT ON FUNCTION public.stripe_apply_checkout_completed(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS
  'Ativa checkout de clínica sob SELECT FOR UPDATE, exigindo assinatura Stripe válida e preservando stripe_customer_id existente.';


-- ── 9. RPC: stripe_apply_subscription_update (Validação de Status e Unicidade) ──
CREATE OR REPLACE FUNCTION public.stripe_apply_subscription_update(
  p_subscription_id      TEXT,
  p_customer_id          TEXT,
  p_status               TEXT,
  p_period_end           TIMESTAMPTZ DEFAULT NULL,
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
  v_clean_sub_id TEXT;
  v_clean_cust_id TEXT;
  v_valid_status TEXT;
  v_count_by_customer INTEGER;
BEGIN
  -- 1. Validação estrita de p_subscription_id
  IF p_subscription_id IS NULL OR trim(p_subscription_id) = '' THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Parâmetro p_subscription_id inválido ou vazio';
    RETURN;
  END IF;

  v_clean_sub_id := trim(p_subscription_id);
  v_clean_cust_id := NULLIF(trim(COALESCE(p_customer_id, '')), '');

  -- 2. Validação estrita de p_status contra o contrato do domínio
  IF p_status IS NULL OR lower(trim(p_status)) NOT IN ('trial', 'ativo', 'inadimplente', 'cancelado', 'pendente') THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Status de assinatura inválido ou não suportado: ' || COALESCE(p_status, 'NULL');
    RETURN;
  END IF;

  v_valid_status := lower(trim(p_status));

  -- 3. Bloqueia linha da clínica com SELECT ... FOR UPDATE por subscription_id
  SELECT
    c.id,
    c.status_assinatura,
    c.stripe_subscription_id,
    c.stripe_customer_id,
    c.cancelamento_em,
    c.periodo_fim,
    c.ativo,
    c.stripe_last_event_at,
    c.stripe_subscription_created
  INTO v_clinica
  FROM public.clinicas c
  WHERE c.stripe_subscription_id = v_clean_sub_id
  FOR UPDATE;

  -- 4. Fallback concorrente por customer_id com verificação estrita de unicidade
  IF NOT FOUND AND v_clean_cust_id IS NOT NULL THEN
    SELECT count(*) INTO v_count_by_customer
    FROM public.clinicas c
    WHERE c.stripe_customer_id = v_clean_cust_id;

    IF v_count_by_customer > 1 THEN
      RETURN QUERY SELECT NULL::UUID, FALSE, 'Ambiguidade: múltiplos registros de clínica encontrados para o stripe_customer_id informado';
      RETURN;
    END IF;

    IF v_count_by_customer = 1 THEN
      SELECT
        c.id,
        c.status_assinatura,
        c.stripe_subscription_id,
        c.stripe_customer_id,
        c.cancelamento_em,
        c.periodo_fim,
        c.ativo,
        c.stripe_last_event_at,
        c.stripe_subscription_created
      INTO v_clinica
      FROM public.clinicas c
      WHERE c.stripe_customer_id = v_clean_cust_id
      FOR UPDATE;
    END IF;
  END IF;

  IF v_clinica.id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Clínica não encontrada para subscription/customer informado';
    RETURN;
  END IF;

  -- 5. Validação de divergência de Customer ID: nunca permite alterar customer já registrado
  IF v_clinica.stripe_customer_id IS NOT NULL AND v_clean_cust_id IS NOT NULL AND v_clinica.stripe_customer_id != v_clean_cust_id THEN
    RETURN QUERY SELECT
      v_clinica.id,
      FALSE,
      'Divergência de Stripe Customer ID: não é permitido alterar o customer registrado';
    RETURN;
  END IF;

  v_is_replacement := (v_clinica.stripe_subscription_id IS NOT NULL AND v_clinica.stripe_subscription_id != v_clean_sub_id);

  -- 6. Vinculação inicial quando stripe_subscription_id IS NULL
  IF v_clinica.stripe_subscription_id IS NULL THEN
    IF p_subscription_created IS NULL THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Vinculação de assinatura exige comprovação temporal confiável de subscription.created';
      RETURN;
    END IF;

    IF v_clinica.status_assinatura = 'cancelado' THEN
      IF v_clinica.cancelamento_em IS NULL THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Clínica cancelada sem registro de cancelamento_em — vinculação bloqueada';
        RETURN;
      END IF;

      IF p_subscription_created <= v_clinica.cancelamento_em THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Assinatura foi criada antes ou durante o cancelamento — vinculação bloqueada';
        RETURN;
      END IF;

      IF p_event_created IS NOT NULL AND p_event_created <= v_clinica.cancelamento_em THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Evento gerado antes ou durante o cancelamento — evento fora de ordem bloqueado';
        RETURN;
      END IF;
    END IF;
  END IF;

  -- 7. Concorrência e integridade: assinatura diferente da atual registrada
  IF v_is_replacement THEN
    IF v_clinica.status_assinatura = 'ativo' THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Clínica já possui assinatura ativa diferente da informada — substituição bloqueada';
      RETURN;
    END IF;

    IF v_clinica.status_assinatura = 'inadimplente' THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Clínica inadimplente com outra assinatura vinculada — substituição não autorizada bloqueada';
      RETURN;
    END IF;

    IF v_clinica.status_assinatura != 'cancelado' THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Clínica possui assinatura vinculada em estado não cancelado — substituição bloqueada';
      RETURN;
    END IF;

    -- Quando a clínica está cancelada:
    IF v_clinica.status_assinatura = 'cancelado' THEN
      IF v_clinica.cancelamento_em IS NULL THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Clínica cancelada sem registro de cancelamento_em — reativação/substituição bloqueada';
        RETURN;
      END IF;

      IF p_subscription_created IS NULL THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Reativação pós-cancelamento exige comprovação temporal de criação da assinatura';
        RETURN;
      END IF;

      IF p_subscription_created <= v_clinica.cancelamento_em THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Assinatura foi criada antes ou durante o cancelamento — reativação bloqueada';
        RETURN;
      END IF;

      IF p_event_created IS NOT NULL AND p_event_created <= v_clinica.cancelamento_em THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Evento gerado antes ou durante o cancelamento — evento fora de ordem bloqueado';
        RETURN;
      END IF;

      IF v_valid_status != 'ativo' THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Reativação pós-cancelamento requer assinatura em estado ativo';
        RETURN;
      END IF;
    END IF;
  END IF;

  -- 8. Validações estritas quando a clínica está cancelada e o evento é para a MESMA assinatura
  IF NOT v_is_replacement AND v_clinica.status_assinatura = 'cancelado' THEN
    IF v_clinica.stripe_subscription_id IS NOT NULL AND v_clinica.stripe_subscription_id = v_clean_sub_id AND v_valid_status = 'ativo' THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Assinatura do evento já foi cancelada no sistema — reativação bloqueada';
      RETURN;
    END IF;

    IF p_event_created IS NOT NULL AND v_clinica.cancelamento_em IS NOT NULL AND p_event_created <= v_clinica.cancelamento_em AND v_valid_status = 'ativo' THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Evento gerado antes ou durante o cancelamento — evento fora de ordem bloqueado';
      RETURN;
    END IF;
  END IF;

  -- 9. Proteção anti-regressão temporal para a MESMA assinatura
  IF NOT v_is_replacement AND v_clinica.stripe_last_event_at IS NOT NULL AND p_event_created IS NOT NULL THEN
    IF p_event_created < v_clinica.stripe_last_event_at THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Evento antigo descartado: timestamp do evento anterior ao último processado';
      RETURN;
    END IF;

    IF p_event_created = v_clinica.stripe_last_event_at THEN
      IF v_clinica.status_assinatura = 'cancelado' AND v_valid_status != 'cancelado' THEN
        RETURN QUERY SELECT v_clinica.id, FALSE, 'Regressão descartada: cancelamento não pode ser revertido no mesmo timestamp';
        RETURN;
      END IF;
      IF v_clinica.status_assinatura = 'ativo' AND v_valid_status IN ('trial', 'pendente') THEN
        RETURN QUERY SELECT v_clinica.id, FALSE, 'Regressão descartada: assinatura ativa não retrocede no mesmo timestamp';
        RETURN;
      END IF;
    END IF;
  END IF;

  -- 10. Atualização atômica na mesma transação PostgreSQL sob FOR UPDATE
  v_new_last_event_at := CASE
    WHEN v_is_replacement THEN COALESCE(p_event_created, now())
    ELSE GREATEST(COALESCE(v_clinica.stripe_last_event_at, '-infinity'::timestamptz), COALESCE(p_event_created, now()))
  END;

  UPDATE public.clinicas
  SET
    status_assinatura           = v_valid_status,
    stripe_subscription_id      = v_clean_sub_id,
    stripe_customer_id          = COALESCE(v_clinica.stripe_customer_id, v_clean_cust_id),
    periodo_fim                 = COALESCE(p_period_end, v_clinica.periodo_fim),
    cancelamento_em             = CASE
      WHEN v_valid_status = 'cancelado' THEN COALESCE(p_event_created, now())
      WHEN v_valid_status = 'ativo' THEN NULL
      ELSE v_clinica.cancelamento_em
    END,
    ativo                       = CASE
      WHEN v_valid_status = 'ativo' THEN true
      WHEN v_valid_status = 'cancelado' THEN false
      ELSE v_clinica.ativo
    END,
    stripe_last_event_at        = v_new_last_event_at,
    stripe_subscription_created = COALESCE(p_subscription_created, v_clinica.stripe_subscription_created),
    atualizado_em               = now()
  WHERE id = v_clinica.id;

  RETURN QUERY SELECT v_clinica.id, TRUE, NULL::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.stripe_apply_subscription_update(TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_apply_subscription_update(TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

COMMENT ON FUNCTION public.stripe_apply_subscription_update(TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) IS
  'Atualiza ciclo de vida da assinatura Stripe sob SELECT FOR UPDATE, validando status aceitos e unicidade no fallback por customer_id.';


-- ── 10. RPC: stripe_apply_invoice_payment_succeeded (Validação Estrita e Unicidade) ───
CREATE OR REPLACE FUNCTION public.stripe_apply_invoice_payment_succeeded(
  p_subscription_id      TEXT,
  p_customer_id          TEXT,
  p_invoice_period_end   TIMESTAMPTZ DEFAULT NULL,
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
  v_clean_sub_id TEXT;
  v_clean_cust_id TEXT;
  v_count_by_customer INTEGER;
BEGIN
  -- 1. Validação estrita de p_subscription_id
  IF p_subscription_id IS NULL OR trim(p_subscription_id) = '' THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Parâmetro p_subscription_id inválido ou vazio';
    RETURN;
  END IF;

  v_clean_sub_id := trim(p_subscription_id);
  v_clean_cust_id := NULLIF(trim(COALESCE(p_customer_id, '')), '');

  -- 2. Bloqueia linha da clínica com SELECT ... FOR UPDATE por subscription_id
  SELECT
    c.id,
    c.status_assinatura,
    c.stripe_subscription_id,
    c.stripe_customer_id,
    c.cancelamento_em,
    c.periodo_fim,
    c.ativo,
    c.stripe_last_event_at,
    c.stripe_subscription_created
  INTO v_clinica
  FROM public.clinicas c
  WHERE c.stripe_subscription_id = v_clean_sub_id
  FOR UPDATE;

  -- 3. Fallback atômico por customer_id com verificação de unicidade
  IF NOT FOUND AND v_clean_cust_id IS NOT NULL THEN
    SELECT count(*) INTO v_count_by_customer
    FROM public.clinicas c
    WHERE c.stripe_customer_id = v_clean_cust_id;

    IF v_count_by_customer > 1 THEN
      RETURN QUERY SELECT NULL::UUID, FALSE, 'Ambiguidade: múltiplos registros de clínica encontrados para o stripe_customer_id informado';
      RETURN;
    END IF;

    IF v_count_by_customer = 1 THEN
      SELECT
        c.id,
        c.status_assinatura,
        c.stripe_subscription_id,
        c.stripe_customer_id,
        c.cancelamento_em,
        c.periodo_fim,
        c.ativo,
        c.stripe_last_event_at,
        c.stripe_subscription_created
      INTO v_clinica
      FROM public.clinicas c
      WHERE c.stripe_customer_id = v_clean_cust_id
      FOR UPDATE;
    END IF;
  END IF;

  IF v_clinica.id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Clínica não encontrada para subscription/customer informado';
    RETURN;
  END IF;

  -- 4. Validação de divergência de Customer ID: nunca permite alterar customer já registrado
  IF v_clinica.stripe_customer_id IS NOT NULL AND v_clean_cust_id IS NOT NULL AND v_clinica.stripe_customer_id != v_clean_cust_id THEN
    RETURN QUERY SELECT
      v_clinica.id,
      FALSE,
      'Divergência de Stripe Customer ID: não é permitido alterar o customer registrado';
    RETURN;
  END IF;

  v_is_replacement := (v_clinica.stripe_subscription_id IS NOT NULL AND v_clinica.stripe_subscription_id != v_clean_sub_id);

  -- 5. Vinculação inicial quando stripe_subscription_id IS NULL
  IF v_clinica.stripe_subscription_id IS NULL THEN
    IF p_subscription_created IS NULL THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Vinculação de nova assinatura via fatura exige comprovação temporal confiável de subscription.created';
      RETURN;
    END IF;

    IF v_clinica.status_assinatura = 'cancelado' THEN
      IF v_clinica.cancelamento_em IS NULL THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Clínica cancelada sem registro de cancelamento_em — vinculação bloqueada';
        RETURN;
      END IF;

      IF p_subscription_created <= v_clinica.cancelamento_em THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Assinatura foi criada antes ou durante o cancelamento — vinculação bloqueada';
        RETURN;
      END IF;

      IF p_event_created IS NOT NULL AND p_event_created <= v_clinica.cancelamento_em THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Evento gerado antes ou durante o cancelamento — evento fora de ordem bloqueado';
        RETURN;
      END IF;
    END IF;
  END IF;

  -- 6. Concorrência e integridade: fatura pertence a assinatura DIFERENTE da atual
  IF v_is_replacement THEN
    IF v_clinica.status_assinatura = 'ativo' THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Clínica já possui assinatura ativa diferente da informada na fatura — substituição bloqueada';
      RETURN;
    END IF;

    IF v_clinica.status_assinatura = 'inadimplente' THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Clínica inadimplente com outra assinatura vinculada — substituição não autorizada bloqueada';
      RETURN;
    END IF;

    IF v_clinica.status_assinatura != 'cancelado' THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Clínica possui assinatura vinculada em estado não cancelado — substituição bloqueada';
      RETURN;
    END IF;

    IF v_clinica.status_assinatura = 'cancelado' THEN
      IF v_clinica.cancelamento_em IS NULL THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Clínica cancelada sem registro de cancelamento_em — reativação/substituição bloqueada';
        RETURN;
      END IF;

      IF p_subscription_created IS NULL THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Ausência de comprovação temporal de subscription.created confiável — reativação bloqueada';
        RETURN;
      END IF;

      IF p_subscription_created <= v_clinica.cancelamento_em THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Assinatura foi criada antes ou durante o cancelamento — reativação bloqueada';
        RETURN;
      END IF;

      IF p_invoice_period_end IS NOT NULL AND p_invoice_period_end < v_clinica.cancelamento_em THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Fatura pertence a período anterior ao cancelamento — evento fora de ordem bloqueado';
        RETURN;
      END IF;

      IF p_event_created IS NOT NULL AND p_event_created <= v_clinica.cancelamento_em THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Evento gerado antes ou durante o cancelamento — evento fora de ordem bloqueado';
        RETURN;
      END IF;
    END IF;
  END IF;

  -- 7. Tratamento quando a clínica se encontra cancelada e o evento é para a MESMA assinatura
  IF NOT v_is_replacement AND v_clinica.status_assinatura = 'cancelado' THEN
    IF v_clinica.stripe_subscription_id IS NOT NULL AND v_clinica.stripe_subscription_id = v_clean_sub_id THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Assinatura da fatura já foi cancelada no sistema — reativação bloqueada';
      RETURN;
    END IF;

    IF p_invoice_period_end IS NOT NULL AND v_clinica.cancelamento_em IS NOT NULL AND p_invoice_period_end < v_clinica.cancelamento_em THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Fatura pertence a período anterior ao cancelamento — evento fora de ordem bloqueado';
      RETURN;
    END IF;
  END IF;

  -- 8. Evento antigo descartado para mesma assinatura
  IF NOT v_is_replacement AND v_clinica.stripe_last_event_at IS NOT NULL AND p_event_created IS NOT NULL THEN
    IF p_event_created < v_clinica.stripe_last_event_at THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Evento antigo descartado: timestamp do evento anterior ao último processado';
      RETURN;
    END IF;
  END IF;

  -- 9. Atualiza a clínica na mesma transação atômica sob FOR UPDATE
  v_new_last_event_at := CASE
    WHEN v_is_replacement THEN COALESCE(p_event_created, now())
    ELSE GREATEST(COALESCE(v_clinica.stripe_last_event_at, '-infinity'::timestamptz), COALESCE(p_event_created, now()))
  END;

  UPDATE public.clinicas
  SET
    status_assinatura           = 'ativo',
    ativo                       = true,
    stripe_subscription_id      = v_clean_sub_id,
    stripe_customer_id          = COALESCE(v_clinica.stripe_customer_id, v_clean_cust_id),
    periodo_fim                 = COALESCE(p_invoice_period_end, v_clinica.periodo_fim),
    cancelamento_em             = NULL,
    stripe_last_event_at        = v_new_last_event_at,
    stripe_subscription_created = COALESCE(p_subscription_created, v_clinica.stripe_subscription_created),
    atualizado_em               = now()
  WHERE id = v_clinica.id;

  RETURN QUERY SELECT v_clinica.id, TRUE, NULL::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.stripe_apply_invoice_payment_succeeded(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_apply_invoice_payment_succeeded(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

COMMENT ON FUNCTION public.stripe_apply_invoice_payment_succeeded(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) IS
  'Ativa clínica após pagamento de fatura sob SELECT FOR UPDATE, exigindo assinatura válida e rejeitando ambiguidade no customer_id.';


-- ── 11. RPC: stripe_should_activate_on_invoice (Consulta Preliminar Informativa) ──
CREATE OR REPLACE FUNCTION public.stripe_should_activate_on_invoice(
  p_subscription_id      TEXT,
  p_customer_id          TEXT,
  p_invoice_period_end   TIMESTAMPTZ DEFAULT NULL,
  p_event_created        TIMESTAMPTZ DEFAULT NULL,
  p_subscription_created TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  clinica_id              UUID,
  deve_ativar             BOOLEAN,
  motivo_bloqueio         TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_clinica RECORD;
  v_clean_sub_id TEXT;
  v_clean_cust_id TEXT;
  v_count_by_customer INTEGER;
BEGIN
  -- 1. Validação estrita de p_subscription_id
  IF p_subscription_id IS NULL OR trim(p_subscription_id) = '' THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Parâmetro p_subscription_id inválido ou vazio';
    RETURN;
  END IF;

  v_clean_sub_id := trim(p_subscription_id);
  v_clean_cust_id := NULLIF(trim(COALESCE(p_customer_id, '')), '');

  -- 2. Busca clínica por subscription_id atual
  SELECT
    c.id,
    c.status_assinatura,
    c.stripe_subscription_id,
    c.stripe_customer_id,
    c.cancelamento_em,
    c.periodo_fim
  INTO v_clinica
  FROM public.clinicas c
  WHERE c.stripe_subscription_id = v_clean_sub_id
  LIMIT 1;

  -- 3. Fallback por customer_id com verificação de unicidade
  IF NOT FOUND AND v_clean_cust_id IS NOT NULL THEN
    SELECT count(*) INTO v_count_by_customer
    FROM public.clinicas c
    WHERE c.stripe_customer_id = v_clean_cust_id;

    IF v_count_by_customer > 1 THEN
      RETURN QUERY SELECT NULL::UUID, FALSE, 'Ambiguidade: múltiplos registros de clínica encontrados para o stripe_customer_id informado';
      RETURN;
    END IF;

    IF v_count_by_customer = 1 THEN
      SELECT
        c.id,
        c.status_assinatura,
        c.stripe_subscription_id,
        c.stripe_customer_id,
        c.cancelamento_em,
        c.periodo_fim
      INTO v_clinica
      FROM public.clinicas c
      WHERE c.stripe_customer_id = v_clean_cust_id;
    END IF;
  END IF;

  IF v_clinica.id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Clínica não encontrada para subscription/customer informado';
    RETURN;
  END IF;

  -- 4. Validação de divergência de Customer ID
  IF v_clinica.stripe_customer_id IS NOT NULL AND v_clean_cust_id IS NOT NULL AND v_clinica.stripe_customer_id != v_clean_cust_id THEN
    RETURN QUERY SELECT v_clinica.id, FALSE, 'Divergência de Stripe Customer ID: não é permitido alterar o customer registrado';
    RETURN;
  END IF;

  -- 5. Se a assinatura da fatura for DIFERENTE da assinatura registrada na clínica:
  IF v_clinica.stripe_subscription_id IS NOT NULL AND v_clinica.stripe_subscription_id != v_clean_sub_id THEN
    IF v_clinica.status_assinatura != 'cancelado' THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Clínica possui assinatura vinculada em estado não cancelado — substituição bloqueada';
      RETURN;
    END IF;

    IF v_clinica.cancelamento_em IS NOT NULL THEN
      IF p_subscription_created IS NULL THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Assinatura diferente da atual sem comprovação temporal de criação — substituição bloqueada';
        RETURN;
      END IF;

      IF p_subscription_created <= v_clinica.cancelamento_em THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Assinatura foi criada antes ou durante o cancelamento — reativação bloqueada';
        RETURN;
      END IF;
    END IF;
  END IF;

  -- 6. Tratamento quando a clínica está cancelada
  IF v_clinica.status_assinatura = 'cancelado' THEN
    IF v_clinica.stripe_subscription_id IS NOT NULL AND v_clinica.stripe_subscription_id = v_clean_sub_id THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Assinatura da fatura já foi cancelada no sistema — reativação bloqueada';
      RETURN;
    END IF;

    IF p_invoice_period_end IS NOT NULL AND v_clinica.cancelamento_em IS NOT NULL AND p_invoice_period_end < v_clinica.cancelamento_em THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Fatura pertence a período anterior ao cancelamento — evento fora de ordem bloqueado';
      RETURN;
    END IF;

    IF p_subscription_created IS NULL THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Ausência de comprovação temporal de subscription.created confiável — reativação bloqueada';
      RETURN;
    END IF;

    IF v_clinica.cancelamento_em IS NOT NULL AND p_subscription_created <= v_clinica.cancelamento_em THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Assinatura foi criada antes ou durante o cancelamento — reativação bloqueada';
      RETURN;
    END IF;

    IF v_clinica.cancelamento_em IS NOT NULL AND p_subscription_created > v_clinica.cancelamento_em THEN
      RETURN QUERY SELECT v_clinica.id, TRUE, NULL::TEXT;
      RETURN;
    END IF;

    RETURN QUERY SELECT
      v_clinica.id,
      FALSE,
      'Reativação não comprovada temporalmente após cancelamento';
      RETURN;
  END IF;

  RETURN QUERY SELECT v_clinica.id, TRUE, NULL::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.stripe_should_activate_on_invoice(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_should_activate_on_invoice(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ)
  TO service_role;

COMMENT ON FUNCTION public.stripe_should_activate_on_invoice(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) IS
  'Consulta preliminar estritamente informativa sem locks transacionais. A autorização definitiva e a mutação atômica são executadas exclusivamente por stripe_apply_invoice_payment_succeeded.';


-- ── 12. RPC: provisionar_novo_tenant (Super Admin e Customer ID Estrito) ───────
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
    v_clinica_id        UUID;
    v_clean_nome        TEXT;
    v_valid_plano       TEXT;
    v_clean_cust_id     TEXT;
    v_clean_sub_id      TEXT;
    v_jwt_role          TEXT;
    v_setting_role      TEXT;
    v_user_nome         TEXT;
    v_existing_cid      UUID;
    v_clinica           RECORD;
    v_user_rows         INTEGER;
    v_is_replacement    BOOLEAN;
    v_count_by_customer INTEGER;
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

    -- 3. Bloqueio estrito de super_admin antes de qualquer alteração ou inserção
    IF EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = p_user_id AND role = 'super_admin'
    ) THEN
        RAISE EXCEPTION '[OdontoSoft Security] Usuário super_admin não pode ser provisionado como admin_clinica.'
            USING ERRCODE = 'integrity_constraint_violation';
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

    v_clean_cust_id := NULLIF(trim(COALESCE(p_stripe_customer_id, '')), '');
    v_clean_sub_id  := NULLIF(trim(COALESCE(p_stripe_subscription_id, '')), '');

    -- 4. Concorrência: Assegura existência do perfil e aplica SELECT ... FOR UPDATE
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

    -- 5. Tratamento Idempotente Seguro para Usuário já Vinculado
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

        -- Validação de divergência de Customer ID: NÃO permite alterar ou divergir
        IF v_clinica.stripe_customer_id IS NOT NULL AND v_clean_cust_id IS NOT NULL AND v_clinica.stripe_customer_id != v_clean_cust_id THEN
            RAISE EXCEPTION '[OdontoSoft Security] Divergência de Stripe Customer ID: não é permitido alterar o customer registrado (%) para (%).', v_clinica.stripe_customer_id, v_clean_cust_id
                USING ERRCODE = 'integrity_constraint_violation';
        END IF;

        v_is_replacement := (v_clinica.stripe_subscription_id IS NOT NULL AND v_clean_sub_id IS NOT NULL AND v_clinica.stripe_subscription_id != v_clean_sub_id);

        -- Se a clínica estiver cancelada: NUNCA reativa sem comprovação temporal válida pós-cancelamento
        IF v_clinica.status_assinatura = 'cancelado' THEN
            IF v_clean_sub_id IS NOT NULL
               AND (v_clinica.stripe_subscription_id IS NULL OR v_clinica.stripe_subscription_id != v_clean_sub_id)
               AND v_clinica.cancelamento_em IS NOT NULL
               AND p_subscription_created IS NOT NULL
               AND p_subscription_created > v_clinica.cancelamento_em
               AND (p_event_created IS NULL OR p_event_created > v_clinica.cancelamento_em) THEN

                UPDATE public.clinicas
                SET stripe_customer_id          = COALESCE(v_clinica.stripe_customer_id, v_clean_cust_id),
                    stripe_subscription_id      = v_clean_sub_id,
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
                NULL;
            END IF;

            RETURN v_existing_cid;
        END IF;

        -- Se a clínica já possui outra assinatura (ativo, inadimplente, pendente, trial, etc.): bloqueia substituição
        IF v_is_replacement THEN
            RETURN v_existing_cid;
        END IF;

        -- Vinculação inicial exige comprovação temporal
        IF v_clinica.stripe_subscription_id IS NULL AND v_clean_sub_id IS NOT NULL THEN
            IF p_subscription_created IS NULL THEN
                RAISE EXCEPTION '[OdontoSoft Security] Vinculação de assinatura Stripe exige comprovação temporal confiável (p_subscription_created).'
                    USING ERRCODE = 'invalid_parameter_value';
            END IF;
        END IF;

        -- Proteção contra eventos atrasados para a mesma assinatura
        IF NOT v_is_replacement AND v_clinica.stripe_last_event_at IS NOT NULL AND p_event_created IS NOT NULL THEN
            IF p_event_created < v_clinica.stripe_last_event_at THEN
                RETURN v_existing_cid;
            END IF;
        END IF;

        -- Atualização idempotente segura preservando Customer ID existente
        UPDATE public.clinicas
        SET stripe_customer_id          = COALESCE(v_clinica.stripe_customer_id, v_clean_cust_id),
            stripe_subscription_id      = COALESCE(v_clean_sub_id, stripe_subscription_id),
            plano_preco_id              = COALESCE(p_plano_preco_id, plano_preco_id),
            stripe_last_event_at        = GREATEST(COALESCE(v_clinica.stripe_last_event_at, '-infinity'::timestamptz), COALESCE(p_event_created, now())),
            stripe_subscription_created = COALESCE(p_subscription_created, v_clinica.stripe_subscription_created),
            atualizado_em               = now()
        WHERE id = v_existing_cid;

        RETURN v_existing_cid;
    END IF;

    -- 6. Integração Temporal no Provisionamento de Novo Tenant:
    IF v_clean_sub_id IS NOT NULL AND p_subscription_created IS NULL THEN
        RAISE EXCEPTION '[OdontoSoft Security] Provisionamento com assinatura Stripe exige comprovação temporal confiável (p_subscription_created).'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- 7. Verificação de Unicidade de Customer ID para nova clínica
    IF v_clean_cust_id IS NOT NULL THEN
        SELECT count(*) INTO v_count_by_customer
        FROM public.clinicas c
        WHERE c.stripe_customer_id = v_clean_cust_id;

        IF v_count_by_customer > 0 THEN
            RAISE EXCEPTION '[OdontoSoft Security] Stripe Customer ID (%) já vinculado a outra clínica existente.', v_clean_cust_id
                USING ERRCODE = 'unique_violation';
        END IF;
    END IF;

    v_clinica_id := gen_random_uuid();
    v_clean_nome := COALESCE(NULLIF(trim(p_nome_clinica), ''), 'Minha Clínica');

    -- 8. Criação da Clínica
    INSERT INTO public.clinicas (
        id, nome, plano, status_assinatura,
        stripe_customer_id, stripe_subscription_id, plano_preco_id, ativo,
        stripe_last_event_at, stripe_subscription_created
    ) VALUES (
        v_clinica_id, v_clean_nome,
        v_valid_plano, 'ativo',
        v_clean_cust_id, v_clean_sub_id, p_plano_preco_id, true,
        COALESCE(p_event_created, now()), p_subscription_created
    );

    -- 9. Configurações da clínica
    INSERT INTO public.clinica_settings (clinica_id, nome, nome_exibido)
    VALUES (v_clinica_id, v_clean_nome, v_clean_nome)
    ON CONFLICT (clinica_id) DO UPDATE
        SET nome = EXCLUDED.nome, nome_exibido = EXCLUDED.nome_exibido;

    -- 10. Extração defensiva de nome do usuário
    SELECT COALESCE(raw_user_meta_data->>'nome', raw_user_meta_data->>'full_name', split_part(email, '@', 1), 'Administrador')
    INTO v_user_nome
    FROM auth.users
    WHERE id = p_user_id;

    -- 11. Vinculação do perfil do usuário como admin_clinica
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
  'Provisiona novo tenant B2B com bloqueio estrito de super_admin, validação de divergência e unicidade de Customer ID.';

COMMIT;
