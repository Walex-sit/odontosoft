-- ==============================================================================
-- Migration: 20260824000002_receitas_atestados_settings.sql
-- Description: Módulos Clínicos (Receitas, Atestados, NF-e e Configurações)
-- ==============================================================================

-- 1. Receitas e Prescrições
CREATE TABLE IF NOT EXISTS public.receitas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE,
    profissional_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    tipo_receituario TEXT DEFAULT 'simples',
    descricao TEXT,
    valor NUMERIC(10, 2) DEFAULT 0,
    status TEXT DEFAULT 'ativo',
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.receita_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receita_id UUID REFERENCES public.receitas(id) ON DELETE CASCADE,
    medicamento TEXT NOT NULL,
    concentracao TEXT,
    forma_farm TEXT,
    quantidade TEXT,
    posologia TEXT,
    instrucoes TEXT,
    ordem INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Atestados Médicos / Odontológicos
CREATE TABLE IF NOT EXISTS public.atestados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE,
    profissional_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    dias_afastamento INT DEFAULT 1,
    motivo TEXT,
    cid TEXT,
    cid_descricao TEXT,
    establishment_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Notas Fiscais Emitidas
CREATE TABLE IF NOT EXISTS public.notas_fiscais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receita_id UUID REFERENCES public.receitas(id) ON DELETE SET NULL,
    numero_nota TEXT NOT NULL,
    valor NUMERIC(10, 2) NOT NULL,
    data_emissao TIMESTAMPTZ NOT NULL DEFAULT now(),
    link_pdf TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Configurações da Clínica (Visual e Cadastral)
CREATE TABLE IF NOT EXISTS public.clinica_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL DEFAULT 'Minha Clínica',
    cnpj TEXT,
    telefone TEXT,
    email TEXT,
    endereco TEXT,
    cro_responsavel TEXT,
    nome_responsavel TEXT,
    logo_url TEXT,
    nome_exibido TEXT,
    site TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 5. Configuração do Bucket de Storage (clinic-logos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('clinic-logos', 'clinic-logos', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
    CREATE POLICY "Logos publicamente acessíveis"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'clinic-logos');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Usuários autenticados podem fazer upload de logos"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'clinic-logos' AND auth.role() = 'authenticated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Usuários autenticados podem atualizar logos"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'clinic-logos' AND auth.role() = 'authenticated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Usuários autenticados podem deletar logos"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'clinic-logos' AND auth.role() = 'authenticated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
