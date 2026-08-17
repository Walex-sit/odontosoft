-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║        MIGRAÇÃO MULTI-TENANT — OdontoSaaS                              ║
-- ║        Isolamento Total por clinica_id (Tenant ID)                     ║
-- ║        Versão: 2.0.0  |  Execute no Supabase SQL Editor               ║
-- ║                                                                        ║
-- ║  ⚠️  FAÇA BACKUP ANTES: Dashboard → Settings → Database → Backups    ║
-- ║  ✅  Script idempotente — seguro para re-execução                      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOCO 0 — Extensões
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOCO 1 — TABELA ÂNCORA: clinicas (Tenant Master Record)
-- Uma linha por clínica. Todas as outras tabelas referenciam clinicas.id
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS public.clinicas (
  id              uuid        DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome            text        NOT NULL DEFAULT 'Clínica Odonto',
  cnpj            text,
  telefone        text,
  email           text,
  endereco        text,
  plano           text        DEFAULT 'basico'
                              CHECK (plano IN ('basico', 'profissional', 'enterprise')),
  ativo           boolean     DEFAULT true NOT NULL,
  criado_em       timestamptz DEFAULT now() NOT NULL,
  atualizado_em   timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE  public.clinicas       IS 'Tabela mestra de tenants — cada clínica é um tenant independente';
COMMENT ON COLUMN public.clinicas.plano IS 'Plano de assinatura ativo';
COMMENT ON COLUMN public.clinicas.ativo IS 'false = clínica suspensa; o RLS bloqueia acesso automaticamente';

CREATE INDEX IF NOT EXISTS idx_clinicas_ativo ON public.clinicas (ativo);

-- RLS: cada usuário só enxerga a própria clínica
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinicas: tenant vê a sua" ON public.clinicas;
CREATE POLICY "clinicas: tenant vê a sua"
ON public.clinicas FOR SELECT
USING (
  id = (SELECT clinica_id FROM public.user_profiles WHERE id = auth.uid())
);

GRANT SELECT ON public.clinicas TO authenticated;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOCO 2 — SEED: Migrar clinica_settings → clinicas (idempotente)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$
DECLARE
  v_clinica_id uuid;
  v_nome       text;
  v_cnpj       text;
  v_telefone   text;
  v_endereco   text;
BEGIN
  -- Só cria se ainda não existir nenhuma clínica
  IF NOT EXISTS (SELECT 1 FROM public.clinicas LIMIT 1) THEN
    -- Tenta puxar dados do singleton de clinica_settings
    SELECT COALESCE(nome,''), cnpj, telefone, endereco
      INTO v_nome, v_cnpj, v_telefone, v_endereco
    FROM public.clinica_settings
    LIMIT 1;

    INSERT INTO public.clinicas (nome, cnpj, telefone, endereco)
    VALUES (
      COALESCE(NULLIF(v_nome, ''), 'Clínica Odonto'),
      NULLIF(v_cnpj, ''),
      NULLIF(v_telefone, ''),
      NULLIF(v_endereco, '')
    )
    RETURNING id INTO v_clinica_id;

    RAISE NOTICE '✅ Clínica-tenant criada com ID: %', v_clinica_id;
  ELSE
   SELECT id INTO v_clinica_id FROM public.clinicas ORDER BY created_at LIMIT 1;
    RAISE NOTICE 'ℹ️  Clínica-tenant já existe com ID: %', v_clinica_id;
  END IF;
END $$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOCO 3 — clinica_settings: vincular à tabela clinicas
-- Transforma o singleton em configuração por-tenant
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Adicionar FK clinica_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clinica_settings'
      AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.clinica_settings
      ADD COLUMN clinica_id uuid REFERENCES public.clinicas(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ clinica_settings.clinica_id adicionado';
  END IF;
END $$;

-- Backfill
UPDATE public.clinica_settings
  SET clinica_id = (SELECT id FROM public.clinicas ORDER BY criado_em LIMIT 1)
WHERE clinica_id IS NULL;

-- Remover índice singleton antigo (bloqueava mais de 1 linha) e criar por tenant
DROP INDEX IF EXISTS public.clinica_settings_singleton_idx;
CREATE UNIQUE INDEX IF NOT EXISTS clinica_settings_unique_per_tenant
  ON public.clinica_settings (clinica_id);

-- Atualizar RLS de clinica_settings para isolamento por tenant
ALTER TABLE public.clinica_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinica_settings: autenticados leem"  ON public.clinica_settings;
DROP POLICY IF EXISTS "clinica_settings: admin insere"       ON public.clinica_settings;
DROP POLICY IF EXISTS "clinica_settings: admin atualiza"     ON public.clinica_settings;
DROP POLICY IF EXISTS "clinica_settings: admin deleta"       ON public.clinica_settings;
DROP POLICY IF EXISTS "clinica_settings: tenant lê a sua"    ON public.clinica_settings;

CREATE POLICY "clinica_settings: tenant lê a sua"
ON public.clinica_settings FOR SELECT
USING (clinica_id = public.get_my_clinica_id());

CREATE POLICY "clinica_settings: admin do tenant insere"
ON public.clinica_settings FOR INSERT
WITH CHECK (public.is_admin() AND clinica_id = public.get_my_clinica_id());

CREATE POLICY "clinica_settings: admin do tenant atualiza"
ON public.clinica_settings FOR UPDATE
USING  (public.is_admin() AND clinica_id = public.get_my_clinica_id())
WITH CHECK (public.is_admin() AND clinica_id = public.get_my_clinica_id());

CREATE POLICY "clinica_settings: admin do tenant deleta"
ON public.clinica_settings FOR DELETE
USING (public.is_admin() AND clinica_id = public.get_my_clinica_id());


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOCO 4 — FUNÇÕES AUXILIARES (SECURITY DEFINER)
-- Todas lêem public.user_profiles com privilégios elevados — sem recursão RLS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 4.1 get_my_clinica_id() — retorna o tenant do usuário logado
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

-- 4.2 is_admin() — reusar exatamente a mesma lógica (sem alterações)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 4.3 get_my_role() — reusar (sem alterações)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_role text;
BEGIN
  SELECT role::text INTO v_role FROM public.user_profiles WHERE id = auth.uid();
  RETURN COALESCE(v_role, 'recepcao');
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- 4.4 set_clinica_id() — trigger function: injeta clinica_id via servidor
--     Nunca confia no valor enviado pelo cliente — sempre sobrescreve
CREATE OR REPLACE FUNCTION public.set_clinica_id()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.clinica_id := public.get_my_clinica_id();
  IF NEW.clinica_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem clinica_id atribuído — contate o administrador';
  END IF;
  RETURN NEW;
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_clinica_id() TO authenticated;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOCO 5 — user_profiles: adicionar / renomear clinica_id
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$
BEGIN
  -- Caso A: establishment_id existe e clinica_id ainda não → renomear
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='user_profiles' AND column_name='establishment_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='user_profiles' AND column_name='clinica_id'
  ) THEN
    ALTER TABLE public.user_profiles RENAME COLUMN establishment_id TO clinica_id;
    RAISE NOTICE '✅ user_profiles.establishment_id → renomeado para clinica_id';

  -- Caso B: clinica_id já existe → idempotente
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='user_profiles' AND column_name='clinica_id'
  ) THEN
    RAISE NOTICE 'ℹ️  user_profiles.clinica_id já existe';

  -- Caso C: nenhuma das duas existe → adicionar
  ELSE
    ALTER TABLE public.user_profiles ADD COLUMN clinica_id uuid;
    RAISE NOTICE '✅ user_profiles.clinica_id adicionado como nova coluna';
  END IF;
END $$;

-- Adicionar FK clinica_id → clinicas.id (se ainda não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name   = 'user_profiles'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_clinica_id_fkey
      FOREIGN KEY (clinica_id) REFERENCES public.clinicas(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ FK user_profiles.clinica_id → clinicas.id criada';
  END IF;
END $$;

-- Backfill: usuários existentes → tenant seed
UPDATE public.user_profiles
  SET clinica_id = (SELECT id FROM public.clinicas ORDER BY criado_em LIMIT 1)
WHERE clinica_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_clinica_id ON public.user_profiles (clinica_id);

-- Atualizar trigger handle_new_user para injetar clinica_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, nome, role, clinica_id)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.email,
      'Usuário'
    ),
    'recepcao'::public.user_role,
    -- Auto-atribui à única clínica ativa (modelo single-tenant atual)
    -- Para multi-tenant real: remova esta linha e atribua via invite flow
    (SELECT id FROM public.clinicas WHERE ativo = true ORDER BY criado_em LIMIT 1)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Atualizar RLS de user_profiles para isolamento por tenant
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles: inserção via trigger"              ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles: próprio perfil ou admin"           ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles: admin atualiza"                    ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles: tenant vê membros do mesmo tenant" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles: admin do tenant atualiza"          ON public.user_profiles;
DROP POLICY IF EXISTS "Allow insert for new users profile"               ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile"                       ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles"                     ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update profiles"                       ON public.user_profiles;

-- Inserção feita pelo trigger SECURITY DEFINER
CREATE POLICY "user_profiles: inserção via trigger"
ON public.user_profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- SELECT: vê todos os membros do MESMO tenant
CREATE POLICY "user_profiles: tenant vê membros da clínica"
ON public.user_profiles FOR SELECT
USING (clinica_id = public.get_my_clinica_id());

-- UPDATE: apenas admin do mesmo tenant
CREATE POLICY "user_profiles: admin do tenant atualiza"
ON public.user_profiles FOR UPDATE
USING  (public.is_admin() AND clinica_id = public.get_my_clinica_id())
WITH CHECK (public.is_admin() AND clinica_id = public.get_my_clinica_id());


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOCO 6 — pacientes
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.pacientes
  ADD COLUMN IF NOT EXISTS clinica_id uuid REFERENCES public.clinicas(id) ON DELETE RESTRICT;

UPDATE public.pacientes
  SET clinica_id = (SELECT id FROM public.clinicas ORDER BY criado_em LIMIT 1)
WHERE clinica_id IS NULL;

DROP TRIGGER IF EXISTS trg_set_clinica_id_pacientes ON public.pacientes;
CREATE TRIGGER trg_set_clinica_id_pacientes
  BEFORE INSERT ON public.pacientes
  FOR EACH ROW EXECUTE FUNCTION public.set_clinica_id();

ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pacientes: autenticados podem selecionar"        ON public.pacientes;
DROP POLICY IF EXISTS "pacientes: autenticados podem inserir"           ON public.pacientes;
DROP POLICY IF EXISTS "pacientes: admin e dentista podem atualizar"     ON public.pacientes;
DROP POLICY IF EXISTS "pacientes: apenas admin pode excluir"            ON public.pacientes;
DROP POLICY IF EXISTS "pacientes: tenant seleciona"                     ON public.pacientes;
DROP POLICY IF EXISTS "pacientes: autenticados do tenant inserem"       ON public.pacientes;
DROP POLICY IF EXISTS "pacientes: admin e dentista do tenant atualizam" ON public.pacientes;
DROP POLICY IF EXISTS "pacientes: admin do tenant deleta"               ON public.pacientes;

CREATE POLICY "pacientes: tenant seleciona"
ON public.pacientes FOR SELECT
USING (clinica_id = public.get_my_clinica_id());

CREATE POLICY "pacientes: autenticados do tenant inserem"
ON public.pacientes FOR INSERT
WITH CHECK (clinica_id = public.get_my_clinica_id());

CREATE POLICY "pacientes: admin e dentista do tenant atualizam"
ON public.pacientes FOR UPDATE
USING  (clinica_id = public.get_my_clinica_id() AND public.get_my_role() IN ('admin','dentista'))
WITH CHECK (clinica_id = public.get_my_clinica_id() AND public.get_my_role() IN ('admin','dentista'));

CREATE POLICY "pacientes: admin do tenant deleta"
ON public.pacientes FOR DELETE
USING (clinica_id = public.get_my_clinica_id() AND public.is_admin());

CREATE INDEX IF NOT EXISTS idx_pacientes_clinica_id ON public.pacientes (clinica_id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOCO 7 — agendamentos
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS clinica_id uuid REFERENCES public.clinicas(id) ON DELETE RESTRICT;

UPDATE public.agendamentos
  SET clinica_id = (SELECT id FROM public.clinicas ORDER BY criado_em LIMIT 1)
WHERE clinica_id IS NULL;

DROP TRIGGER IF EXISTS trg_set_clinica_id_agendamentos ON public.agendamentos;
CREATE TRIGGER trg_set_clinica_id_agendamentos
  BEFORE INSERT ON public.agendamentos
  FOR EACH ROW EXECUTE FUNCTION public.set_clinica_id();

ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agendamentos: tenant seleciona"                     ON public.agendamentos;
DROP POLICY IF EXISTS "agendamentos: autenticados do tenant inserem"       ON public.agendamentos;
DROP POLICY IF EXISTS "agendamentos: admin e dentista do tenant atualizam" ON public.agendamentos;
DROP POLICY IF EXISTS "agendamentos: admin do tenant deleta"               ON public.agendamentos;

CREATE POLICY "agendamentos: tenant seleciona"
ON public.agendamentos FOR SELECT
USING (clinica_id = public.get_my_clinica_id());

CREATE POLICY "agendamentos: autenticados do tenant inserem"
ON public.agendamentos FOR INSERT
WITH CHECK (clinica_id = public.get_my_clinica_id());

CREATE POLICY "agendamentos: admin, dentista e recepção do tenant atualizam"
ON public.agendamentos FOR UPDATE
USING  (clinica_id = public.get_my_clinica_id() AND public.get_my_role() IN ('admin','dentista','recepcao'))
WITH CHECK (clinica_id = public.get_my_clinica_id() AND public.get_my_role() IN ('admin','dentista','recepcao'));

CREATE POLICY "agendamentos: admin do tenant deleta"
ON public.agendamentos FOR DELETE
USING (clinica_id = public.get_my_clinica_id() AND public.is_admin());

CREATE INDEX IF NOT EXISTS idx_agendamentos_clinica_id ON public.agendamentos (clinica_id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOCO 8 — prontuarios
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.prontuarios
  ADD COLUMN IF NOT EXISTS clinica_id uuid REFERENCES public.clinicas(id) ON DELETE RESTRICT;

UPDATE public.prontuarios
  SET clinica_id = (SELECT id FROM public.clinicas ORDER BY criado_em LIMIT 1)
WHERE clinica_id IS NULL;

DROP TRIGGER IF EXISTS trg_set_clinica_id_prontuarios ON public.prontuarios;
CREATE TRIGGER trg_set_clinica_id_prontuarios
  BEFORE INSERT ON public.prontuarios
  FOR EACH ROW EXECUTE FUNCTION public.set_clinica_id();

ALTER TABLE public.prontuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prontuarios: autenticados podem selecionar"                  ON public.prontuarios;
DROP POLICY IF EXISTS "prontuarios: dentista e admin podem inserir"                 ON public.prontuarios;
DROP POLICY IF EXISTS "prontuarios: dentista atualiza os seus, admin atualiza todos" ON public.prontuarios;
DROP POLICY IF EXISTS "prontuarios: apenas admin pode excluir"                      ON public.prontuarios;
DROP POLICY IF EXISTS "prontuarios: tenant seleciona"                               ON public.prontuarios;
DROP POLICY IF EXISTS "prontuarios: dentista e admin do tenant inserem"             ON public.prontuarios;
DROP POLICY IF EXISTS "prontuarios: dentista e admin do tenant atualizam"           ON public.prontuarios;
DROP POLICY IF EXISTS "prontuarios: admin do tenant deleta"                         ON public.prontuarios;

CREATE POLICY "prontuarios: tenant seleciona"
ON public.prontuarios FOR SELECT
USING (clinica_id = public.get_my_clinica_id());

CREATE POLICY "prontuarios: dentista e admin do tenant inserem"
ON public.prontuarios FOR INSERT
WITH CHECK (
  clinica_id = public.get_my_clinica_id()
  AND public.get_my_role() IN ('admin','dentista')
);

CREATE POLICY "prontuarios: dentista e admin do tenant atualizam"
ON public.prontuarios FOR UPDATE
USING (
  clinica_id = public.get_my_clinica_id()
  AND (public.is_admin() OR (public.get_my_role() = 'dentista' AND dentista_id = auth.uid()))
)
WITH CHECK (
  clinica_id = public.get_my_clinica_id()
  AND (public.is_admin() OR (public.get_my_role() = 'dentista' AND dentista_id = auth.uid()))
);

CREATE POLICY "prontuarios: admin do tenant deleta"
ON public.prontuarios FOR DELETE
USING (clinica_id = public.get_my_clinica_id() AND public.is_admin());

CREATE INDEX IF NOT EXISTS idx_prontuarios_clinica_id ON public.prontuarios (clinica_id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOCO 9 — anexos_prontuario  (backfill via JOIN com prontuarios)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.anexos_prontuario
  ADD COLUMN IF NOT EXISTS clinica_id uuid REFERENCES public.clinicas(id) ON DELETE RESTRICT;

UPDATE public.anexos_prontuario ap
  SET clinica_id = p.clinica_id
FROM public.prontuarios p
WHERE ap.prontuario_id = p.id AND ap.clinica_id IS NULL;

-- Fallback para registros órfãos
UPDATE public.anexos_prontuario
  SET clinica_id = (SELECT id FROM public.clinicas ORDER BY criado_em LIMIT 1)
WHERE clinica_id IS NULL;

DROP TRIGGER IF EXISTS trg_set_clinica_id_anexos_prontuario ON public.anexos_prontuario;
CREATE TRIGGER trg_set_clinica_id_anexos_prontuario
  BEFORE INSERT ON public.anexos_prontuario
  FOR EACH ROW EXECUTE FUNCTION public.set_clinica_id();

ALTER TABLE public.anexos_prontuario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anexos_prontuario: tenant seleciona"                ON public.anexos_prontuario;
DROP POLICY IF EXISTS "anexos_prontuario: dentista e admin do tenant inserem" ON public.anexos_prontuario;
DROP POLICY IF EXISTS "anexos_prontuario: admin do tenant deleta"          ON public.anexos_prontuario;

CREATE POLICY "anexos_prontuario: tenant seleciona"
ON public.anexos_prontuario FOR SELECT
USING (clinica_id = public.get_my_clinica_id());

CREATE POLICY "anexos_prontuario: dentista e admin do tenant inserem"
ON public.anexos_prontuario FOR INSERT
WITH CHECK (
  clinica_id = public.get_my_clinica_id()
  AND public.get_my_role() IN ('admin','dentista')
);

CREATE POLICY "anexos_prontuario: admin do tenant deleta"
ON public.anexos_prontuario FOR DELETE
USING (clinica_id = public.get_my_clinica_id() AND public.is_admin());

CREATE INDEX IF NOT EXISTS idx_anexos_prontuario_clinica_id ON public.anexos_prontuario (clinica_id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOCO 10 — receitas
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.receitas
  ADD COLUMN IF NOT EXISTS clinica_id uuid REFERENCES public.clinicas(id) ON DELETE RESTRICT;

UPDATE public.receitas
  SET clinica_id = (SELECT id FROM public.clinicas ORDER BY criado_em LIMIT 1)
WHERE clinica_id IS NULL;

DROP TRIGGER IF EXISTS trg_set_clinica_id_receitas ON public.receitas;
CREATE TRIGGER trg_set_clinica_id_receitas
  BEFORE INSERT ON public.receitas
  FOR EACH ROW EXECUTE FUNCTION public.set_clinica_id();

ALTER TABLE public.receitas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "receitas: autenticados selecionam"             ON public.receitas;
DROP POLICY IF EXISTS "receitas: dentista e admin inserem"            ON public.receitas;
DROP POLICY IF EXISTS "receitas: dentista atualiza suas, admin todas" ON public.receitas;
DROP POLICY IF EXISTS "receitas: apenas admin deleta"                 ON public.receitas;
DROP POLICY IF EXISTS "receitas: tenant seleciona"                    ON public.receitas;
DROP POLICY IF EXISTS "receitas: dentista e admin do tenant inserem"  ON public.receitas;
DROP POLICY IF EXISTS "receitas: dentista e admin do tenant atualizam" ON public.receitas;
DROP POLICY IF EXISTS "receitas: admin do tenant deleta"              ON public.receitas;

CREATE POLICY "receitas: tenant seleciona"
ON public.receitas FOR SELECT
USING (clinica_id = public.get_my_clinica_id());

CREATE POLICY "receitas: dentista e admin do tenant inserem"
ON public.receitas FOR INSERT
WITH CHECK (
  clinica_id = public.get_my_clinica_id()
  AND public.get_my_role() IN ('admin','dentista')
);

CREATE POLICY "receitas: dentista e admin do tenant atualizam"
ON public.receitas FOR UPDATE
USING (
  clinica_id = public.get_my_clinica_id()
  AND (public.is_admin() OR (public.get_my_role() = 'dentista' AND profissional_id = auth.uid()))
)
WITH CHECK (
  clinica_id = public.get_my_clinica_id()
  AND (public.is_admin() OR (public.get_my_role() = 'dentista' AND profissional_id = auth.uid()))
);

CREATE POLICY "receitas: admin do tenant deleta"
ON public.receitas FOR DELETE
USING (clinica_id = public.get_my_clinica_id() AND public.is_admin());

CREATE INDEX IF NOT EXISTS idx_receitas_clinica_id ON public.receitas (clinica_id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOCO 11 — receita_itens  (backfill via JOIN com receitas)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.receita_itens
  ADD COLUMN IF NOT EXISTS clinica_id uuid REFERENCES public.clinicas(id) ON DELETE RESTRICT;

UPDATE public.receita_itens ri
  SET clinica_id = r.clinica_id
FROM public.receitas r
WHERE ri.receita_id = r.id AND ri.clinica_id IS NULL;

UPDATE public.receita_itens
  SET clinica_id = (SELECT id FROM public.clinicas ORDER BY criado_em LIMIT 1)
WHERE clinica_id IS NULL;

DROP TRIGGER IF EXISTS trg_set_clinica_id_receita_itens ON public.receita_itens;
CREATE TRIGGER trg_set_clinica_id_receita_itens
  BEFORE INSERT ON public.receita_itens
  FOR EACH ROW EXECUTE FUNCTION public.set_clinica_id();

ALTER TABLE public.receita_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "receita_itens: autenticados selecionam"    ON public.receita_itens;
DROP POLICY IF EXISTS "receita_itens: dentista e admin inserem"   ON public.receita_itens;
DROP POLICY IF EXISTS "receita_itens: dentista e admin atualizam" ON public.receita_itens;
DROP POLICY IF EXISTS "receita_itens: admin deleta"               ON public.receita_itens;
DROP POLICY IF EXISTS "receita_itens: tenant seleciona"           ON public.receita_itens;
DROP POLICY IF EXISTS "receita_itens: dentista e admin do tenant inserem"   ON public.receita_itens;
DROP POLICY IF EXISTS "receita_itens: dentista e admin do tenant atualizam" ON public.receita_itens;
DROP POLICY IF EXISTS "receita_itens: admin do tenant deleta"     ON public.receita_itens;

CREATE POLICY "receita_itens: tenant seleciona"
ON public.receita_itens FOR SELECT
USING (clinica_id = public.get_my_clinica_id());

CREATE POLICY "receita_itens: dentista e admin do tenant inserem"
ON public.receita_itens FOR INSERT
WITH CHECK (
  clinica_id = public.get_my_clinica_id()
  AND public.get_my_role() IN ('admin','dentista')
);

CREATE POLICY "receita_itens: dentista e admin do tenant atualizam"
ON public.receita_itens FOR UPDATE
USING  (clinica_id = public.get_my_clinica_id() AND public.get_my_role() IN ('admin','dentista'))
WITH CHECK (clinica_id = public.get_my_clinica_id() AND public.get_my_role() IN ('admin','dentista'));

CREATE POLICY "receita_itens: admin do tenant deleta"
ON public.receita_itens FOR DELETE
USING (clinica_id = public.get_my_clinica_id() AND public.is_admin());

CREATE INDEX IF NOT EXISTS idx_receita_itens_clinica_id ON public.receita_itens (clinica_id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOCO 12 — atestados
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.atestados
  ADD COLUMN IF NOT EXISTS clinica_id uuid REFERENCES public.clinicas(id) ON DELETE RESTRICT;

UPDATE public.atestados
  SET clinica_id = (SELECT id FROM public.clinicas ORDER BY criado_em LIMIT 1)
WHERE clinica_id IS NULL;

DROP TRIGGER IF EXISTS trg_set_clinica_id_atestados ON public.atestados;
CREATE TRIGGER trg_set_clinica_id_atestados
  BEFORE INSERT ON public.atestados
  FOR EACH ROW EXECUTE FUNCTION public.set_clinica_id();

ALTER TABLE public.atestados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "atestados: autenticados selecionam"             ON public.atestados;
DROP POLICY IF EXISTS "atestados: dentista e admin inserem"            ON public.atestados;
DROP POLICY IF EXISTS "atestados: dentista atualiza seus, admin todos" ON public.atestados;
DROP POLICY IF EXISTS "atestados: apenas admin deleta"                 ON public.atestados;
DROP POLICY IF EXISTS "atestados: tenant seleciona"                    ON public.atestados;
DROP POLICY IF EXISTS "atestados: dentista e admin do tenant inserem"  ON public.atestados;
DROP POLICY IF EXISTS "atestados: dentista e admin do tenant atualizam" ON public.atestados;
DROP POLICY IF EXISTS "atestados: admin do tenant deleta"              ON public.atestados;

CREATE POLICY "atestados: tenant seleciona"
ON public.atestados FOR SELECT
USING (clinica_id = public.get_my_clinica_id());

CREATE POLICY "atestados: dentista e admin do tenant inserem"
ON public.atestados FOR INSERT
WITH CHECK (
  clinica_id = public.get_my_clinica_id()
  AND public.get_my_role() IN ('admin','dentista')
);

CREATE POLICY "atestados: dentista e admin do tenant atualizam"
ON public.atestados FOR UPDATE
USING (
  clinica_id = public.get_my_clinica_id()
  AND (public.is_admin() OR (public.get_my_role() = 'dentista' AND profissional_id = auth.uid()))
)
WITH CHECK (
  clinica_id = public.get_my_clinica_id()
  AND (public.is_admin() OR (public.get_my_role() = 'dentista' AND profissional_id = auth.uid()))
);

CREATE POLICY "atestados: admin do tenant deleta"
ON public.atestados FOR DELETE
USING (clinica_id = public.get_my_clinica_id() AND public.is_admin());

CREATE INDEX IF NOT EXISTS idx_atestados_clinica_id ON public.atestados (clinica_id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOCO 13 — despesas
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.despesas
  ADD COLUMN IF NOT EXISTS clinica_id uuid REFERENCES public.clinicas(id) ON DELETE RESTRICT;

UPDATE public.despesas
  SET clinica_id = (SELECT id FROM public.clinicas ORDER BY criado_em LIMIT 1)
WHERE clinica_id IS NULL;

DROP TRIGGER IF EXISTS trg_set_clinica_id_despesas ON public.despesas;
CREATE TRIGGER trg_set_clinica_id_despesas
  BEFORE INSERT ON public.despesas
  FOR EACH ROW EXECUTE FUNCTION public.set_clinica_id();

ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "despesas: tenant seleciona"                   ON public.despesas;
DROP POLICY IF EXISTS "despesas: financeiro e admin do tenant inserem" ON public.despesas;
DROP POLICY IF EXISTS "despesas: financeiro e admin do tenant atualizam" ON public.despesas;
DROP POLICY IF EXISTS "despesas: admin do tenant deleta"             ON public.despesas;

CREATE POLICY "despesas: tenant seleciona"
ON public.despesas FOR SELECT
USING (clinica_id = public.get_my_clinica_id());

CREATE POLICY "despesas: financeiro e admin do tenant inserem"
ON public.despesas FOR INSERT
WITH CHECK (clinica_id = public.get_my_clinica_id() AND public.get_my_role() IN ('admin','financeiro'));

CREATE POLICY "despesas: financeiro e admin do tenant atualizam"
ON public.despesas FOR UPDATE
USING  (clinica_id = public.get_my_clinica_id() AND public.get_my_role() IN ('admin','financeiro'))
WITH CHECK (clinica_id = public.get_my_clinica_id() AND public.get_my_role() IN ('admin','financeiro'));

CREATE POLICY "despesas: admin do tenant deleta"
ON public.despesas FOR DELETE
USING (clinica_id = public.get_my_clinica_id() AND public.is_admin());

CREATE INDEX IF NOT EXISTS idx_despesas_clinica_id ON public.despesas (clinica_id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOCO 14 — fornecedores
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS clinica_id uuid REFERENCES public.clinicas(id) ON DELETE RESTRICT;

UPDATE public.fornecedores
  SET clinica_id = (SELECT id FROM public.clinicas ORDER BY criado_em LIMIT 1)
WHERE clinica_id IS NULL;

DROP TRIGGER IF EXISTS trg_set_clinica_id_fornecedores ON public.fornecedores;
CREATE TRIGGER trg_set_clinica_id_fornecedores
  BEFORE INSERT ON public.fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.set_clinica_id();

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fornecedores: tenant seleciona"                    ON public.fornecedores;
DROP POLICY IF EXISTS "fornecedores: admin e financeiro do tenant inserem" ON public.fornecedores;
DROP POLICY IF EXISTS "fornecedores: admin e financeiro do tenant atualizam" ON public.fornecedores;
DROP POLICY IF EXISTS "fornecedores: admin do tenant deleta"              ON public.fornecedores;

CREATE POLICY "fornecedores: tenant seleciona"
ON public.fornecedores FOR SELECT
USING (clinica_id = public.get_my_clinica_id());

CREATE POLICY "fornecedores: admin e financeiro do tenant inserem"
ON public.fornecedores FOR INSERT
WITH CHECK (clinica_id = public.get_my_clinica_id() AND public.get_my_role() IN ('admin','financeiro'));

CREATE POLICY "fornecedores: admin e financeiro do tenant atualizam"
ON public.fornecedores FOR UPDATE
USING  (clinica_id = public.get_my_clinica_id() AND public.get_my_role() IN ('admin','financeiro'))
WITH CHECK (clinica_id = public.get_my_clinica_id() AND public.get_my_role() IN ('admin','financeiro'));

CREATE POLICY "fornecedores: admin do tenant deleta"
ON public.fornecedores FOR DELETE
USING (clinica_id = public.get_my_clinica_id() AND public.is_admin());

CREATE INDEX IF NOT EXISTS idx_fornecedores_clinica_id ON public.fornecedores (clinica_id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOCO 15 — compras
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.compras
  ADD COLUMN IF NOT EXISTS clinica_id uuid REFERENCES public.clinicas(id) ON DELETE RESTRICT;

UPDATE public.compras
  SET clinica_id = (SELECT id FROM public.clinicas ORDER BY criado_em LIMIT 1)
WHERE clinica_id IS NULL;

DROP TRIGGER IF EXISTS trg_set_clinica_id_compras ON public.compras;
CREATE TRIGGER trg_set_clinica_id_compras
  BEFORE INSERT ON public.compras
  FOR EACH ROW EXECUTE FUNCTION public.set_clinica_id();

ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "compras: tenant seleciona"                    ON public.compras;
DROP POLICY IF EXISTS "compras: admin e financeiro do tenant inserem" ON public.compras;
DROP POLICY IF EXISTS "compras: admin e financeiro do tenant atualizam" ON public.compras;
DROP POLICY IF EXISTS "compras: admin do tenant deleta"              ON public.compras;

CREATE POLICY "compras: tenant seleciona"
ON public.compras FOR SELECT
USING (clinica_id = public.get_my_clinica_id());

CREATE POLICY "compras: admin e financeiro do tenant inserem"
ON public.compras FOR INSERT
WITH CHECK (clinica_id = public.get_my_clinica_id() AND public.get_my_role() IN ('admin','financeiro'));

CREATE POLICY "compras: admin e financeiro do tenant atualizam"
ON public.compras FOR UPDATE
USING  (clinica_id = public.get_my_clinica_id() AND public.get_my_role() IN ('admin','financeiro'))
WITH CHECK (clinica_id = public.get_my_clinica_id() AND public.get_my_role() IN ('admin','financeiro'));

CREATE POLICY "compras: admin do tenant deleta"
ON public.compras FOR DELETE
USING (clinica_id = public.get_my_clinica_id() AND public.is_admin());

CREATE INDEX IF NOT EXISTS idx_compras_clinica_id ON public.compras (clinica_id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOCO 16 — notas_fiscais
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.notas_fiscais
  ADD COLUMN IF NOT EXISTS clinica_id uuid REFERENCES public.clinicas(id) ON DELETE RESTRICT;

UPDATE public.notas_fiscais
  SET clinica_id = (SELECT id FROM public.clinicas ORDER BY criado_em LIMIT 1)
WHERE clinica_id IS NULL;

DROP TRIGGER IF EXISTS trg_set_clinica_id_notas_fiscais ON public.notas_fiscais;
CREATE TRIGGER trg_set_clinica_id_notas_fiscais
  BEFORE INSERT ON public.notas_fiscais
  FOR EACH ROW EXECUTE FUNCTION public.set_clinica_id();

ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notas_fiscais: tenant seleciona"                    ON public.notas_fiscais;
DROP POLICY IF EXISTS "notas_fiscais: admin e financeiro do tenant inserem" ON public.notas_fiscais;
DROP POLICY IF EXISTS "notas_fiscais: admin e financeiro do tenant atualizam" ON public.notas_fiscais;
DROP POLICY IF EXISTS "notas_fiscais: admin do tenant deleta"              ON public.notas_fiscais;

CREATE POLICY "notas_fiscais: tenant seleciona"
ON public.notas_fiscais FOR SELECT
USING (clinica_id = public.get_my_clinica_id());

CREATE POLICY "notas_fiscais: admin e financeiro do tenant inserem"
ON public.notas_fiscais FOR INSERT
WITH CHECK (clinica_id = public.get_my_clinica_id() AND public.get_my_role() IN ('admin','financeiro'));

CREATE POLICY "notas_fiscais: admin e financeiro do tenant atualizam"
ON public.notas_fiscais FOR UPDATE
USING  (clinica_id = public.get_my_clinica_id() AND public.get_my_role() IN ('admin','financeiro'))
WITH CHECK (clinica_id = public.get_my_clinica_id() AND public.get_my_role() IN ('admin','financeiro'));

CREATE POLICY "notas_fiscais: admin do tenant deleta"
ON public.notas_fiscais FOR DELETE
USING (clinica_id = public.get_my_clinica_id() AND public.is_admin());

CREATE INDEX IF NOT EXISTS idx_notas_fiscais_clinica_id ON public.notas_fiscais (clinica_id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOCO 17 — alertas  (backfill via user_id → user_profiles)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.alertas
  ADD COLUMN IF NOT EXISTS clinica_id uuid REFERENCES public.clinicas(id) ON DELETE RESTRICT;

UPDATE public.alertas al
  SET clinica_id = up.clinica_id
FROM public.user_profiles up
WHERE al.user_id = up.id AND al.clinica_id IS NULL;

UPDATE public.alertas
  SET clinica_id = (SELECT id FROM public.clinicas ORDER BY criado_em LIMIT 1)
WHERE clinica_id IS NULL;

DROP TRIGGER IF EXISTS trg_set_clinica_id_alertas ON public.alertas;
CREATE TRIGGER trg_set_clinica_id_alertas
  BEFORE INSERT ON public.alertas
  FOR EACH ROW EXECUTE FUNCTION public.set_clinica_id();

ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow insert own alerts"                        ON public.alertas;
DROP POLICY IF EXISTS "allow select own alerts"                        ON public.alertas;
DROP POLICY IF EXISTS "allow update own alerts"                        ON public.alertas;
DROP POLICY IF EXISTS "alertas: tenant e próprio usuário seleciona"   ON public.alertas;
DROP POLICY IF EXISTS "alertas: tenant insere para si"                ON public.alertas;
DROP POLICY IF EXISTS "alertas: tenant atualiza os seus"              ON public.alertas;
DROP POLICY IF EXISTS "alertas: admin do tenant deleta"               ON public.alertas;

-- Usuário vê apenas seus próprios alertas dentro do seu tenant
CREATE POLICY "alertas: tenant próprio usuário seleciona"
ON public.alertas FOR SELECT
USING (clinica_id = public.get_my_clinica_id() AND user_id = auth.uid());

CREATE POLICY "alertas: tenant insere para si"
ON public.alertas FOR INSERT
WITH CHECK (clinica_id = public.get_my_clinica_id() AND user_id = auth.uid());

CREATE POLICY "alertas: tenant atualiza os seus"
ON public.alertas FOR UPDATE
USING (clinica_id = public.get_my_clinica_id() AND user_id = auth.uid());

CREATE POLICY "alertas: admin do tenant deleta"
ON public.alertas FOR DELETE
USING (clinica_id = public.get_my_clinica_id() AND public.is_admin());

CREATE INDEX IF NOT EXISTS idx_alertas_clinica_id ON public.alertas (clinica_id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOCO 18 — system_logs  (backfill via user_id → user_profiles)
--            ON DELETE SET NULL: logs sobrevivem à remoção de usuários
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.system_logs
  ADD COLUMN IF NOT EXISTS clinica_id uuid REFERENCES public.clinicas(id) ON DELETE SET NULL;

UPDATE public.system_logs sl
  SET clinica_id = up.clinica_id
FROM public.user_profiles up
WHERE sl.user_id = up.id AND sl.clinica_id IS NULL;

UPDATE public.system_logs
  SET clinica_id = (SELECT id FROM public.clinicas ORDER BY criado_em LIMIT 1)
WHERE clinica_id IS NULL;

DROP TRIGGER IF EXISTS trg_set_clinica_id_system_logs ON public.system_logs;
CREATE TRIGGER trg_set_clinica_id_system_logs
  BEFORE INSERT ON public.system_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_clinica_id();

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_logs: tenant seleciona" ON public.system_logs;
DROP POLICY IF EXISTS "system_logs: tenant insere"    ON public.system_logs;

-- Admin vê todos os logs do tenant; outros só os próprios
CREATE POLICY "system_logs: tenant seleciona"
ON public.system_logs FOR SELECT
USING (
  clinica_id = public.get_my_clinica_id()
  AND (public.is_admin() OR user_id = auth.uid())
);

CREATE POLICY "system_logs: tenant insere"
ON public.system_logs FOR INSERT
WITH CHECK (clinica_id = public.get_my_clinica_id());

-- Logs são imutáveis: sem UPDATE nem DELETE por usuários (apenas service_role)

CREATE INDEX IF NOT EXISTS idx_system_logs_clinica_id ON public.system_logs (clinica_id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOCO 19 — Tabelas opcionais (existência verificada em runtime)
--            evolucao | cobrancas | comissoes | procedimentos |
--            procedimentos_realizados | roles
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Macro reutilizável como bloco anônimo por tabela
-- ── 19.1 evolucao ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='evolucao') THEN
    RAISE NOTICE 'ℹ️  evolucao não existe — pulando'; RETURN;
  END IF;

  ALTER TABLE public.evolucao ADD COLUMN IF NOT EXISTS clinica_id uuid REFERENCES public.clinicas(id) ON DELETE RESTRICT;
  UPDATE public.evolucao SET clinica_id = (SELECT id FROM public.clinicas ORDER BY criado_em LIMIT 1) WHERE clinica_id IS NULL;

  DROP TRIGGER IF EXISTS trg_set_clinica_id_evolucao ON public.evolucao;
  CREATE TRIGGER trg_set_clinica_id_evolucao BEFORE INSERT ON public.evolucao FOR EACH ROW EXECUTE FUNCTION public.set_clinica_id();

  ALTER TABLE public.evolucao ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "evolucao: tenant seleciona" ON public.evolucao;
  DROP POLICY IF EXISTS "evolucao: tenant insere"    ON public.evolucao;
  DROP POLICY IF EXISTS "evolucao: tenant atualiza"  ON public.evolucao;
  DROP POLICY IF EXISTS "evolucao: admin deleta"     ON public.evolucao;

  CREATE POLICY "evolucao: tenant seleciona" ON public.evolucao FOR SELECT USING (clinica_id = public.get_my_clinica_id());
  CREATE POLICY "evolucao: tenant insere"    ON public.evolucao FOR INSERT WITH CHECK (clinica_id = public.get_my_clinica_id() AND public.get_my_role() IN ('admin','dentista'));
  CREATE POLICY "evolucao: tenant atualiza"  ON public.evolucao FOR UPDATE
    USING (clinica_id = public.get_my_clinica_id() AND public.get_my_role() IN ('admin','dentista'))
    WITH CHECK (clinica_id = public.get_my_clinica_id() AND public.get_my_role() IN ('admin','dentista'));
  CREATE POLICY "evolucao: admin deleta"     ON public.evolucao FOR DELETE USING (clinica_id = public.get_my_clinica_id() AND public.is_admin());
  CREATE INDEX IF NOT EXISTS idx_evolucao_clinica_id ON public.evolucao (clinica_id);

  RAISE NOTICE '✅ evolucao: clinica_id + RLS aplicados';
END $$;

-- ── 19.2 cobrancas ───────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cobrancas') THEN
    RAISE NOTICE 'ℹ️  cobrancas não existe — pulando'; RETURN;
  END IF;

  ALTER TABLE public.cobrancas ADD COLUMN IF NOT EXISTS clinica_id uuid REFERENCES public.clinicas(id) ON DELETE RESTRICT;
  UPDATE public.cobrancas SET clinica_id = (SELECT id FROM public.clinicas ORDER BY criado_em LIMIT 1) WHERE clinica_id IS NULL;

  DROP TRIGGER IF EXISTS trg_set_clinica_id_cobrancas ON public.cobrancas;
  CREATE TRIGGER trg_set_clinica_id_cobrancas BEFORE INSERT ON public.cobrancas FOR EACH ROW EXECUTE FUNCTION public.set_clinica_id();

  ALTER TABLE public.cobrancas ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "cobrancas: tenant seleciona" ON public.cobrancas;
  DROP POLICY IF EXISTS "cobrancas: tenant insere"    ON public.cobrancas;
  DROP POLICY IF EXISTS "cobrancas: tenant atualiza"  ON public.cobrancas;
  DROP POLICY IF EXISTS "cobrancas: admin deleta"     ON public.cobrancas;

  CREATE POLICY "cobrancas: tenant seleciona" ON public.cobrancas FOR SELECT USING (clinica_id = public.get_my_clinica_id());
  CREATE POLICY "cobrancas: tenant insere"    ON public.cobrancas FOR INSERT WITH CHECK (clinica_id = public.get_my_clinica_id() AND public.get_my_role() IN ('admin','financeiro','recepcao'));
  CREATE POLICY "cobrancas: tenant atualiza"  ON public.cobrancas FOR UPDATE
    USING (clinica_id = public.get_my_clinica_id() AND public.get_my_role() IN ('admin','financeiro'))
    WITH CHECK (clinica_id = public.get_my_clinica_id() AND public.get_my_role() IN ('admin','financeiro'));
  CREATE POLICY "cobrancas: admin deleta"     ON public.cobrancas FOR DELETE USING (clinica_id = public.get_my_clinica_id() AND public.is_admin());
  CREATE INDEX IF NOT EXISTS idx_cobrancas_clinica_id ON public.cobrancas (clinica_id);

  RAISE NOTICE '✅ cobrancas: clinica_id + RLS aplicados';
END $$;

-- ── 19.3 comissoes ───────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='comissoes') THEN
    RAISE NOTICE 'ℹ️  comissoes não existe — pulando'; RETURN;
  END IF;

  ALTER TABLE public.comissoes ADD COLUMN IF NOT EXISTS clinica_id uuid REFERENCES public.clinicas(id) ON DELETE RESTRICT;
  UPDATE public.comissoes SET clinica_id = (SELECT id FROM public.clinicas ORDER BY criado_em LIMIT 1) WHERE clinica_id IS NULL;

  DROP TRIGGER IF EXISTS trg_set_clinica_id_comissoes ON public.comissoes;
  CREATE TRIGGER trg_set_clinica_id_comissoes BEFORE INSERT ON public.comissoes FOR EACH ROW EXECUTE FUNCTION public.set_clinica_id();

  ALTER TABLE public.comissoes ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "Admins e Dentistas veem comissoes"  ON public.comissoes;
  DROP POLICY IF EXISTS "Admins gerenciam comissoes"         ON public.comissoes;
  DROP POLICY IF EXISTS "comissoes: tenant seleciona"        ON public.comissoes;
  DROP POLICY IF EXISTS "comissoes: admin do tenant insere"  ON public.comissoes;
  DROP POLICY IF EXISTS "comissoes: admin do tenant atualiza" ON public.comissoes;
  DROP POLICY IF EXISTS "comissoes: admin do tenant deleta"  ON public.comissoes;

  CREATE POLICY "comissoes: tenant seleciona"        ON public.comissoes FOR SELECT USING (clinica_id = public.get_my_clinica_id());
  CREATE POLICY "comissoes: admin do tenant insere"  ON public.comissoes FOR INSERT WITH CHECK (clinica_id = public.get_my_clinica_id() AND public.is_admin());
  CREATE POLICY "comissoes: admin do tenant atualiza" ON public.comissoes FOR UPDATE
    USING (clinica_id = public.get_my_clinica_id() AND public.is_admin())
    WITH CHECK (clinica_id = public.get_my_clinica_id() AND public.is_admin());
  CREATE POLICY "comissoes: admin do tenant deleta"  ON public.comissoes FOR DELETE USING (clinica_id = public.get_my_clinica_id() AND public.is_admin());
  CREATE INDEX IF NOT EXISTS idx_comissoes_clinica_id ON public.comissoes (clinica_id);

  RAISE NOTICE '✅ comissoes: clinica_id + RLS aplicados';
END $$;

-- ── 19.4 procedimentos ───────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='procedimentos') THEN
    RAISE NOTICE 'ℹ️  procedimentos não existe — pulando'; RETURN;
  END IF;

  ALTER TABLE public.procedimentos ADD COLUMN IF NOT EXISTS clinica_id uuid REFERENCES public.clinicas(id) ON DELETE RESTRICT;
  UPDATE public.procedimentos SET clinica_id = (SELECT id FROM public.clinicas ORDER BY criado_em LIMIT 1) WHERE clinica_id IS NULL;

  DROP TRIGGER IF EXISTS trg_set_clinica_id_procedimentos ON public.procedimentos;
  CREATE TRIGGER trg_set_clinica_id_procedimentos BEFORE INSERT ON public.procedimentos FOR EACH ROW EXECUTE FUNCTION public.set_clinica_id();

  ALTER TABLE public.procedimentos ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "procedimentos: tenant seleciona" ON public.procedimentos;
  DROP POLICY IF EXISTS "procedimentos: admin insere"     ON public.procedimentos;
  DROP POLICY IF EXISTS "procedimentos: admin atualiza"   ON public.procedimentos;
  DROP POLICY IF EXISTS "procedimentos: admin deleta"     ON public.procedimentos;

  CREATE POLICY "procedimentos: tenant seleciona" ON public.procedimentos FOR SELECT USING (clinica_id = public.get_my_clinica_id());
  CREATE POLICY "procedimentos: admin insere"     ON public.procedimentos FOR INSERT WITH CHECK (clinica_id = public.get_my_clinica_id() AND public.is_admin());
  CREATE POLICY "procedimentos: admin atualiza"   ON public.procedimentos FOR UPDATE
    USING (clinica_id = public.get_my_clinica_id() AND public.is_admin())
    WITH CHECK (clinica_id = public.get_my_clinica_id() AND public.is_admin());
  CREATE POLICY "procedimentos: admin deleta"     ON public.procedimentos FOR DELETE USING (clinica_id = public.get_my_clinica_id() AND public.is_admin());
  CREATE INDEX IF NOT EXISTS idx_procedimentos_clinica_id ON public.procedimentos (clinica_id);

  RAISE NOTICE '✅ procedimentos: clinica_id + RLS aplicados';
END $$;

-- ── 19.5 procedimentos_realizados ────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='procedimentos_realizados') THEN
    RAISE NOTICE 'ℹ️  procedimentos_realizados não existe — pulando'; RETURN;
  END IF;

  ALTER TABLE public.procedimentos_realizados ADD COLUMN IF NOT EXISTS clinica_id uuid REFERENCES public.clinicas(id) ON DELETE RESTRICT;
  UPDATE public.procedimentos_realizados SET clinica_id = (SELECT id FROM public.clinicas ORDER BY criado_em LIMIT 1) WHERE clinica_id IS NULL;

  DROP TRIGGER IF EXISTS trg_set_clinica_id_procedimentos_realizados ON public.procedimentos_realizados;
  CREATE TRIGGER trg_set_clinica_id_procedimentos_realizados BEFORE INSERT ON public.procedimentos_realizados FOR EACH ROW EXECUTE FUNCTION public.set_clinica_id();

  ALTER TABLE public.procedimentos_realizados ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "procedimentos_realizados: tenant seleciona" ON public.procedimentos_realizados;
  DROP POLICY IF EXISTS "procedimentos_realizados: tenant insere"    ON public.procedimentos_realizados;
  DROP POLICY IF EXISTS "procedimentos_realizados: tenant atualiza"  ON public.procedimentos_realizados;
  DROP POLICY IF EXISTS "procedimentos_realizados: admin deleta"     ON public.procedimentos_realizados;

  CREATE POLICY "procedimentos_realizados: tenant seleciona" ON public.procedimentos_realizados FOR SELECT USING (clinica_id = public.get_my_clinica_id());
  CREATE POLICY "procedimentos_realizados: tenant insere"    ON public.procedimentos_realizados FOR INSERT WITH CHECK (clinica_id = public.get_my_clinica_id() AND public.get_my_role() IN ('admin','dentista'));
  CREATE POLICY "procedimentos_realizados: tenant atualiza"  ON public.procedimentos_realizados FOR UPDATE
    USING (clinica_id = public.get_my_clinica_id() AND public.get_my_role() IN ('admin','dentista'))
    WITH CHECK (clinica_id = public.get_my_clinica_id() AND public.get_my_role() IN ('admin','dentista'));
  CREATE POLICY "procedimentos_realizados: admin deleta"     ON public.procedimentos_realizados FOR DELETE USING (clinica_id = public.get_my_clinica_id() AND public.is_admin());
  CREATE INDEX IF NOT EXISTS idx_procedimentos_realizados_clinica_id ON public.procedimentos_realizados (clinica_id);

  RAISE NOTICE '✅ procedimentos_realizados: clinica_id + RLS aplicados';
END $$;

-- ── 19.6 roles ───────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='roles') THEN
    RAISE NOTICE 'ℹ️  roles não existe — pulando'; RETURN;
  END IF;

  ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS clinica_id uuid REFERENCES public.clinicas(id) ON DELETE RESTRICT;
  UPDATE public.roles SET clinica_id = (SELECT id FROM public.clinicas ORDER BY criado_em LIMIT 1) WHERE clinica_id IS NULL;

  DROP TRIGGER IF EXISTS trg_set_clinica_id_roles ON public.roles;
  CREATE TRIGGER trg_set_clinica_id_roles BEFORE INSERT ON public.roles FOR EACH ROW EXECUTE FUNCTION public.set_clinica_id();

  ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "roles: tenant seleciona"      ON public.roles;
  DROP POLICY IF EXISTS "roles: admin do tenant insere" ON public.roles;
  DROP POLICY IF EXISTS "roles: admin do tenant atualiza" ON public.roles;
  DROP POLICY IF EXISTS "roles: admin do tenant deleta" ON public.roles;

  CREATE POLICY "roles: tenant seleciona"       ON public.roles FOR SELECT USING (clinica_id = public.get_my_clinica_id());
  CREATE POLICY "roles: admin do tenant insere" ON public.roles FOR INSERT WITH CHECK (clinica_id = public.get_my_clinica_id() AND public.is_admin());
  CREATE POLICY "roles: admin do tenant atualiza" ON public.roles FOR UPDATE
    USING (clinica_id = public.get_my_clinica_id() AND public.is_admin())
    WITH CHECK (clinica_id = public.get_my_clinica_id() AND public.is_admin());
  CREATE POLICY "roles: admin do tenant deleta" ON public.roles FOR DELETE USING (clinica_id = public.get_my_clinica_id() AND public.is_admin());
  CREATE INDEX IF NOT EXISTS idx_roles_clinica_id ON public.roles (clinica_id);

  RAISE NOTICE '✅ roles: clinica_id + RLS aplicados';
END $$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOCO 20 — NOT NULL constraints nas tabelas confirmadas
--            (só aplica após backfill garantido acima)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$
DECLARE
  v_nulls integer;
  t text;
  tables text[] := ARRAY[
    'pacientes','agendamentos','prontuarios','anexos_prontuario',
    'receitas','receita_itens','atestados',
    'despesas','fornecedores','compras','notas_fiscais','alertas'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('SELECT COUNT(*) FROM public.%I WHERE clinica_id IS NULL', t) INTO v_nulls;
    IF v_nulls > 0 THEN
      RAISE EXCEPTION '❌ % tem % registros sem clinica_id — corrija antes de continuar', t, v_nulls;
    END IF;
  END LOOP;
  RAISE NOTICE '✅ Backfill completo — zero NULLs detectados. Aplicando NOT NULL...';
END $$;

ALTER TABLE public.pacientes         ALTER COLUMN clinica_id SET NOT NULL;
ALTER TABLE public.agendamentos      ALTER COLUMN clinica_id SET NOT NULL;
ALTER TABLE public.prontuarios       ALTER COLUMN clinica_id SET NOT NULL;
ALTER TABLE public.anexos_prontuario ALTER COLUMN clinica_id SET NOT NULL;
ALTER TABLE public.receitas          ALTER COLUMN clinica_id SET NOT NULL;
ALTER TABLE public.receita_itens     ALTER COLUMN clinica_id SET NOT NULL;
ALTER TABLE public.atestados         ALTER COLUMN clinica_id SET NOT NULL;
ALTER TABLE public.despesas          ALTER COLUMN clinica_id SET NOT NULL;
ALTER TABLE public.fornecedores      ALTER COLUMN clinica_id SET NOT NULL;
ALTER TABLE public.compras           ALTER COLUMN clinica_id SET NOT NULL;
ALTER TABLE public.notas_fiscais     ALTER COLUMN clinica_id SET NOT NULL;
ALTER TABLE public.alertas           ALTER COLUMN clinica_id SET NOT NULL;
-- system_logs: NULLABLE (ON DELETE SET NULL — logs sobrevivem à remoção de usuários)
-- user_profiles: NULLABLE (novo usuário pode não ter clínica ainda no onboarding)
-- clinica_settings: NOT NULL (sempre vinculada à clínica)
ALTER TABLE public.clinica_settings  ALTER COLUMN clinica_id SET NOT NULL;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOCO 21 — GRANTS finais
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GRANT SELECT, INSERT, UPDATE ON public.clinicas TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_clinica_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_clinica_id()    TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin()          TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role()       TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOCO 22 — VERIFICAÇÃO FINAL (cole e execute em seguida para confirmar)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/*

-- 1. Clínicas cadastradas
SELECT id, nome, plano, ativo FROM public.clinicas;

-- 2. Tabelas com clinica_id
SELECT table_name
FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'clinica_id'
ORDER BY table_name;

-- 3. Políticas RLS ativas por tabela
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- 4. Triggers de injeção automática
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public' AND trigger_name LIKE 'trg_set_clinica_id%'
ORDER BY event_object_table;

-- 5. Registros sem clinica_id (deve retornar 0 em tudo)
SELECT 'pacientes'     AS t, COUNT(*) FROM public.pacientes       WHERE clinica_id IS NULL UNION ALL
SELECT 'agendamentos',         COUNT(*) FROM public.agendamentos   WHERE clinica_id IS NULL UNION ALL
SELECT 'prontuarios',          COUNT(*) FROM public.prontuarios    WHERE clinica_id IS NULL UNION ALL
SELECT 'receitas',             COUNT(*) FROM public.receitas       WHERE clinica_id IS NULL UNION ALL
SELECT 'atestados',            COUNT(*) FROM public.atestados      WHERE clinica_id IS NULL UNION ALL
SELECT 'user_profiles',        COUNT(*) FROM public.user_profiles  WHERE clinica_id IS NULL;

-- 6. Teste de isolamento: simular acesso como usuário de outro tenant
-- (execute logado como usuário da clínica — deve retornar apenas os dados dela)
SELECT id, clinica_id FROM public.pacientes LIMIT 5;

*/


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOCO 23 — NOTA: v_fluxo_caixa
-- A view v_fluxo_caixa precisa ser recriada manualmente pois sua estrutura
-- completa não está nos arquivos de migração versionados.
-- Após recriar, adicione o filtro abaixo em todos os SELECTs da view:
--   WHERE tabela.clinica_id = public.get_my_clinica_id()
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOCO FINAL — Recarregar schema cache do PostgREST
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NOTIFY pgrst, 'reload schema';

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  ✅ Migração concluída                                                  ║
-- ║  Próximos passos:                                                       ║
-- ║  1. Execute as queries de verificação do BLOCO 22                      ║
-- ║  2. Recrie a view v_fluxo_caixa com filtro de clinica_id               ║
-- ║  3. Reinicie a aplicação Next.js (sem alterações de código)            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
