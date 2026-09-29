-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: fix_system_logs_policy
-- Objetivo: Blindar a tabela system_logs contra inserções diretas
--           por usuários autenticados via RLS.
--
-- Problema original: a role 'authenticated' tinha permissão de INSERT
-- na tabela system_logs, permitindo que qualquer usuário logado
-- inserisse logs arbitrários — risco de adulteração de auditoria.
--
-- Solução:
--  1. Revogar INSERT diretamente da role authenticated
--  2. Remover política de insert que contornava o REVOKE
--  3. Garantir que SELECT seja restrito a admins da própria clínica
--
-- Quem escreve em system_logs: APENAS funções SECURITY DEFINER
-- (ex: registrar_acao_auditoria) executadas com privilégio elevado.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Revogar permissão de INSERT da role authenticated na tabela system_logs
REVOKE INSERT ON public.system_logs FROM authenticated;

-- 2. Remover política antiga de insert (se existir) para garantir consistência
DROP POLICY IF EXISTS "system_logs_insert" ON public.system_logs;

-- 3. Garantir que a política de SELECT existe e está correta:
--    Apenas admins podem ler logs da sua própria clínica.
--    Remove versão antiga (se houver) antes de recriar para idempotência.
DROP POLICY IF EXISTS "system_logs_select" ON public.system_logs;

CREATE POLICY "system_logs_select"
  ON public.system_logs
  FOR SELECT
  USING (
    clinica_id = public.get_my_clinica_id()
    AND public.is_admin()
  );
