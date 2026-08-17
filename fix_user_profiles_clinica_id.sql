-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- FIX: Preencher clinica_id em user_profiles para usuários sem tenant
-- Execute este script no SQL Editor do Supabase (projeto remoto)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- PASSO 1: Diagnóstico — ver quais usuários estão sem clinica_id
SELECT
  up.id,
  up.nome,
  up.role,
  up.clinica_id,
  au.email
FROM public.user_profiles up
JOIN auth.users au ON au.id = up.id
WHERE up.clinica_id IS NULL
ORDER BY up.role, up.nome;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PASSO 2: Ver as clínicas disponíveis (para identificar qual ID usar)
SELECT id, nome FROM public.clinicas ORDER BY created_at LIMIT 10;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PASSO 3: Vincular todos os usuários sem clinica_id à primeira clínica existente
-- (ajuste o WHERE se quiser vincular só dentistas, ou a uma clínica específica)
UPDATE public.user_profiles
SET clinica_id = (SELECT id FROM public.clinicas ORDER BY created_at LIMIT 1)
WHERE clinica_id IS NULL
  AND EXISTS (SELECT 1 FROM public.clinicas LIMIT 1);

-- PASSO 4: Confirmar o resultado
SELECT
  up.id,
  up.nome,
  up.role,
  up.clinica_id,
  c.nome AS clinica_nome
FROM public.user_profiles up
LEFT JOIN public.clinicas c ON c.id = up.clinica_id
ORDER BY up.role, up.nome;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PASSO 5 (OPCIONAL): Garantir que a policy de SELECT de pacientes
-- permita qualquer autenticado da mesma clínica (idempotente)
DROP POLICY IF EXISTS "pacientes: tenant seleciona" ON public.pacientes;
CREATE POLICY "pacientes: tenant seleciona"
ON public.pacientes FOR SELECT
USING (clinica_id = public.get_my_clinica_id());

-- Garante que a função get_my_clinica_id não retorne NULL quando clinica_id for NULL
CREATE OR REPLACE FUNCTION public.get_my_clinica_id()
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  SELECT clinica_id INTO v_id FROM public.user_profiles WHERE id = auth.uid();
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_clinica_id() TO authenticated;
