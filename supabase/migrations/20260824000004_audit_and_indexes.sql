-- ==============================================================================
-- Migration: 20260824000004_audit_and_indexes.sql
-- Description: Auditoria LGPD (system_logs), Alertas, Evolução Clínica e Índices de Performance
-- ==============================================================================

-- 1. Tabela de Logs do Sistema e Auditoria LGPD
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id UUID REFERENCES public.clinicas(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_nome TEXT,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabela de Alertas e Notificações
CREATE TABLE IF NOT EXISTS public.alertas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tipo TEXT,
    mensagem TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabela de Evolução Odontológica
CREATE TABLE IF NOT EXISTS public.evolucao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE,
    paciente_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE,
    dentista_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    descricao TEXT NOT NULL,
    data_evolucao TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Triggers e RLS para as novas tabelas
DROP TRIGGER IF EXISTS trg_set_clinica_id ON public.system_logs;
CREATE TRIGGER trg_set_clinica_id BEFORE INSERT ON public.system_logs FOR EACH ROW EXECUTE FUNCTION public.set_clinica_id();

DROP TRIGGER IF EXISTS trg_set_clinica_id ON public.alertas;
CREATE TRIGGER trg_set_clinica_id BEFORE INSERT ON public.alertas FOR EACH ROW EXECUTE FUNCTION public.set_clinica_id();

DROP TRIGGER IF EXISTS trg_set_clinica_id ON public.evolucao;
CREATE TRIGGER trg_set_clinica_id BEFORE INSERT ON public.evolucao FOR EACH ROW EXECUTE FUNCTION public.set_clinica_id();

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolucao ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "system_logs_select" ON public.system_logs;
CREATE POLICY "system_logs_select" ON public.system_logs
    FOR SELECT USING (clinica_id = public.get_my_clinica_id());

DROP POLICY IF EXISTS "system_logs_insert" ON public.system_logs;
CREATE POLICY "system_logs_insert" ON public.system_logs
    FOR INSERT WITH CHECK (true); -- Permite gravação irrestrita de auditoria

DROP POLICY IF EXISTS "alertas_tenant_policy" ON public.alertas;
CREATE POLICY "alertas_tenant_policy" ON public.alertas
    FOR ALL USING (clinica_id = public.get_my_clinica_id());

DROP POLICY IF EXISTS "evolucao_tenant_policy" ON public.evolucao;
CREATE POLICY "evolucao_tenant_policy" ON public.evolucao
    FOR ALL USING (clinica_id = public.get_my_clinica_id());

-- 5. Índices Estratégicos de Performance Multi-Tenant
CREATE INDEX IF NOT EXISTS idx_user_profiles_clinica ON public.user_profiles(clinica_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_clinica ON public.pacientes(clinica_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_nome ON public.pacientes(nome);
CREATE INDEX IF NOT EXISTS idx_agendamentos_clinica ON public.agendamentos(clinica_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON public.agendamentos(data_consulta, hora_consulta);
CREATE INDEX IF NOT EXISTS idx_prontuarios_clinica ON public.prontuarios(clinica_id);
CREATE INDEX IF NOT EXISTS idx_prontuarios_paciente ON public.prontuarios(paciente_id);
CREATE INDEX IF NOT EXISTS idx_receitas_clinica ON public.receitas(clinica_id);
CREATE INDEX IF NOT EXISTS idx_receitas_paciente ON public.receitas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_atestados_clinica ON public.atestados(clinica_id);
CREATE INDEX IF NOT EXISTS idx_despesas_clinica ON public.despesas(clinica_id);
CREATE INDEX IF NOT EXISTS idx_procedimentos_clinica ON public.procedimentos(clinica_id);
CREATE INDEX IF NOT EXISTS idx_procedimentos_realizados_clinica ON public.procedimentos_realizados(clinica_id);
CREATE INDEX IF NOT EXISTS idx_procedimentos_realizados_dentista ON public.procedimentos_realizados(dentista_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_clinica ON public.comissoes(clinica_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_clinica ON public.system_logs(clinica_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON public.system_logs(created_at DESC);
