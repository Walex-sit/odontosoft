-- ==============================================================================
-- Migration: 20261029000014_odontograma_interativo.sql
-- Description: Cria a tabela de registo do odontograma interativo por paciente,
--              com isolamento multi-tenant via clinica_id e RLS completo.
-- ==============================================================================

-- 1. Tabela principal do odontograma
CREATE TABLE IF NOT EXISTS public.odontograma_registros (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id   UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
    clinica_id    UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
    dentista_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Tipo de arcada registado
    tipo          TEXT NOT NULL DEFAULT 'permanente'
                  CHECK (tipo IN ('permanente', 'deciduo')),

    -- Mapa de status: { "16": "carie", "21": "restaurado", ... }
    status_map    JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Observacao clinica livre associada ao registo
    observacao    TEXT,

    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Apenas um registo por (paciente, clinica, tipo)
    CONSTRAINT odontograma_paciente_clinica_tipo_unique
        UNIQUE (paciente_id, clinica_id, tipo)
);

-- 2. Indices de consulta
CREATE INDEX IF NOT EXISTS idx_odontograma_paciente_id
    ON public.odontograma_registros (paciente_id);

CREATE INDEX IF NOT EXISTS idx_odontograma_clinica_id
    ON public.odontograma_registros (clinica_id);

-- 3. Trigger para manter atualizado_em
CREATE OR REPLACE FUNCTION public.touch_odontograma_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_odontograma_atualizado_em ON public.odontograma_registros;
CREATE TRIGGER trg_odontograma_atualizado_em
    BEFORE UPDATE ON public.odontograma_registros
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_odontograma_atualizado_em();

-- 4. Auto-preenchimento de clinica_id (reutiliza a funcao existente set_clinica_id)
DROP TRIGGER IF EXISTS trg_set_clinica_id ON public.odontograma_registros;
CREATE TRIGGER trg_set_clinica_id
    BEFORE INSERT ON public.odontograma_registros
    FOR EACH ROW
    EXECUTE FUNCTION public.set_clinica_id();

-- 5. Habilitar RLS
ALTER TABLE public.odontograma_registros ENABLE ROW LEVEL SECURITY;

-- 6. Politicas RLS multi-tenant
DROP POLICY IF EXISTS "Tenant Select odontograma_registros" ON public.odontograma_registros;
CREATE POLICY "Tenant Select odontograma_registros" ON public.odontograma_registros
    FOR SELECT USING (clinica_id = public.get_my_clinica_id());

DROP POLICY IF EXISTS "Tenant Insert odontograma_registros" ON public.odontograma_registros;
CREATE POLICY "Tenant Insert odontograma_registros" ON public.odontograma_registros
    FOR INSERT WITH CHECK (
        clinica_id = public.get_my_clinica_id()
        OR clinica_id IS NULL
    );

DROP POLICY IF EXISTS "Tenant Update odontograma_registros" ON public.odontograma_registros;
CREATE POLICY "Tenant Update odontograma_registros" ON public.odontograma_registros
    FOR UPDATE USING (clinica_id = public.get_my_clinica_id());

DROP POLICY IF EXISTS "Tenant Delete odontograma_registros" ON public.odontograma_registros;
CREATE POLICY "Tenant Delete odontograma_registros" ON public.odontograma_registros
    FOR DELETE USING (clinica_id = public.get_my_clinica_id());

-- 7. Comentarios de documentacao
COMMENT ON TABLE public.odontograma_registros IS
    'Registo interativo do estado de cada dente por paciente. '
    'Isolado por clinica_id (multi-tenant). '
    'status_map e um JSONB { "numeroDente": "statusDente" }.';
