-- ============================================================
-- MIGRAÇÃO: Receituários, Atestados e Configurações da Clínica
-- OdontoSaaS — Execute no Supabase SQL Editor
-- Dependências: user_profiles, pacientes (já existentes)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- SEÇÃO 0: Pré-requisitos e extensões
-- ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Garante que a função auxiliar de role está disponível
-- (já definida em fix_rls_security.sql, recriada aqui por segurança)
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

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin()    TO authenticated;


-- ============================================================
-- BLOCO 1: CONFIGURAÇÕES DA CLÍNICA (clinica_settings)
-- Singleton: uma única linha representa a clínica inteira.
-- Todos os usuários autenticados lêem; apenas admin escreve.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.clinica_settings (
  id               uuid    DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Dados cadastrais
  nome             text    NOT NULL DEFAULT '',
  cnpj             text,
  telefone         text,
  endereco         text,

  -- Responsável técnico (ex: CD fulano, CRO 12345/SP)
  cro_responsavel  text,           -- ex: "CRO-SP 12345"
  nome_responsavel text,           -- nome do dentista responsável

  -- Logotipo (URL do arquivo no bucket "clinic-logos")
  logo_url         text,

  -- Metadados
  updated_at       timestamptz DEFAULT now() NOT NULL,
  updated_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Comentários descritivos nas colunas (boas práticas Supabase)
COMMENT ON TABLE  public.clinica_settings               IS 'Configurações globais da clínica (singleton — uma linha)';
COMMENT ON COLUMN public.clinica_settings.logo_url      IS 'URL pública do logotipo no Storage bucket clinic-logos';
COMMENT ON COLUMN public.clinica_settings.cro_responsavel IS 'Número de registro no Conselho Regional de Odontologia';

-- Índice único lógico: garante que nunca haja mais de uma linha
-- (estratégia de singleton via constraint em coluna constante)
CREATE UNIQUE INDEX IF NOT EXISTS clinica_settings_singleton_idx
  ON public.clinica_settings ((true));

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.touch_clinica_settings()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_clinica_settings ON public.clinica_settings;
CREATE TRIGGER trg_touch_clinica_settings
  BEFORE UPDATE ON public.clinica_settings
  FOR EACH ROW EXECUTE PROCEDURE public.touch_clinica_settings();

-- RLS: clinica_settings
ALTER TABLE public.clinica_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinica_settings: autenticados leem"  ON public.clinica_settings;
DROP POLICY IF EXISTS "clinica_settings: admin insere"       ON public.clinica_settings;
DROP POLICY IF EXISTS "clinica_settings: admin atualiza"     ON public.clinica_settings;
DROP POLICY IF EXISTS "clinica_settings: admin deleta"       ON public.clinica_settings;

-- Qualquer usuário da clínica pode ler as configurações (nome, logo, CRO)
CREATE POLICY "clinica_settings: autenticados leem"
ON public.clinica_settings FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Apenas admin pode inserir (criação inicial do registro singleton)
CREATE POLICY "clinica_settings: admin insere"
ON public.clinica_settings FOR INSERT
WITH CHECK (public.is_admin());

-- Apenas admin pode atualizar
CREATE POLICY "clinica_settings: admin atualiza"
ON public.clinica_settings FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Apenas admin pode deletar (protege o singleton)
CREATE POLICY "clinica_settings: admin deleta"
ON public.clinica_settings FOR DELETE
USING (public.is_admin());


-- ============================================================
-- BLOCO 2: RECEITUÁRIOS — Tabela principal (receitas)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.receitas (
  id               uuid    DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Vínculos principais
  paciente_id      uuid    NOT NULL REFERENCES public.pacientes(id) ON DELETE RESTRICT,
  profissional_id  uuid    NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,

  -- Data e validade
  data_emissao     date    NOT NULL DEFAULT CURRENT_DATE,

  -- Tipo de receituário (comum, especial azul, especial branco)
  tipo_receituario text NOT NULL DEFAULT 'comum'
    CHECK (tipo_receituario IN ('comum', 'especial_azul', 'especial_branco')),

  -- Observações gerais da receita (instruções gerais, alergias, etc.)
  observacoes      text,

  -- Auditoria
  created_at       timestamptz DEFAULT now() NOT NULL,
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE  public.receitas                       IS 'Receituários médicos/odontológicos emitidos';
COMMENT ON COLUMN public.receitas.tipo_receituario      IS 'comum = receita simples; especial_azul/branco = controlados';
COMMENT ON COLUMN public.receitas.profissional_id       IS 'FK para user_profiles — o dentista responsável pela receita';

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_receitas_paciente_id     ON public.receitas (paciente_id);
CREATE INDEX IF NOT EXISTS idx_receitas_profissional_id ON public.receitas (profissional_id);
CREATE INDEX IF NOT EXISTS idx_receitas_data_emissao    ON public.receitas (data_emissao DESC);

-- RLS: receitas
ALTER TABLE public.receitas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "receitas: autenticados selecionam"             ON public.receitas;
DROP POLICY IF EXISTS "receitas: dentista e admin inserem"            ON public.receitas;
DROP POLICY IF EXISTS "receitas: dentista atualiza suas, admin todas" ON public.receitas;
DROP POLICY IF EXISTS "receitas: apenas admin deleta"                 ON public.receitas;

-- SELECT: qualquer usuário autenticado pode visualizar receitas da clínica
CREATE POLICY "receitas: autenticados selecionam"
ON public.receitas FOR SELECT
USING (auth.uid() IS NOT NULL);

-- INSERT: dentistas e admins emitem receitas
CREATE POLICY "receitas: dentista e admin inserem"
ON public.receitas FOR INSERT
WITH CHECK (public.get_my_role() IN ('admin', 'dentista'));

-- UPDATE: dentista atualiza apenas as suas; admin atualiza qualquer uma
CREATE POLICY "receitas: dentista atualiza suas, admin todas"
ON public.receitas FOR UPDATE
USING (
  public.is_admin()
  OR (public.get_my_role() = 'dentista' AND profissional_id = auth.uid())
)
WITH CHECK (
  public.is_admin()
  OR (public.get_my_role() = 'dentista' AND profissional_id = auth.uid())
);

-- DELETE: apenas admin (auditoria e conformidade)
CREATE POLICY "receitas: apenas admin deleta"
ON public.receitas FOR DELETE
USING (public.is_admin());


-- ============================================================
-- BLOCO 3: ITENS DA RECEITA — Medicamentos (receita_itens)
-- Relação 1:N com receitas
-- ============================================================

CREATE TABLE IF NOT EXISTS public.receita_itens (
  id           uuid    DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Vínculo com a receita pai
  receita_id   uuid    NOT NULL REFERENCES public.receitas(id) ON DELETE CASCADE,

  -- Dados do medicamento
  medicamento  text    NOT NULL,           -- nome do medicamento
  concentracao text,                       -- ex: "500mg", "0,5%"
  forma_farm   text,                       -- ex: "comprimido", "solução", "creme"
  quantidade   text,                       -- ex: "30 comprimidos", "1 frasco"
  posologia    text    NOT NULL,           -- ex: "1 comp. de 8 em 8h por 7 dias"
  instrucoes   text,                       -- instruções de uso complementares

  -- Ordem de exibição na receita impressa
  ordem        smallint NOT NULL DEFAULT 1,

  -- Auditoria
  created_at   timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE  public.receita_itens              IS 'Medicamentos/itens individuais de uma receita (1:N com receitas)';
COMMENT ON COLUMN public.receita_itens.posologia    IS 'Instrução de dose e frequência — campo obrigatório';
COMMENT ON COLUMN public.receita_itens.forma_farm   IS 'Forma farmacêutica: comprimido, cápsula, xarope, creme etc.';

-- Índice para buscar todos os itens de uma receita rapidamente
CREATE INDEX IF NOT EXISTS idx_receita_itens_receita_id
  ON public.receita_itens (receita_id, ordem);

-- RLS: receita_itens
ALTER TABLE public.receita_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "receita_itens: autenticados selecionam"    ON public.receita_itens;
DROP POLICY IF EXISTS "receita_itens: dentista e admin inserem"   ON public.receita_itens;
DROP POLICY IF EXISTS "receita_itens: dentista e admin atualizam" ON public.receita_itens;
DROP POLICY IF EXISTS "receita_itens: admin deleta"               ON public.receita_itens;

CREATE POLICY "receita_itens: autenticados selecionam"
ON public.receita_itens FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "receita_itens: dentista e admin inserem"
ON public.receita_itens FOR INSERT
WITH CHECK (
  public.get_my_role() IN ('admin', 'dentista')
);

CREATE POLICY "receita_itens: dentista e admin atualizam"
ON public.receita_itens FOR UPDATE
USING (public.get_my_role() IN ('admin', 'dentista'))
WITH CHECK (public.get_my_role() IN ('admin', 'dentista'));

-- Deleção em cascata via FK (ON DELETE CASCADE), mas proteção direta:
CREATE POLICY "receita_itens: admin deleta"
ON public.receita_itens FOR DELETE
USING (public.is_admin());


-- ============================================================
-- BLOCO 4: ATESTADOS (atestados)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.atestados (
  id               uuid    DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Vínculos principais
  paciente_id      uuid    NOT NULL REFERENCES public.pacientes(id) ON DELETE RESTRICT,
  profissional_id  uuid    NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,

  -- Dados do atestado
  data_emissao     date    NOT NULL DEFAULT CURRENT_DATE,
  data_inicio      date    NOT NULL DEFAULT CURRENT_DATE,
  dias_afastamento smallint NOT NULL DEFAULT 1
    CHECK (dias_afastamento > 0),

  -- CID-10 (opcional — pode ser omitido a pedido do paciente)
  cid              text,                -- ex: "K08.1", "Z01.2"
  cid_descricao    text,                -- descrição textual do CID

  -- Motivo/texto livre do atestado
  motivo           text,                -- texto que aparecerá no documento

  -- Auditoria
  created_at       timestamptz DEFAULT now() NOT NULL,
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE  public.atestados                     IS 'Atestados médicos/odontológicos de afastamento';
COMMENT ON COLUMN public.atestados.dias_afastamento    IS 'Quantidade de dias corridos de afastamento (mínimo 1)';
COMMENT ON COLUMN public.atestados.cid                 IS 'Código CID-10 opcional — pode ser suprimido por escolha do paciente';
COMMENT ON COLUMN public.atestados.profissional_id     IS 'FK para user_profiles — dentista ou responsável pelo atestado';

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_atestados_paciente_id     ON public.atestados (paciente_id);
CREATE INDEX IF NOT EXISTS idx_atestados_profissional_id ON public.atestados (profissional_id);
CREATE INDEX IF NOT EXISTS idx_atestados_data_emissao    ON public.atestados (data_emissao DESC);

-- RLS: atestados
ALTER TABLE public.atestados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "atestados: autenticados selecionam"             ON public.atestados;
DROP POLICY IF EXISTS "atestados: dentista e admin inserem"            ON public.atestados;
DROP POLICY IF EXISTS "atestados: dentista atualiza seus, admin todos" ON public.atestados;
DROP POLICY IF EXISTS "atestados: apenas admin deleta"                 ON public.atestados;

-- SELECT: todos os autenticados da clínica visualizam
CREATE POLICY "atestados: autenticados selecionam"
ON public.atestados FOR SELECT
USING (auth.uid() IS NOT NULL);

-- INSERT: dentistas e admins emitem
CREATE POLICY "atestados: dentista e admin inserem"
ON public.atestados FOR INSERT
WITH CHECK (public.get_my_role() IN ('admin', 'dentista'));

-- UPDATE: dentista atualiza apenas os seus; admin atualiza qualquer um
CREATE POLICY "atestados: dentista atualiza seus, admin todos"
ON public.atestados FOR UPDATE
USING (
  public.is_admin()
  OR (public.get_my_role() = 'dentista' AND profissional_id = auth.uid())
)
WITH CHECK (
  public.is_admin()
  OR (public.get_my_role() = 'dentista' AND profissional_id = auth.uid())
);

-- DELETE: apenas admin
CREATE POLICY "atestados: apenas admin deleta"
ON public.atestados FOR DELETE
USING (public.is_admin());


-- ============================================================
-- BLOCO 5: STORAGE — Bucket "clinic-logos"
-- Execute esta seção no SQL Editor do Supabase Dashboard.
-- ============================================================

-- Criar o bucket via API interna do Supabase Storage (idempotente)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clinic-logos',
  'clinic-logos',
  true,                              -- público: URLs acessíveis sem token
  2097152,                           -- limite de 2 MB por arquivo
  ARRAY['image/jpeg','image/png','image/webp','image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas de Storage para clinic-logos
DROP POLICY IF EXISTS "clinic-logos: leitura publica"  ON storage.objects;
DROP POLICY IF EXISTS "clinic-logos: admin upload"     ON storage.objects;
DROP POLICY IF EXISTS "clinic-logos: admin atualiza"   ON storage.objects;
DROP POLICY IF EXISTS "clinic-logos: admin deleta"     ON storage.objects;

-- Leitura pública (necessário para render em PDFs, emails, etc.)
CREATE POLICY "clinic-logos: leitura publica"
ON storage.objects FOR SELECT
USING (bucket_id = 'clinic-logos');

-- Upload/substituição: apenas admin
CREATE POLICY "clinic-logos: admin upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'clinic-logos'
  AND public.is_admin()
);

-- UPDATE de metadados: apenas admin
CREATE POLICY "clinic-logos: admin atualiza"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'clinic-logos'
  AND public.is_admin()
);

-- DELETE: apenas admin
CREATE POLICY "clinic-logos: admin deleta"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'clinic-logos'
  AND public.is_admin()
);


-- ============================================================
-- BLOCO 6: GRANTS — Permissões para o role "authenticated"
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinica_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receitas          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receita_itens     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atestados         TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;


-- ============================================================
-- BLOCO 7: SEMENTE INICIAL — Registro singleton da clínica
-- ============================================================
INSERT INTO public.clinica_settings (nome, cnpj, telefone, endereco, cro_responsavel, nome_responsavel)
VALUES (
  'Clínica Odonto',
  '',
  '',
  '',
  '',
  ''
)
ON CONFLICT DO NOTHING;


-- ============================================================
-- BLOCO 8: NOTIFICAÇÃO AO POSTGREST
-- ============================================================
NOTIFY pgrst, 'reload schema';


-- ============================================================
-- VERIFICAÇÃO — Cole e execute após o script para confirmar:
-- ============================================================
/*
-- 1. Tabelas criadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('clinica_settings','receitas','receita_itens','atestados')
ORDER BY table_name;

-- 2. Políticas RLS ativas
SELECT tablename, policyname, cmd, roles, qual
FROM pg_policies
WHERE tablename IN ('clinica_settings','receitas','receita_itens','atestados')
ORDER BY tablename, cmd;

-- 3. Bucket de storage
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'clinic-logos';

-- 4. Políticas de storage
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE 'clinic-logos%';

-- 5. RLS ativo nas tabelas
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN ('clinica_settings','receitas','receita_itens','atestados')
  AND relnamespace = 'public'::regnamespace;
*/
