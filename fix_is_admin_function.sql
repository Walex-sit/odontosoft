-- ============================================================
-- SCRIPT DE CORREÇÃO: Função public.is_admin() e Políticas RLS
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Garante que o tipo ENUM user_role existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'dentista', 'recepcao', 'financeiro');
  END IF;
END $$;

-- 2. Criar ou Substituir a função public.is_admin()
-- Usamos SECURITY DEFINER para evitar recursão infinita nas políticas RLS da tabela user_profiles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND (role = 'admin' OR role::text = 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Garantir permissão de execução da função para usuários autenticados
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- 3. Atualizar/Recriar Políticas RLS para a tabela user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.user_profiles FOR SELECT 
USING (
  public.is_admin() OR auth.uid() = id
);

DROP POLICY IF EXISTS "Admins can update profiles" ON public.user_profiles;
CREATE POLICY "Admins can update profiles" 
ON public.user_profiles FOR UPDATE
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);

-- 4. Garantir RLS e políticas para tabelas das novas telas (Estoque, Comissões, etc. se existirem no banco)

-- Tabela: estoque (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'estoque') THEN
    ALTER TABLE public.estoque ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Autenticados leem estoque" ON public.estoque;
    CREATE POLICY "Autenticados leem estoque" ON public.estoque FOR SELECT USING (auth.role() = 'authenticated');
    DROP POLICY IF EXISTS "Admins gerenciam estoque" ON public.estoque;
    CREATE POLICY "Admins gerenciam estoque" ON public.estoque FOR ALL USING (public.is_admin());
  END IF;
END $$;

-- Tabela: comissoes (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'comissoes') THEN
    ALTER TABLE public.comissoes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admins e Dentistas veem comissoes" ON public.comissoes;
    CREATE POLICY "Admins e Dentistas veem comissoes" ON public.comissoes FOR SELECT USING (auth.role() = 'authenticated');
    DROP POLICY IF EXISTS "Admins gerenciam comissoes" ON public.comissoes;
    CREATE POLICY "Admins gerenciam comissoes" ON public.comissoes FOR ALL USING (public.is_admin());
  END IF;
END $$;

-- Notificar PostgREST para recarregar o schema cache imediatamente
NOTIFY pgrst, 'reload schema';
