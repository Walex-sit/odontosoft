-- ============================================================
-- Migração: Módulo de Segurança e Conformidade (LGPD & Auditoria)
-- Execute este script no Supabase SQL Editor
-- ============================================================

-- 1. Adicionar campos de consentimento LGPD na tabela pacientes
ALTER TABLE public.pacientes
  ADD COLUMN IF NOT EXISTS lgpd_aceite boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS lgpd_aceite_em timestamp with time zone;

-- 2. Adicionar coluna user_nome em system_logs para exibição amigável
--    (denormalizado para evitar JOINs custosos na leitura do painel)
ALTER TABLE public.system_logs
  ADD COLUMN IF NOT EXISTS user_nome text;

-- 3. Criar índice para melhorar consultas por tipo de ação
CREATE INDEX IF NOT EXISTS idx_system_logs_action
  ON public.system_logs (action);

-- 4. Criar índice para ordenação por data (usado no painel de conformidade)
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at
  ON public.system_logs (created_at DESC);

-- 5. Criar índice LGPD para consulta de métricas de conformidade
CREATE INDEX IF NOT EXISTS idx_pacientes_lgpd_aceite
  ON public.pacientes (lgpd_aceite);

-- ============================================================
-- Verificação: rode as queries abaixo para confirmar as colunas
-- ============================================================
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'pacientes' AND column_name LIKE 'lgpd%';
--
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'system_logs' AND column_name = 'user_nome';
