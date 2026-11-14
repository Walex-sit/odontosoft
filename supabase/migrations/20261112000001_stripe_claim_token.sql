-- ================================================================================
-- Migration: 20261112000001_stripe_claim_token.sql
-- Descrição: 
--   1. Adiciona colunas claim_token e timeout_s na tabela private.stripe_webhook_events.
--   2. Elimina todas as sobrecargas antigas inseguras (sem token) de stripe_complete_event
--      e stripe_fail_event, impedindo contorno via assinaturas antigas de 1 ou 2 argumentos.
--   3. Recria stripe_claim_event, stripe_complete_event e stripe_fail_event exigindo claim_token.
--      A expiração avalia o timeout_s registrado na própria reserva do worker anterior.
--   4. Aprimora stripe_should_activate_on_invoice para validar ordenação temporal com p_event_created
--      e permitir reativação legítima exclusivamente para novas assinaturas posteriores ao cancelamento.
--   5. Blinda todas as permissões (REVOKE de PUBLIC, anon, authenticated; GRANT exclusivo a service_role)
--      com SECURITY DEFINER e search_path = ''.
-- ================================================================================

BEGIN;

-- ── 1. Adiciona colunas claim_token e timeout_s na tabela de idempotência ─────
ALTER TABLE private.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS claim_token UUID,
  ADD COLUMN IF NOT EXISTS timeout_s   INTEGER NOT NULL DEFAULT 300;

COMMENT ON COLUMN private.stripe_webhook_events.claim_token IS
  'Token de posse da reserva atual. Rotacionado a cada claim. '
  'complete/fail só atuam se o token conferir, eliminando race entre workers.';

COMMENT ON COLUMN private.stripe_webhook_events.timeout_s IS
  'Tempo em segundos concedido para o worker concluir antes de expirar a reserva.';

-- ── 2. Remoção Prévia de Sobrecargas Antigas Inseguras ────────────────────────
-- Remove sobrecargas antigas que permitiam concluir ou falhar sem token de claim:
DROP FUNCTION IF EXISTS public.stripe_complete_event(TEXT);
DROP FUNCTION IF EXISTS public.stripe_fail_event(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.stripe_should_activate_on_invoice(TEXT, TEXT, TIMESTAMPTZ);

-- ── 3. RPC: stripe_claim_event (com token de claim e timeout da reserva) ──────
CREATE OR REPLACE FUNCTION public.stripe_claim_event(
  p_event_id    TEXT,
  p_event_type  TEXT,
  p_timeout_s   INTEGER DEFAULT 300
)
RETURNS TEXT  -- 'claimed:<uuid>' | 'duplicate' | 'in_progress'
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now        TIMESTAMPTZ := clock_timestamp();
  v_new_token  UUID        := gen_random_uuid();
  v_claimed_id TEXT;
  v_status     TEXT;
BEGIN
  -- Verifica se o evento já foi processado com sucesso
  SELECT status INTO v_status
  FROM private.stripe_webhook_events
  WHERE id = p_event_id;

  IF v_status = 'processed' THEN
    RETURN 'duplicate';
  END IF;

  -- Tenta INSERT atômico (evento novo) com token de claim
  INSERT INTO private.stripe_webhook_events
    (id, event_type, status, claimed_at, attempts, claim_token, timeout_s)
  VALUES
    (p_event_id, p_event_type, 'processing', v_now, 1, v_new_token, COALESCE(p_timeout_s, 300))
  ON CONFLICT (id) DO UPDATE
    SET
      status      = 'processing',
      claimed_at  = v_now,
      attempts    = private.stripe_webhook_events.attempts + 1,
      last_error  = NULL,
      claim_token = v_new_token,
      timeout_s   = COALESCE(p_timeout_s, 300)
    WHERE
      -- Assume controle somente em 'failed' OU 'processing' expirado
      -- (a expiração usa o timeout_s gravado na reserva do worker anterior)
      private.stripe_webhook_events.status = 'failed'
      OR (
        private.stripe_webhook_events.status = 'processing'
        AND private.stripe_webhook_events.claimed_at + (private.stripe_webhook_events.timeout_s || ' seconds')::INTERVAL < v_now
      )
  RETURNING id INTO v_claimed_id;

  IF v_claimed_id IS NOT NULL THEN
    RETURN 'claimed:' || v_new_token::TEXT;
  ELSE
    RETURN 'in_progress';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.stripe_claim_event(TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_claim_event(TEXT, TEXT, INTEGER) TO service_role;

COMMENT ON FUNCTION public.stripe_claim_event IS
  'Reserva atomicamente um evento Stripe. '
  'Retorna ''claimed:<uuid>'' (token de posse), ''duplicate'' ou ''in_progress''. '
  'O token deve ser passado a stripe_complete_event e stripe_fail_event.';


-- ── 4. RPC: stripe_complete_event (exige p_claim_token) ──────────────────────
CREATE OR REPLACE FUNCTION public.stripe_complete_event(
  p_event_id    TEXT,
  p_claim_token TEXT
)
RETURNS BOOLEAN  -- TRUE = marcado; FALSE = token inválido/expirado (worker silenciado)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rows INTEGER;
BEGIN
  UPDATE private.stripe_webhook_events
  SET
    status       = 'processed',
    processed_at = clock_timestamp(),
    last_error   = NULL,
    claim_token  = NULL   -- libera o token após conclusão
  WHERE id          = p_event_id
    AND status      = 'processing'
    AND claim_token = p_claim_token::UUID;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.stripe_complete_event(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_complete_event(TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.stripe_complete_event(TEXT, TEXT) IS
  'Marca evento como processed. Retorna FALSE se o token não corresponder '
  '(worker expirou e outro assumiu). Sem efeito silencioso.';


-- ── 5. RPC: stripe_fail_event (exige p_claim_token) ──────────────────────────
CREATE OR REPLACE FUNCTION public.stripe_fail_event(
  p_event_id    TEXT,
  p_claim_token TEXT,
  p_error_msg   TEXT DEFAULT NULL
)
RETURNS BOOLEAN  -- TRUE = registrado; FALSE = token inválido (worker silenciado)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_safe_error TEXT    := left(coalesce(p_error_msg, 'unknown error'), 500);
  v_rows       INTEGER;
BEGIN
  UPDATE private.stripe_webhook_events
  SET
    status      = 'failed',
    last_error  = v_safe_error,
    claim_token = NULL   -- libera token para permitir retry via nova claim
  WHERE id          = p_event_id
    AND status      = 'processing'
    AND claim_token = p_claim_token::UUID;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.stripe_fail_event(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_fail_event(TEXT, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.stripe_fail_event(TEXT, TEXT, TEXT) IS
  'Registra falha no evento. Retorna FALSE se token não corresponder. '
  'Libera claim_token para que o próximo worker possa re-reivindicar via stripe_claim_event.';


-- ── 6. RPC: stripe_should_activate_on_invoice (com ordenação temporal) ────────
CREATE OR REPLACE FUNCTION public.stripe_should_activate_on_invoice(
  p_subscription_id    TEXT,
  p_customer_id        TEXT,
  p_invoice_period_end TIMESTAMPTZ DEFAULT NULL,
  p_event_created      TIMESTAMPTZ DEFAULT NULL
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
BEGIN
  -- Busca por subscription_id atual
  SELECT
    c.id,
    c.status_assinatura,
    c.stripe_subscription_id,
    c.cancelamento_em,
    c.periodo_fim
  INTO v_clinica
  FROM public.clinicas c
  WHERE c.stripe_subscription_id = p_subscription_id
  LIMIT 1;

  -- Fallback por customer_id se não encontrou pela subscription (nova sub para mesmo cliente)
  IF NOT FOUND AND p_customer_id IS NOT NULL THEN
    SELECT
      c.id,
      c.status_assinatura,
      c.stripe_subscription_id,
      c.cancelamento_em,
      c.periodo_fim
    INTO v_clinica
    FROM public.clinicas c
    WHERE c.stripe_customer_id = p_customer_id
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Clínica não encontrada para subscription/customer';
    RETURN;
  END IF;

  -- Se a clínica já está cancelada:
  IF v_clinica.status_assinatura = 'cancelado' THEN
    -- Caso A: Fatura pertence à MESMA assinatura que foi cancelada → NUNCA reativa (assinatura terminal)
    IF v_clinica.stripe_subscription_id IS NOT NULL AND v_clinica.stripe_subscription_id = p_subscription_id THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Assinatura da fatura já foi cancelada no sistema — reativação bloqueada';
      RETURN;
    END IF;

    -- Caso B: Fatura criada antes ou no momento do cancelamento registrado → evento fora de ordem
    IF p_event_created IS NOT NULL
       AND v_clinica.cancelamento_em IS NOT NULL
       AND p_event_created <= v_clinica.cancelamento_em THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Evento de fatura gerado antes ou durante o cancelamento — evento fora de ordem bloqueado';
      RETURN;
    END IF;

    -- Caso C: Período da fatura é anterior ao cancelamento
    IF p_invoice_period_end IS NOT NULL
       AND v_clinica.cancelamento_em IS NOT NULL
       AND p_invoice_period_end < v_clinica.cancelamento_em THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Fatura pertence a período anterior ao cancelamento — evento fora de ordem bloqueado';
      RETURN;
    END IF;

    -- Caso D: Se é uma nova assinatura e foi criada APÓS o cancelamento, permite reativação
    IF p_event_created IS NOT NULL
       AND v_clinica.cancelamento_em IS NOT NULL
       AND p_event_created > v_clinica.cancelamento_em THEN
      RETURN QUERY SELECT v_clinica.id, TRUE, NULL::TEXT;
      RETURN;
    END IF;

    -- Fallback de segurança para fatura sem timestamp criada após cancelamento
    IF v_clinica.stripe_subscription_id != p_subscription_id THEN
      RETURN QUERY SELECT v_clinica.id, TRUE, NULL::TEXT;
      RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT v_clinica.id, TRUE, NULL::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.stripe_should_activate_on_invoice(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_should_activate_on_invoice(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ)
  TO service_role;

COMMENT ON FUNCTION public.stripe_should_activate_on_invoice IS
  'Verifica se um evento invoice.payment_succeeded deve reativar a clínica. '
  'Valida ordenação temporal via p_event_created e p_invoice_period_end contra cancelamento_em.';

COMMIT;
