-- ==============================================================================
-- Migration: 20261102000001_trial_and_lifetime_access.sql
-- Descrição: Período de trial (7 dias) + flag de acesso vitalício para Super Admin
-- ==============================================================================

-- ── 1. Campo de expiração do trial na tabela clinicas ─────────────────────────
ALTER TABLE public.clinicas
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ
    DEFAULT (now() + INTERVAL '7 days');

COMMENT ON COLUMN public.clinicas.trial_ends_at IS
  'Data e hora em que o período de trial gratuito expira. NULL = sem trial (plano ativo pago).';

-- ── 2. Flags de acesso especial em user_profiles ──────────────────────────────
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_lifetime BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.user_profiles.is_lifetime IS
  'Quando true, este utilizador tem acesso vitalício irrestrito — nunca é bloqueado por expiração de trial ou inadimplência. Reservado ao proprietário do sistema / Super Admin.';

-- Adicionar 'super_admin' ao enum de roles de forma retrocompatível
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'super_admin';

-- Registar o Super Admin de desenvolvimento como vitalício (via email seguro)
-- ATENÇÃO: Substitua 'testealex@gmail.com' pelo email real do proprietário em produção.
UPDATE public.user_profiles
SET
  is_lifetime = true,
  role        = 'admin'  -- garante role máxima
WHERE email IN (
  'testealex@gmail.com'
  -- adicione outros emails de proprietários aqui
);

-- ── 3. Garantia: clínicas já existentes no banco não devem ser penalizadas ────
--    Definir trial_ends_at como NULL (acesso irrestrito) para clínicas criadas
--    ANTES desta migração, para evitar lock-out retroativo.
UPDATE public.clinicas
SET trial_ends_at = NULL
WHERE criado_em < now() - INTERVAL '7 days'
  AND status_assinatura IN ('ativo', 'trial');

-- ── 4. Índice para performance das verificações de trial no proxy ─────────────
CREATE INDEX IF NOT EXISTS idx_clinicas_trial_ends_at
  ON public.clinicas (trial_ends_at)
  WHERE trial_ends_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_is_lifetime
  ON public.user_profiles (is_lifetime)
  WHERE is_lifetime = true;
