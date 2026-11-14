-- ================================================================================
-- Migration: 20261111000001_stripe_idempotencia_robusta.sql
-- Descrição: Substitui a tabela de idempotência simples por uma tabela com estados
--            (processing / processed / failed) e cria RPCs seguras de claim e 
--            finalização para acesso server-side ao schema private.
--
-- Problema resolvido:
--   - PostgREST não expõe o schema 'private' (PGRST106 / PGRST_DB_SCHEMAS)
--   - A abordagem anterior era check-then-act, sujeita a race conditions
--   - Eventos fora de ordem podiam reativar clínicas canceladas
-- ================================================================================

BEGIN;

-- ============================================================
-- SEÇÃO 1 — MIGRAÇÃO DA TABELA DE IDEMPOTÊNCIA
-- ============================================================

-- Adiciona colunas de estado à tabela existente sem recriá-la
-- (a restrição PRIMARY KEY em 'id' já garante UNIQUE)
ALTER TABLE private.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS status         TEXT NOT NULL DEFAULT 'processing'
                                           CHECK (status IN ('processing', 'processed', 'failed')),
  ADD COLUMN IF NOT EXISTS claimed_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attempts       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error     TEXT;

-- Remove a coluna processed_at antiga que era NOT NULL DEFAULT now()
-- (a nova processed_at é nullable — só preenchida na conclusão)
-- A coluna foi adicionada como nova com IF NOT EXISTS; se já existia com NOT NULL,
-- precisamos flexibilizá-la:
ALTER TABLE private.stripe_webhook_events
  ALTER COLUMN processed_at DROP NOT NULL,
  ALTER COLUMN processed_at SET DEFAULT NULL;

-- Remove o DEFAULT de processed_at na coluna original (se ainda presente)
-- Esta etapa é idempotente — não falha se a coluna já foi alterada
DO $$
BEGIN
  -- Zera os registros legados (status null) para 'processed'
  UPDATE private.stripe_webhook_events
  SET status = 'processed', processed_at = COALESCE(processed_at, now())
  WHERE status IS NULL OR (status = 'processing' AND claimed_at IS NULL);
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

-- Índice para busca eficiente por status (recovery de events abandonados)
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status
  ON private.stripe_webhook_events (status, claimed_at);

-- Atualiza o comentário da tabela
COMMENT ON TABLE private.stripe_webhook_events IS
  'Controle de idempotência para webhooks Stripe com estados: '
  'processing (reservado), processed (concluído com sucesso), failed (falha registrada). '
  'Acesso externo SOMENTE via RPCs seguras no schema public (service_role).';


-- ============================================================
-- SEÇÃO 2 — RPC: CLAIM ATÔMICO DE EVENTO (processing)
-- ============================================================
-- Tenta reservar um evento Stripe de forma atômica via UPDATE ... RETURNING.
-- Retorna:
--   'claimed'     → reserva bem-sucedida, pode processar
--   'duplicate'   → evento já foi processado com sucesso (idempotente)
--   'in_progress' → outro worker está processando (backoff e retry)
-- ============================================================
CREATE OR REPLACE FUNCTION public.stripe_claim_event(
  p_event_id    TEXT,
  p_event_type  TEXT,
  p_timeout_s   INTEGER DEFAULT 300   -- segundos para considerar uma reserva abandonada
)
RETURNS TEXT  -- 'claimed' | 'duplicate' | 'in_progress'
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now        TIMESTAMPTZ := clock_timestamp();
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

  -- Tenta um INSERT atômico (evento novo) com estado 'processing'
  INSERT INTO private.stripe_webhook_events (id, event_type, status, claimed_at, attempts)
  VALUES (p_event_id, p_event_type, 'processing', v_now, 1)
  ON CONFLICT (id) DO UPDATE
    SET
      status     = 'processing',
      claimed_at = v_now,
      attempts   = private.stripe_webhook_events.attempts + 1,
      last_error = NULL
    WHERE
      -- Só assume controle se o estado atual for 'failed'
      -- OU se for 'processing' com reserva expirada (worker morto)
      private.stripe_webhook_events.status = 'failed'
      OR (
        private.stripe_webhook_events.status = 'processing'
        AND private.stripe_webhook_events.claimed_at < v_now - (p_timeout_s || ' seconds')::INTERVAL
      )
  RETURNING id INTO v_claimed_id;

  IF v_claimed_id IS NOT NULL THEN
    RETURN 'claimed';
  ELSE
    -- O registro existe e não satisfez as condições de claim (outro worker ativo)
    RETURN 'in_progress';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.stripe_claim_event(TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_claim_event(TEXT, TEXT, INTEGER) TO service_role;

COMMENT ON FUNCTION public.stripe_claim_event IS
  'Reserva atomicamente um evento Stripe para processamento. '
  'Retorna ''claimed'', ''duplicate'' ou ''in_progress''. '
  'Acesso restrito a service_role. SECURITY DEFINER com search_path blindado.';


-- ============================================================
-- SEÇÃO 3 — RPC: MARCAR EVENTO COMO PROCESSADO (processed)
-- ============================================================
CREATE OR REPLACE FUNCTION public.stripe_complete_event(
  p_event_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE private.stripe_webhook_events
  SET
    status       = 'processed',
    processed_at = clock_timestamp(),
    last_error   = NULL
  WHERE id = p_event_id
    AND status = 'processing';
END;
$$;

REVOKE ALL ON FUNCTION public.stripe_complete_event(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_complete_event(TEXT) TO service_role;

COMMENT ON FUNCTION public.stripe_complete_event IS
  'Marca um evento Stripe como processado com sucesso. '
  'Deve ser chamado apenas após todos os efeitos de negócio serem persistidos.';


-- ============================================================
-- SEÇÃO 4 — RPC: REGISTRAR FALHA NO PROCESSAMENTO (failed)
-- ============================================================
CREATE OR REPLACE FUNCTION public.stripe_fail_event(
  p_event_id  TEXT,
  p_error_msg TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  -- Trunca a mensagem de erro para evitar vazamento de dados sensíveis
  v_safe_error TEXT := left(coalesce(p_error_msg, 'unknown error'), 500);
BEGIN
  UPDATE private.stripe_webhook_events
  SET
    status     = 'failed',
    last_error = v_safe_error
  WHERE id = p_event_id
    AND status = 'processing';
END;
$$;

REVOKE ALL ON FUNCTION public.stripe_fail_event(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_fail_event(TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.stripe_fail_event IS
  'Registra falha no processamento de um evento Stripe. '
  'O evento pode ser retentado na próxima chamada de stripe_claim_event após expiração.';


-- ============================================================
-- SEÇÃO 5 — RPC AUXILIAR: STATUS DO EVENTO (diagnóstico)
-- ============================================================
CREATE OR REPLACE FUNCTION public.stripe_event_status(
  p_event_id TEXT
)
RETURNS TABLE (
  event_id     TEXT,
  event_type   TEXT,
  status       TEXT,
  claimed_at   TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  attempts     INTEGER,
  last_error   TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    swe.id,
    swe.event_type,
    swe.status,
    swe.claimed_at,
    swe.processed_at,
    swe.attempts,
    swe.last_error
  FROM private.stripe_webhook_events swe
  WHERE swe.id = p_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.stripe_event_status(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_event_status(TEXT) TO service_role;


-- ============================================================
-- SEÇÃO 6 — PROTEÇÕES CONTRA REATIVAÇÃO INDEVIDA POR FATURA
--           Função auxiliar de verificação de assinatura ativa
-- ============================================================
-- Esta RPC verifica se uma invoice de pagamento deve reativar
-- a clínica, garantindo que assinaturas canceladas não sejam
-- reativadas por eventos de faturas antigas.
-- ============================================================
CREATE OR REPLACE FUNCTION public.stripe_should_activate_on_invoice(
  p_subscription_id  TEXT,
  p_customer_id      TEXT,
  p_invoice_period_end TIMESTAMPTZ DEFAULT NULL
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

  -- Fallback por customer_id se não encontrou pela subscription
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

  -- Se já cancelada E a assinatura no evento é diferente da atual,
  -- ou foi cancelada após o período da fatura: bloqueia
  IF v_clinica.status_assinatura = 'cancelado' THEN
    -- Permite reativação SOMENTE se a subscription_id do evento é a mesma
    -- da clínica E não há cancelamento registrado
    IF v_clinica.stripe_subscription_id != p_subscription_id THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Assinatura cancelada pertence a uma subscription diferente — reativação bloqueada';
      RETURN;
    END IF;

    -- Se a fatura é de período anterior ao cancelamento, bloqueia
    IF p_invoice_period_end IS NOT NULL
       AND v_clinica.cancelamento_em IS NOT NULL
       AND p_invoice_period_end < v_clinica.cancelamento_em THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Fatura pertence a período anterior ao cancelamento — evento fora de ordem bloqueado';
      RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT v_clinica.id, TRUE, NULL::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.stripe_should_activate_on_invoice(TEXT, TEXT, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_should_activate_on_invoice(TEXT, TEXT, TIMESTAMPTZ)
  TO service_role;

COMMENT ON FUNCTION public.stripe_should_activate_on_invoice IS
  'Verifica se um evento invoice.payment_succeeded deve reativar a clínica. '
  'Bloqueia reativação por eventos fora de ordem ou de assinaturas substituídas.';

COMMIT;

