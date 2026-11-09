-- ==============================================================================
-- Migration: 20261102000002_verification_codes.sql
-- Descrição: Tabela para validação de novos utilizadores via código de acesso OTP
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.user_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '15 minutes'),
  used BOOLEAN NOT NULL DEFAULT false,
  attempts INTEGER NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.user_verification_codes IS
  'Armazena códigos OTP de validação de e-mail no registo de novas clínicas.';

CREATE INDEX IF NOT EXISTS idx_user_verification_codes_lookup
  ON public.user_verification_codes (email, code, used, expires_at);

-- RLS: Apenas service_role pode ler e escrever os códigos
ALTER TABLE public.user_verification_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to verification codes" ON public.user_verification_codes;
CREATE POLICY "Service role has full access to verification codes"
  ON public.user_verification_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
