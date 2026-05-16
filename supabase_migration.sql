-- Habilitar extensão para UUIDs se não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Perfis e Usuários (Controle de Acesso)
CREATE TYPE user_role AS ENUM ('admin', 'dentista', 'recepcao', 'financeiro');

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome text NOT NULL,
  role user_role DEFAULT 'recepcao',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Logs do Sistema (Auditoria)
CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text NOT NULL,
  details jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Prontuários e Anexos
CREATE TABLE IF NOT EXISTS public.prontuarios (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  paciente_id uuid REFERENCES public.pacientes(id) ON DELETE CASCADE,
  dentista_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  descricao text NOT NULL,
  tratamento text,
  data_registro timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.anexos_prontuario (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  prontuario_id uuid REFERENCES public.prontuarios(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Financeiro: Despesas, Fornecedores, Compras e Notas Fiscais
CREATE TABLE IF NOT EXISTS public.despesas (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  descricao text NOT NULL,
  valor numeric NOT NULL,
  data_vencimento date NOT NULL,
  data_pagamento date,
  status text DEFAULT 'pendente',
  categoria text,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.fornecedores (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome text NOT NULL,
  cnpj text,
  telefone text,
  email text,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.compras (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  descricao text NOT NULL,
  valor_total numeric NOT NULL,
  data_compra date NOT NULL,
  status text DEFAULT 'concluido',
  user_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notas_fiscais (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  receita_id uuid REFERENCES public.receitas(id) ON DELETE SET NULL,
  numero_nota text NOT NULL,
  valor numeric NOT NULL,
  data_emissao date NOT NULL,
  link_pdf text,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Gatilho para inserir perfil automaticamente ao criar usuário no Auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, nome, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.email, 'Usuário'), 
    'admin'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Se o gatilho já existir, você terá que excluí-lo primeiro ou ignorar esse bloco
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Inserir os perfis para usuários já existentes
INSERT INTO public.user_profiles (id, nome, role)
SELECT id, email, 'admin' FROM auth.users
ON CONFLICT (id) DO NOTHING;
-- 10. Políticas de Segurança (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Permitir que qualquer usuário autenticado veja seu próprio perfil
CREATE POLICY "Users can view own profile" 
ON public.user_profiles FOR SELECT 
USING (auth.uid() = id);

-- Permitir que administradores vejam todos os perfis
CREATE POLICY "Admins can view all profiles" 
ON public.user_profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Permitir que administradores atualizem perfis (para mudar roles)
CREATE POLICY "Admins can update profiles" 
ON public.user_profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
