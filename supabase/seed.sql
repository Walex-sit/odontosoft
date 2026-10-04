-- supabase/seed.sql
-- Injeta a chave de criptografia de CPF de teste local na tabela privada de segredos
INSERT INTO private.secrets (key, value)
VALUES ('cpf_key', 'chave-secreta-local-odonto-2026')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
