'use server';

import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Variáveis de ambiente Supabase ausentes');
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ---------------------------------------------------------------------------
// Lista dentistas com totais de atendimentos e comissões (últimos N dias)
// ---------------------------------------------------------------------------
export interface DentistaComissao {
  id: string;
  nome: string;
  especialidade: string;
  atendimentos: number;
  faturado: number;
  comissao: number; // percentual salvo no perfil (fallback 0)
  repasse: number;  // soma de comissao_gerada
  status: 'pendente' | 'pago';
}

export async function fetchDentistasComComissoes(
  periodDays: number = 30
): Promise<{ success: boolean; data: DentistaComissao[]; error?: string }> {
  try {
    const supabase = getAdminClient();

    // 1. Busca todos os dentistas cadastrados
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

    const resultado: DentistaComissao[] = dentistas.map((d: any) => {
      const meus = (procs || []).filter((p: any) => p.dentista_id === d.id);
      const faturado = meus.reduce((s: number, p: any) => s + parseFloat(p.valor_cobrado ?? 0), 0);
      const repasse = meus.reduce((s: number, p: any) => s + parseFloat(p.comissao_gerada ?? 0), 0);
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
  } catch (err: any) {
    console.error('fetchDentistasComComissoes:', err.message);
    return { success: false, data: [], error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Painel de Desempenho
// ---------------------------------------------------------------------------

export async function fetchDentistPerformance(dentistaId: string, periodDays: number = 30): Promise<{
  success: boolean;
  data: {
    totalComissoes: number;
    procedimentos: any[];
  };
  error?: string;
}> {
  try {
    const supabase = getAdminClient();
    
    // Calcula a data de corte
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - periodDays);
    const dateLimitIso = dateLimit.toISOString();

    const { data, error } = await supabase
      .from('procedimentos_realizados')
      .select(`
        *,
        procedimentos(nome)
      `)
      .eq('dentista_id', dentistaId)
      .gte('data_realizacao', dateLimitIso)
      .order('data_realizacao', { ascending: false });

    if (error) throw error;

    const procedimentosList = data || [];
    
    // Soma total das comissões geradas
    const totalComissoes = procedimentosList.reduce((acc, curr) => {
      const valor = parseFloat(curr.comissao_gerada);
      return acc + (isNaN(valor) ? 0 : valor);
    }, 0);

    return { 
      success: true, 
      data: {
        totalComissoes,
        procedimentos: procedimentosList.map(p => ({
          ...p,
          procedimento_nome: p.procedimentos?.nome || 'Desconhecido'
        }))
      } 
    };
  } catch (error: any) {
    console.error('Erro ao buscar desempenho:', error.message);
    return { success: false, data: { totalComissoes: 0, procedimentos: [] }, error: error.message };
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
    const supabase = getAdminClient();
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - periodDays);

    const { data, error } = await supabase
      .from('procedimentos_realizados')
      .select(`
        id,
        data_realizacao,
        valor_cobrado,
        comissao_gerada,
        procedimentos(nome),
        pacientes(nome)
      `)
      .eq('dentista_id', dentistaId)
      .gte('data_realizacao', dateLimit.toISOString())
      .order('data_realizacao', { ascending: false });

    if (error) throw error;

    const lista: ExtratoItem[] = (data || []).map((r: any) => ({
      id: r.id,
      data_realizacao: r.data_realizacao,
      procedimento_nome: r.procedimentos?.nome ?? 'Procedimento',
      paciente_nome: r.pacientes?.nome ?? 'Paciente',
      valor_cobrado: parseFloat(r.valor_cobrado ?? 0),
      comissao_gerada: parseFloat(r.comissao_gerada ?? 0),
    }));

    const totalFaturado = lista.reduce((s, i) => s + i.valor_cobrado, 0);
    const totalComissoes = lista.reduce((s, i) => s + i.comissao_gerada, 0);

    return { success: true, data: { totalFaturado, totalComissoes, procedimentos: lista } };
  } catch (err: any) {
    console.error('fetchExtratoComissoes:', err.message);
    return { success: false, data: empty, error: err.message };
  }
}
