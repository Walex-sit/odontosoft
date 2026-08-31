'use server';

/**
 * app/actions/performance.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Painel de Desempenho e Comissões de Dentistas.
 *
 * Segurança (T001):
 *  ✅ Usa createServerClient() — autenticado via JWT/cookie → RLS ativo.
 *  ✅ user_profiles, procedimentos_realizados, procedimentos e pacientes
 *     são filtrados automaticamente pelo RLS de cada clínica.
 *  ✅ Sem service_role.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createServerClient } from '@/app/lib/supabase/server';

// ---------------------------------------------------------------------------
// Lista dentistas com totais de atendimentos e comissões (últimos N dias)
// ---------------------------------------------------------------------------
export interface DentistaComissao {
  id: string;
  nome: string;
  especialidade: string;
  atendimentos: number;
  faturado: number;
  comissao: number; // percentual aproximado calculado
  repasse: number;  // soma de comissao_gerada
  status: 'pendente' | 'pago';
}

export async function fetchDentistasComComissoes(
  periodDays: number = 30
): Promise<{ success: boolean; data: DentistaComissao[]; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, data: [], error: 'Não autorizado.' };
    }

    // 1. Busca todos os dentistas da clínica
    const { data: dentistas, error: dentError } = await supabase
      .from('user_profiles')
      .select('id, nome, especialidade')
      .eq('role', 'dentista')
      .order('nome', { ascending: true });

    if (dentError) throw dentError;
    if (!dentistas || dentistas.length === 0) return { success: true, data: [] };

    // 2. Para cada dentista, busca os procedimentos do período
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - periodDays);

    const { data: procs, error: procError } = await supabase
      .from('procedimentos_realizados')
      .select('dentista_id, valor_cobrado, comissao_gerada')
      .gte('data_realizacao', dateLimit.toISOString());

    if (procError) throw procError;

    const resultado: DentistaComissao[] = dentistas.map((d) => {
      const meus = (procs || []).filter((p) => p.dentista_id === d.id);
      const faturado = meus.reduce((s: number, p) => s + (Number(p.valor_cobrado) || 0), 0);
      const repasse = meus.reduce((s: number, p) => s + (Number(p.comissao_gerada) || 0), 0);
      const comissaoPct = faturado > 0 ? Math.round((repasse / faturado) * 100) : 0;
      return {
        id: d.id,
        nome: d.nome,
        especialidade: d.especialidade || 'Geral',
        atendimentos: meus.length,
        faturado,
        comissao: comissaoPct,
        repasse,
        status: 'pendente' as const,
      };
    });

    return { success: true, data: resultado };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('fetchDentistasComComissoes:', msg);
    return { success: false, data: [], error: msg };
  }
}

// ---------------------------------------------------------------------------
// Painel de Desempenho
// ---------------------------------------------------------------------------

export interface ProcedimentoDesempenho {
  id: string;
  data_realizacao: string;
  valor_cobrado: number | null;
  comissao_gerada: number | null;
  procedimento_nome: string;
  paciente_id: string | null;
  dentista_id: string | null;
}

export async function fetchDentistPerformance(dentistaId: string, periodDays: number = 30): Promise<{
  success: boolean;
  data: {
    totalComissoes: number;
    procedimentos: ProcedimentoDesempenho[];
  };
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, data: { totalComissoes: 0, procedimentos: [] }, error: 'Não autorizado.' };
    }
    
    // Calcula a data de corte
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - periodDays);
    const dateLimitIso = dateLimit.toISOString();

    const [procsRes, procedimentosDefRes] = await Promise.all([
      supabase
        .from('procedimentos_realizados')
        .select('id, data_realizacao, valor_cobrado, comissao_gerada, procedimento_id, paciente_id, dentista_id')
        .eq('dentista_id', dentistaId)
        .gte('data_realizacao', dateLimitIso)
        .order('data_realizacao', { ascending: false }),
      supabase
        .from('procedimentos')
        .select('id, nome'),
    ]);

    if (procsRes.error) throw procsRes.error;

    const procedimentosList = procsRes.data || [];
    const procedimentosDefMap = new Map((procedimentosDefRes.data || []).map((p) => [p.id, p.nome]));
    
    // Soma total das comissões geradas
    const totalComissoes = procedimentosList.reduce((acc, curr) => {
      const valor = Number(curr.comissao_gerada);
      return acc + (isNaN(valor) ? 0 : valor);
    }, 0);

    const procsFormatados: ProcedimentoDesempenho[] = procedimentosList.map((p) => ({
      id: p.id,
      data_realizacao: p.data_realizacao,
      valor_cobrado: p.valor_cobrado,
      comissao_gerada: p.comissao_gerada,
      procedimento_nome: (p.procedimento_id && procedimentosDefMap.get(p.procedimento_id)) || 'Desconhecido',
      paciente_id: p.paciente_id,
      dentista_id: p.dentista_id,
    }));

    return { 
      success: true, 
      data: {
        totalComissoes,
        procedimentos: procsFormatados,
      } 
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro ao buscar desempenho:', msg);
    return { success: false, data: { totalComissoes: 0, procedimentos: [] }, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Extrato de Comissões por Dentista (para modal no Financeiro)
// ---------------------------------------------------------------------------
export interface ExtratoItem {
  id: string;
  data_realizacao: string;
  procedimento_nome: string;
  paciente_nome: string;
  valor_cobrado: number;
  comissao_gerada: number;
}

export interface ExtratoComissoes {
  totalFaturado: number;
  totalComissoes: number;
  procedimentos: ExtratoItem[];
}

export async function fetchExtratoComissoes(
  dentistaId: string,
  periodDays: number = 30
): Promise<{ success: boolean; data: ExtratoComissoes; error?: string }> {
  const empty: ExtratoComissoes = { totalFaturado: 0, totalComissoes: 0, procedimentos: [] };
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, data: empty, error: 'Não autorizado.' };
    }

    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - periodDays);

    const [realizadosRes, procedimentosRes, pacientesRes] = await Promise.all([
      supabase
        .from('procedimentos_realizados')
        .select('id, data_realizacao, valor_cobrado, comissao_gerada, procedimento_id, paciente_id')
        .eq('dentista_id', dentistaId)
        .gte('data_realizacao', dateLimit.toISOString())
        .order('data_realizacao', { ascending: false }),
      supabase.from('procedimentos').select('id, nome'),
      supabase.from('pacientes').select('id, nome'),
    ]);

    if (realizadosRes.error) throw realizadosRes.error;

    const procMap = new Map((procedimentosRes.data || []).map((p) => [p.id, p.nome]));
    const pacMap = new Map((pacientesRes.data || []).map((p) => [p.id, p.nome]));

    const lista: ExtratoItem[] = (realizadosRes.data || []).map((r) => ({
      id: r.id,
      data_realizacao: r.data_realizacao,
      procedimento_nome: (r.procedimento_id && procMap.get(r.procedimento_id)) ?? 'Procedimento',
      paciente_nome: (r.paciente_id && pacMap.get(r.paciente_id)) ?? 'Paciente',
      valor_cobrado: Number(r.valor_cobrado ?? 0),
      comissao_gerada: Number(r.comissao_gerada ?? 0),
    }));

    const totalFaturado = lista.reduce((s, i) => s + i.valor_cobrado, 0);
    const totalComissoes = lista.reduce((s, i) => s + i.comissao_gerada, 0);

    return { success: true, data: { totalFaturado, totalComissoes, procedimentos: lista } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('fetchExtratoComissoes:', msg);
    return { success: false, data: empty, error: msg };
  }
}
