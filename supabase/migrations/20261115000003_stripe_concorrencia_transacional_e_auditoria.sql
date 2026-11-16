-- ================================================================================
-- Migration: 20261115000003_stripe_concorrencia_transacional_e_auditoria.sql
-- Descrição:
--   1. Concorrência e Transacionalidade de Assinaturas (SELECT ... FOR UPDATE):
--      - Adiciona stripe_last_event_at e stripe_subscription_created em clinicas.
--      - public.stripe_apply_subscription_update(): Validação e mutação atômica
--        de ciclo de vida de assinatura sob SELECT ... FOR UPDATE.
--      - public.stripe_apply_invoice_payment_succeeded(): Validação e ativação
--        atômica de fatura paga sob SELECT ... FOR UPDATE.
--      - public.stripe_apply_invoice_payment_failed(): Proteção temporal de
--        inadimplência sob SELECT ... FOR UPDATE.
--      - public.stripe_apply_checkout_completed(): Ativação atômica de checkout
--        session sob SELECT ... FOR UPDATE.
--      - public.stripe_apply_subscription_deleted(): Cancelamento concorrente
--        seguro impedindo que sub antiga cancele sub nova.
--   2. Correção da Ordenação Temporal:
--      - Evita envenenamento de timestamps: ao substituir assinatura, stripe_last_event_at
--        é reinicializado para o evento da nova assinatura, sem ser bloqueado pelo
--        timestamp da assinatura anterior.
--      - Tratamento anti-regressão para timestamps idênticos (eventos no mesmo segundo).
--   3. stripe_fail_event Hardening:
--      - Validação segura de claim_token UUID sem crash em strings inválidas.
--      - Sanitização interna de erros contra caracteres de controle.
--      - Proteção contra workers antigos alterando o estado de outro worker.
--   4. Auditoria LGPD e CFO:
--      - Corrige comentários de private.fn_audit_trigger() esclarecendo retenção
--        legal de metadados para auditoria (LGPD Art. 6, VII / Art. 16), sem duplicar
--        conteúdo clínico (descrição, evolução, tratamento) em logs genéricos.
-- ================================================================================

BEGIN;

-- ── 1. Colunas de Rastreabilidade Concorrente na Tabela Clinicas ───────────────
ALTER TABLE public.clinicas
  ADD COLUMN IF NOT EXISTS stripe_last_event_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_subscription_created TIMESTAMPTZ;

COMMENT ON COLUMN public.clinicas.stripe_last_event_at IS
  'Timestamp do evento Stripe mais recente aplicado com sucesso na assinatura atual.';

COMMENT ON COLUMN public.clinicas.stripe_subscription_created IS
  'Timestamp de criação real da assinatura Stripe ativa (subscription.created). Comprova legitimidade pós-cancelamento.';


-- ── 2. RPC: stripe_fail_event (Hardened com Tratamento Seguro de Token) ─────────
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
  IF p_claim_token IS NULL THEN
    RETURN FALSE;
  END IF;

  BEGIN
    v_token_uuid := p_claim_token::UUID;
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


-- ── 3. RPC: stripe_apply_subscription_update (Validação + Mutação Transacional) ─
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
BEGIN
  -- 1. Bloqueia linha da clínica com SELECT ... FOR UPDATE (mesma transação)
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
  WHERE c.stripe_subscription_id = p_subscription_id
  FOR UPDATE;

  -- Fallback concorrente seguro por customer_id
  IF NOT FOUND AND p_customer_id IS NOT NULL THEN
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
    WHERE c.stripe_customer_id = p_customer_id
    FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Clínica não encontrada para subscription/customer informado';
    RETURN;
  END IF;

  v_is_replacement := (v_clinica.stripe_subscription_id IS NOT NULL AND v_clinica.stripe_subscription_id != p_subscription_id);

  -- 2. Concorrência e integridade: assinatura diferente da atual registrada
  IF v_is_replacement THEN
    -- Se a clínica já está ativa com outra assinatura, NUNCA permite sobrescrever
    IF v_clinica.status_assinatura = 'ativo' THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Clínica já possui assinatura ativa diferente da informada — substituição bloqueada';
      RETURN;
    END IF;

    -- Se esteve cancelada, exige comprovação de criação posterior ao cancelamento
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

  -- 3. Validações estritas quando a clínica está cancelada
  IF v_clinica.status_assinatura = 'cancelado' THEN
    -- Bloqueio: Mesma assinatura já cancelada tentando reativar (terminal)
    IF v_clinica.stripe_subscription_id IS NOT NULL AND v_clinica.stripe_subscription_id = p_subscription_id AND p_status = 'ativo' THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Assinatura do evento já foi cancelada no sistema — reativação bloqueada';
      RETURN;
    END IF;

    -- Bloqueio: Evento gerado antes ou durante o cancelamento registrado
    IF p_event_created IS NOT NULL AND v_clinica.cancelamento_em IS NOT NULL AND p_event_created <= v_clinica.cancelamento_em AND p_status = 'ativo' THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Evento gerado antes ou durante o cancelamento — evento fora de ordem bloqueado';
      RETURN;
    END IF;

    -- Bloqueio: Sem comprovação temporal confiável de criação pós-cancelamento
    IF p_status = 'ativo' AND (p_subscription_created IS NULL OR (v_clinica.cancelamento_em IS NOT NULL AND p_subscription_created <= v_clinica.cancelamento_em)) THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Reativação pós-cancelamento exige assinatura comprovadamente criada após o cancelamento';
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

    -- Tratamento para timestamps iguais (mesmo segundo): não permitir regressões de estado
    IF p_event_created = v_clinica.stripe_last_event_at THEN
      IF v_clinica.status_assinatura = 'cancelado' AND p_status != 'cancelado' THEN
        RETURN QUERY SELECT v_clinica.id, FALSE, 'Regressão descartada: cancelamento não pode ser revertido no mesmo timestamp';
        RETURN;
      END IF;
      IF v_clinica.status_assinatura = 'ativo' AND p_status IN ('trial', 'pendente') THEN
        RETURN QUERY SELECT v_clinica.id, FALSE, 'Regressão descartada: assinatura ativa não retrocede no mesmo timestamp';
        RETURN;
      END IF;
    END IF;
  END IF;

  -- 5. Atualização atômica na mesma transação PostgreSQL sob FOR UPDATE
  -- Ao substituir assinatura, reinicializa o stripe_last_event_at para o evento da nova assinatura
  v_new_last_event_at := CASE
    WHEN v_is_replacement THEN COALESCE(p_event_created, now())
    ELSE GREATEST(COALESCE(v_clinica.stripe_last_event_at, '-infinity'::timestamptz), COALESCE(p_event_created, now()))
  END;

  UPDATE public.clinicas
  SET
    status_assinatura           = p_status,
    stripe_subscription_id      = p_subscription_id,
    stripe_customer_id          = COALESCE(p_customer_id, v_clinica.stripe_customer_id),
    periodo_fim                 = COALESCE(p_period_end, v_clinica.periodo_fim),
    cancelamento_em             = CASE
      WHEN p_status = 'cancelado' THEN COALESCE(p_event_created, now())
      WHEN p_status = 'ativo' THEN NULL
      ELSE v_clinica.cancelamento_em
    END,
    ativo                       = CASE
      WHEN p_status = 'ativo' THEN true
      WHEN p_status = 'cancelado' THEN false
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


-- ── 4. RPC: stripe_apply_invoice_payment_succeeded (Atômica Transacional) ──────
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
BEGIN
  -- 1. Bloqueia linha da clínica com SELECT ... FOR UPDATE
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
  WHERE c.stripe_subscription_id = p_subscription_id
  FOR UPDATE;

  -- Fallback atômico por customer_id
  IF NOT FOUND AND p_customer_id IS NOT NULL THEN
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
    WHERE c.stripe_customer_id = p_customer_id
    FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Clínica não encontrada para subscription/customer informado';
    RETURN;
  END IF;

  v_is_replacement := (v_clinica.stripe_subscription_id IS NOT NULL AND v_clinica.stripe_subscription_id != p_subscription_id);

  -- 2. Concorrência e integridade: fatura pertence a assinatura DIFERENTE da atual
  IF v_is_replacement THEN
    IF v_clinica.status_assinatura = 'ativo' THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Clínica já possui assinatura ativa diferente da informada na fatura — substituição bloqueada';
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

  -- 3. Tratamento quando a clínica se encontra cancelada
  IF v_clinica.status_assinatura = 'cancelado' THEN
    IF v_clinica.stripe_subscription_id IS NOT NULL AND v_clinica.stripe_subscription_id = p_subscription_id THEN
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
  END IF;

  -- 4. Evento antigo descartado para mesma assinatura
  IF NOT v_is_replacement AND v_clinica.stripe_last_event_at IS NOT NULL AND p_event_created IS NOT NULL THEN
    IF p_event_created < v_clinica.stripe_last_event_at THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Evento antigo descartado: timestamp do evento anterior ao último processado';
      RETURN;
    END IF;
  END IF;

  -- 5. Atualiza a clínica na mesma transação atômica
  v_new_last_event_at := CASE
    WHEN v_is_replacement THEN COALESCE(p_event_created, now())
    ELSE GREATEST(COALESCE(v_clinica.stripe_last_event_at, '-infinity'::timestamptz), COALESCE(p_event_created, now()))
  END;

  UPDATE public.clinicas
  SET
    status_assinatura           = 'ativo',
    ativo                       = true,
    stripe_subscription_id      = p_subscription_id,
    stripe_customer_id          = COALESCE(p_customer_id, v_clinica.stripe_customer_id),
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


-- ── 5. RPC: stripe_apply_invoice_payment_failed (Proteção Temporal de Inadimplência) ─
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
BEGIN
  -- 1. Bloqueia linha da clínica sob SELECT ... FOR UPDATE
  SELECT
    c.id,
    c.status_assinatura,
    c.stripe_subscription_id,
    c.stripe_last_event_at
  INTO v_clinica
  FROM public.clinicas c
  WHERE c.stripe_subscription_id = p_subscription_id
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
    AND stripe_subscription_id = p_subscription_id;

  RETURN QUERY SELECT v_clinica.id, TRUE, NULL::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.stripe_apply_invoice_payment_failed(TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_apply_invoice_payment_failed(TEXT, TIMESTAMPTZ) TO service_role;


-- ── 6. RPC: stripe_apply_checkout_completed (Ativação Transacional Segura) ────
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
    c.plano
  INTO v_clinica
  FROM public.clinicas c
  WHERE c.id = p_clinica_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Clínica não encontrada para o id informado';
    RETURN;
  END IF;

  v_is_replacement := (v_clinica.stripe_subscription_id IS NOT NULL AND v_clinica.stripe_subscription_id != p_subscription_id);

  -- 2. Se a clínica já possui outra assinatura ativa, impede substituição por checkout mais antigo
  IF v_is_replacement AND v_clinica.status_assinatura = 'ativo' THEN
    IF p_subscription_created IS NOT NULL AND v_clinica.stripe_subscription_created IS NOT NULL AND p_subscription_created < v_clinica.stripe_subscription_created THEN
      RETURN QUERY SELECT v_clinica.id, FALSE, 'Checkout de assinatura antiga descartado: existe assinatura mais recente ativa';
      RETURN;
    END IF;

    IF p_event_created IS NOT NULL AND v_clinica.stripe_last_event_at IS NOT NULL AND p_event_created < v_clinica.stripe_last_event_at THEN
      RETURN QUERY SELECT v_clinica.id, FALSE, 'Checkout com evento atrasado descartado: timestamp inferior ao evento ativo';
      RETURN;
    END IF;
  END IF;

  -- 3. Se cancelada, valida criação posterior ao cancelamento registrado
  IF v_clinica.status_assinatura = 'cancelado' AND v_clinica.cancelamento_em IS NOT NULL THEN
    IF p_subscription_created IS NOT NULL AND p_subscription_created <= v_clinica.cancelamento_em THEN
      RETURN QUERY SELECT v_clinica.id, FALSE, 'Checkout com assinatura criada antes ou durante o cancelamento rejeitado';
      RETURN;
    END IF;
  END IF;

  -- 4. Aplica ativação e atualiza billing atomicamente
  v_new_last_event_at := CASE
    WHEN v_is_replacement THEN COALESCE(p_event_created, now())
    ELSE GREATEST(COALESCE(v_clinica.stripe_last_event_at, '-infinity'::timestamptz), COALESCE(p_event_created, now()))
  END;

  UPDATE public.clinicas
  SET
    stripe_customer_id          = COALESCE(p_customer_id, v_clinica.stripe_customer_id),
    stripe_subscription_id      = COALESCE(p_subscription_id, v_clinica.stripe_subscription_id),
    status_assinatura           = 'ativo',
    plano                       = CASE WHEN p_plano = 'premium' THEN 'enterprise' ELSE COALESCE(p_plano, 'profissional') END,
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


-- ── 7. RPC: stripe_apply_subscription_deleted (Cancelamento Concorrente Seguro) ─
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
BEGIN
  SELECT
    c.id,
    c.status_assinatura,
    c.stripe_subscription_id,
    c.stripe_last_event_at
  INTO v_clinica
  FROM public.clinicas c
  WHERE c.stripe_subscription_id = p_subscription_id
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
    AND stripe_subscription_id = p_subscription_id;

  RETURN QUERY SELECT v_clinica.id, TRUE, NULL::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.stripe_apply_subscription_deleted(TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_apply_subscription_deleted(TEXT, TIMESTAMPTZ) TO service_role;


-- ── 8. Correção dos Comentários de Auditoria LGPD e CFO ───────────────────────
COMMENT ON FUNCTION private.fn_audit_trigger() IS
  'Trigger de auditoria LGPD e CFO. Para pacientes, prontuarios e evolucao: preserva a rastreabilidade '
  'estritamente necessária (identificadores e metadados como autor e IP para conformidade e segurança legal), '
  'sem duplicar conteúdo clínico sensível (diagnóstico, descrição, evolução ou tratamento) na trilha genérica '
  'de logs (private.audit_logs). O histórico clínico integral é preservado exclusivamente no armazenamento original.';

COMMIT;
