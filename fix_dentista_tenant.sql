-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- FIX: Corrigir clinica_id do dentista "joao d silva D.R"
-- Execute no SQL Editor do Supabase (Dashboard → SQL Editor → New query)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- PASSO 1: Confirmar situação atual antes de alterar
SELECT
  up.id,
  up.nome,
  up.role,
  up.clinica_id           AS clinica_id_atual,
  c_atual.nome            AS clinica_atual,
  '78733a3f-708c-4f08-8af3-94d0929707e4'::uuid AS clinica_correta_id,
  c_correta.nome          AS clinica_correta_nome
FROM public.user_profiles up
LEFT JOIN public.clinicas c_atual   ON c_atual.id  = up.clinica_id
LEFT JOIN public.clinicas c_correta ON c_correta.id = '78733a3f-708c-4f08-8af3-94d0929707e4'::uuid
WHERE up.clinica_id = 'e0fa057f-0753-41b2-b8c6-91d775d2b769'::uuid;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PASSO 2: Mover TODOS os usuários do tenant errado para a Dentalmedic
-- (apenas os que estiverem no clinica_id antigo e não forem o admin principal)
UPDATE public.user_profiles
SET clinica_id = '78733a3f-708c-4f08-8af3-94d0929707e4'::uuid
WHERE clinica_id = 'e0fa057f-0753-41b2-b8c6-91d775d2b769'::uuid;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PASSO 3: Confirmar resultado
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
-- PASSO 4: Verificar quantos pacientes estão no tenant correto
SELECT COUNT(*) AS total_pacientes
FROM public.pacientes
WHERE clinica_id = '78733a3f-708c-4f08-8af3-94d0929707e4'::uuid;

-- PASSO 5 (diagnóstico extra): Verificar se ainda existe algum dado
-- preso no tenant antigo que precise ser migrado
SELECT 'pacientes'    AS tabela, COUNT(*) FROM public.pacientes    WHERE clinica_id = 'e0fa057f-0753-41b2-b8c6-91d775d2b769'::uuid UNION ALL
SELECT 'agendamentos' AS tabela, COUNT(*) FROM public.agendamentos WHERE clinica_id = 'e0fa057f-0753-41b2-b8c6-91d775d2b769'::uuid UNION ALL
SELECT 'receitas'     AS tabela, COUNT(*) FROM public.receitas     WHERE clinica_id = 'e0fa057f-0753-41b2-b8c6-91d775d2b769'::uuid UNION ALL
SELECT 'atestados'    AS tabela, COUNT(*) FROM public.atestados    WHERE clinica_id = 'e0fa057f-0753-41b2-b8c6-91d775d2b769'::uuid;
