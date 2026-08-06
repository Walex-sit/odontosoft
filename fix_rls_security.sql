-- ============================================================
-- SCRIPT DE SEGURANÇA: Corrigir RLS inseguro em pacientes e prontuarios
-- Substitui referências a user_metadata por public.user_profiles (fonte confiável)
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- PASSO 1: Garantir que a tabela de perfis existe e está correta
-- (fonte segura de role/identidade — não manipulável pelo cliente)
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('admin', 'dentista', 'recepcao', 'financeiro');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id   uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome text NOT NULL,
  role public.user_role DEFAULT 'recepcao',
  establishment_id uuid,  -- isolamento multi-clínica (futuro)
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ────────────────────────────────────────────────────────────
-- PASSO 2: Funções auxiliares SECURITY DEFINER
-- Leem public.user_profiles com privilégios elevados, evitando
-- recursão e tornando as políticas RLS simples e auditáveis.
-- ────────────────────────────────────────────────────────────

-- Verifica se o usuário atual é admin (via tabela segura, não via metadata)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
END;
$$;

-- Retorna a role do usuário atual (via tabela segura)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role::text INTO v_role
  FROM public.user_profiles
  WHERE id = auth.uid();
  RETURN COALESCE(v_role, 'recepcao');
END;
$$;

-- Garantir permissões de execução
GRANT EXECUTE ON FUNCTION public.is_admin()    TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- ────────────────────────────────────────────────────────────
-- PASSO 3: RLS em public.pacientes
-- Remove qualquer política antiga que use user_metadata
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas (incluindo as que podem usar user_metadata)
DROP POLICY IF EXISTS "Usuários autenticados podem ver pacientes"  ON public.pacientes;
DROP POLICY IF EXISTS "Authenticated users can read patients"      ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_select_policy"                    ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_insert_policy"                    ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_update_policy"                    ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_delete_policy"                    ON public.pacientes;
DROP POLICY IF EXISTS "Admins can do everything on pacientes"      ON public.pacientes;
DROP POLICY IF EXISTS "Allow authenticated to read pacientes"      ON public.pacientes;
DROP POLICY IF EXISTS "Allow authenticated to insert pacientes"    ON public.pacientes;
DROP POLICY IF EXISTS "Allow authenticated to update pacientes"    ON public.pacientes;
DROP POLICY IF EXISTS "Allow authenticated to delete pacientes"    ON public.pacientes;

-- Políticas seguras usando auth.uid() e public.user_profiles
-- SELECT: qualquer usuário autenticado pode ver pacientes da clínica
CREATE POLICY "pacientes: autenticados podem selecionar"
ON public.pacientes FOR SELECT
USING (auth.uid() IS NOT NULL);

-- INSERT: apenas usuários autenticados (admin, dentista, recepcao)
CREATE POLICY "pacientes: autenticados podem inserir"
ON public.pacientes FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: apenas admin ou dentista
CREATE POLICY "pacientes: admin e dentista podem atualizar"
ON public.pacientes FOR UPDATE
USING (public.get_my_role() IN ('admin', 'dentista'))
WITH CHECK (public.get_my_role() IN ('admin', 'dentista'));

-- DELETE: apenas admin
CREATE POLICY "pacientes: apenas admin pode excluir"
ON public.pacientes FOR DELETE
USING (public.is_admin());

-- ────────────────────────────────────────────────────────────
-- PASSO 4: RLS em public.prontuarios
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.prontuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prontuarios_select_policy"                     ON public.prontuarios;
DROP POLICY IF EXISTS "prontuarios_insert_policy"                     ON public.prontuarios;
DROP POLICY IF EXISTS "prontuarios_update_policy"                     ON public.prontuarios;
DROP POLICY IF EXISTS "prontuarios_delete_policy"                     ON public.prontuarios;
DROP POLICY IF EXISTS "Dentistas veem seus prontuários"               ON public.prontuarios;
DROP POLICY IF EXISTS "Authenticated users can read prontuarios"       ON public.prontuarios;
DROP POLICY IF EXISTS "Allow authenticated to read prontuarios"        ON public.prontuarios;
DROP POLICY IF EXISTS "Allow authenticated to insert prontuarios"      ON public.prontuarios;
DROP POLICY IF EXISTS "Allow authenticated to update prontuarios"      ON public.prontuarios;
DROP POLICY IF EXISTS "Allow authenticated to delete prontuarios"      ON public.prontuarios;

-- SELECT: autenticados veem todos os prontuários (acesso de clínica)
CREATE POLICY "prontuarios: autenticados podem selecionar"
ON public.prontuarios FOR SELECT
USING (auth.uid() IS NOT NULL);

-- INSERT: apenas dentistas e admins criam prontuários
CREATE POLICY "prontuarios: dentista e admin podem inserir"
ON public.prontuarios FOR INSERT
WITH CHECK (public.get_my_role() IN ('admin', 'dentista'));

-- UPDATE: dentista atualiza apenas os seus próprios, admin atualiza qualquer um
CREATE POLICY "prontuarios: dentista atualiza os seus, admin atualiza todos"
ON public.prontuarios FOR UPDATE
USING (
  public.is_admin()
  OR (public.get_my_role() = 'dentista' AND dentista_id = auth.uid())
)
WITH CHECK (
  public.is_admin()
  OR (public.get_my_role() = 'dentista' AND dentista_id = auth.uid())
);

-- DELETE: apenas admin
CREATE POLICY "prontuarios: apenas admin pode excluir"
ON public.prontuarios FOR DELETE
USING (public.is_admin());

-- ────────────────────────────────────────────────────────────
-- PASSO 5: RLS em public.user_profiles (reforço)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert for new users profile"   ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile"           ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles"         ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update profiles"           ON public.user_profiles;

-- Inserção via trigger (SECURITY DEFINER) — não precisa de policy de INSERT permissiva
CREATE POLICY "user_profiles: inserção via trigger"
ON public.user_profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- Cada usuário vê apenas o próprio perfil; admin vê todos
CREATE POLICY "user_profiles: próprio perfil ou admin"
ON public.user_profiles FOR SELECT
USING (auth.uid() = id OR public.is_admin());

-- Apenas admin atualiza perfis (para mudar roles)
CREATE POLICY "user_profiles: admin atualiza"
ON public.user_profiles FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ────────────────────────────────────────────────────────────
-- PASSO 6: Corrigir o trigger handle_new_user para NÃO depender
-- de raw_user_meta_data como fonte de role/autorização.
-- O nome pode vir de lá (é só apresentação), mas a role
-- sempre inicia como 'recepcao' (seguro).
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, nome, role)
  VALUES (
    new.id,
    -- nome é apenas apresentação — não afeta autorização
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.email,
      'Usuário'
    ),
    -- role SEMPRE começa como 'recepcao': admin promove via Dashboard
    'recepcao'::public.user_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- Recriar o trigger para garantir que usa a função atualizada
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- PASSO 7: Recarregar schema cache do PostgREST
-- ────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- VERIFICAÇÃO (rode após o script):
-- ============================================================
-- SELECT schemaname, tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('pacientes', 'prontuarios', 'user_profiles')
-- ORDER BY tablename, cmd;
