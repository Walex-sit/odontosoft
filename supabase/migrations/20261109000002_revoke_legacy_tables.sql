-- =====================================================================
-- OdontoSoft: fecha o acesso de clientes (anon, authenticated) as tabelas
-- legadas que nao tem coluna de clinica e nao sao usadas pelo app.
--
-- USE ESTA MIGRATION SOMENTE se a busca no codigo (.from("tabela")) nao
-- encontrou nenhuma dessas tabelas. Se alguma for usada, ela precisa de
-- uma coluna clinica_id e de uma policy, e deve sair da lista abaixo.
--
-- service_role (chave de servico) continua com acesso. RLS continua ligado.
-- Para devolver o acesso no futuro: GRANT ... ON TABLE public.<tabela> TO authenticated.
-- Idempotente.
-- =====================================================================
DO $legado$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'consultas','dentistas','materiais','medicamentos',
    'receituarios','pagamentos_assinaturas','debitos','itens_receituario'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
    END IF;
  END LOOP;
END
$legado$;
