-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- FIX DEFINITIVO: Corrigir tenant do dentista + trigger para novos usuários
-- Execute no SQL Editor do Supabase (Dashboard → SQL Editor → New query)
-- Clínica principal: Dentalmedic  → 78733a3f-708c-4f08-8af3-94d0929707e4
-- Tenant errado:                  → e0fa057f-0753-41b2-b8c6-91d775d2b769
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ─── PASSO 1: Corrigir o dentista (e qualquer outro usuário no tenant errado) ──

UPDATE public.user_profiles
SET clinica_id = '78733a3f-708c-4f08-8af3-94d0929707e4'::uuid
WHERE clinica_id = 'e0fa057f-0753-41b2-b8c6-91d775d2b769'::uuid
   OR clinica_id IS NULL;

-- Confirmação:
SELECT id, nome, role, clinica_id FROM public.user_profiles ORDER BY role, nome;

-- ─── PASSO 2: Corrigir o trigger para novos usuários ─────────────────────────
-- O fix_rls_security.sql sobrescreveu o trigger sem o clinica_id.
-- Recriamos ele com o clinica_id fixo na clínica principal.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clinica_id uuid;
BEGIN
  -- Busca a clínica principal (a mais antiga com ativo = true)
  -- Fallback: qualquer clínica existente
  SELECT id INTO v_clinica_id
  FROM public.clinicas
  WHERE ativo = true
  ORDER BY criado_em ASC
  LIMIT 1;

  IF v_clinica_id IS NULL THEN
    SELECT id INTO v_clinica_id
    FROM public.clinicas
    ORDER BY criado_em ASC
    LIMIT 1;
  END IF;

  INSERT INTO public.user_profiles (id, nome, role, clinica_id)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.email,
      'Usuário'
    ),
    -- Segurança: role sempre inicia como 'recepcao'; admin promove depois
    'recepcao'::public.user_role,
    v_clinica_id
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- Recriar trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─── PASSO 3: Notificar PostgREST para recarregar o schema ───────────────────
NOTIFY pgrst, 'reload schema';

-- ─── PASSO 4: Verificação final ──────────────────────────────────────────────

-- Todos os usuários devem estar na Dentalmedic:
SELECT
  up.nome,
  up.role,
  up.clinica_id,
  c.nome AS clinica
FROM public.user_profiles up
LEFT JOIN public.clinicas c ON c.id = up.clinica_id
ORDER BY up.role, up.nome;

-- Confirmar quantidade de pacientes visíveis na clínica correta:
SELECT COUNT(*) AS pacientes_dentalmedic
FROM public.pacientes
WHERE clinica_id = '78733a3f-708c-4f08-8af3-94d0929707e4'::uuid;
