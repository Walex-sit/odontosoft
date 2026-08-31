'use server';

/**
 * app/actions/financeiro.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Server Actions para o módulo Financeiro — Fluxo de Caixa.
 *
 * Segurança (T001):
 *  ✅ Usa createServerClient() — autenticado via JWT/cookie → RLS ativo.
 *  ✅ clinica_id é isolado automaticamente pelo RLS por clínica.
 *  ✅ Sem service_role ou bypass de RLS.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createServerClient } from '@/app/lib/supabase/server';
import type { Database } from '@/app/lib/database.types';

type ReceitaUpdate = Database['public']['Tables']['receitas']['Update'];
type DespesaUpdate = Database['public']['Tables']['despesas']['Update'];
type ProcedimentoRealizadoUpdate = Database['public']['Tables']['procedimentos_realizados']['Update'];

// ─── Tipos Públicos ────────────────────────────────────────────────────────

export type PeriodoFilter =
  | 'este_mes'
  | 'mes_passado'
  | '7'
  | '30'
  | '90'
  | 'este_ano'
  | 'todos';

export type StatusFilter = 'todos' | 'pago' | 'pendente' | 'vencido';

export interface LancamentosFilter {
  periodo: PeriodoFilter;
  status: StatusFilter;
  profissionalId: string; // '' ou 'todos' = todos os profissionais
  busca: string;
}

export interface LancamentoFinanceiro {
  id: string;
  data: string; // ISO date string
  descricao: string;
  categoria: string;
  forma: string;
  valor: number;
  tipo: 'entrada' | 'saida';
  status: string;
  profissional_id: string | null;
  profissional_nome: string | null;
  origem: 'receita' | 'procedimento' | 'despesa';
}

export interface KpisFinanceiro {
  faturamentoTotal: number;
  totalRecebido: number;
  aReceber: number;
  inadimplencia: number;
  despesasPeriodo: number;
}

export interface LancamentosResult {
  success: boolean;
  data: LancamentoFinanceiro[];
  kpis: KpisFinanceiro;
  error?: string;
}

export interface ProfissionalSelectItem {
  id: string;
  nome: string;
}

export interface ProfissionaisResult {
  success: boolean;
  data: ProfissionalSelectItem[];
  error?: string;
}

// ─── Helpers internos ─────────────────────────────────────────────────────

/**
 * Calcula o range de datas ISO [inicio, fim] com base no filtro de período.
 * Retorna null se o período for 'todos'.
 */
function calcDateRange(
  periodo: PeriodoFilter
): { inicio: string; fim: string } | null {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');

  const toDate = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (periodo === 'todos') return null;

  if (periodo === 'este_mes') {
    const inicio = new Date(now.getFullYear(), now.getMonth(), 1);
    const fim = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { inicio: toDate(inicio), fim: toDate(fim) };
  }

  if (periodo === 'mes_passado') {
    const inicio = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const fim = new Date(now.getFullYear(), now.getMonth(), 0);
    return { inicio: toDate(inicio), fim: toDate(fim) };
  }

  if (periodo === 'este_ano') {
    const inicio = new Date(now.getFullYear(), 0, 1);
    const fim = new Date(now.getFullYear(), 11, 31);
    return { inicio: toDate(inicio), fim: toDate(fim) };
  }

  // '7', '30', '90' — últimos N dias
  const dias = parseInt(periodo, 10);
  const inicioD = new Date(now);
  inicioD.setDate(inicioD.getDate() - dias);
  return { inicio: toDate(inicioD), fim: toDate(now) };
}

// ─── Action: Buscar Lançamentos Financeiros ───────────────────────────────

export async function fetchLancamentosFinanceiros(
  filters: LancamentosFilter
): Promise<LancamentosResult> {
  const emptyKpis: KpisFinanceiro = {
    faturamentoTotal: 0,
    totalRecebido: 0,
    aReceber: 0,
    inadimplencia: 0,
    despesasPeriodo: 0,
  };

  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, data: [], kpis: emptyKpis, error: 'Não autorizado.' };
    }

    const dateRange = calcDateRange(filters.periodo);
    const isProfissionalFiltered =
      typeof filters.profissionalId === 'string' &&
      filters.profissionalId.trim() !== '' &&
      filters.profissionalId.trim() !== 'todos';
    const targetProfissionalId = isProfissionalFiltered ? filters.profissionalId.trim() : null;

    // ── 1. Perfis de Profissionais para Mapeamento de Nomes ───────────────
    const { data: profisRaw } = await supabase
      .from('user_profiles')
      .select('id, nome');
    const profisMap: Record<string, string> = Object.fromEntries(
      (profisRaw ?? []).map((p) => [p.id, p.nome])
    );

    // ── 2. Receitas ──────────────────────────────────────────────────────
    let receitasQuery = supabase
      .from('receitas')
      .select('id, descricao, valor, status, created_at, profissional_id, tipo_receituario, observacoes')
      .order('created_at', { ascending: false });

    if (dateRange) {
      receitasQuery = receitasQuery
        .gte('created_at', `${dateRange.inicio}T00:00:00.000Z`)
        .lte('created_at', `${dateRange.fim}T23:59:59.999Z`);
    }

    if (filters.status !== 'todos') {
      if (filters.status === 'pago') {
        receitasQuery = receitasQuery.in('status', ['pago', 'recebido', 'concluido']);
      } else if (filters.status === 'pendente') {
        receitasQuery = receitasQuery.in('status', ['pendente', 'ativo', 'em_aberto', null as unknown as string]);
      }
    }

    if (targetProfissionalId) {
      receitasQuery = receitasQuery.eq('profissional_id', targetProfissionalId);
    }

    const { data: receitasRaw, error: receitasError } = await receitasQuery;

    if (receitasError) {
      console.error('[financeiro.fetchLancamentosFinanceiros] receitas:', receitasError.message);
    }

    // ── 3. Procedimentos Realizados (Produção Clínica dos Dentistas) ────────
    let procsQuery = supabase
      .from('procedimentos_realizados')
      .select('id, valor_cobrado, comissao_gerada, data_realizacao, created_at, dentista_id, procedimento_id, paciente_id')
      .order('data_realizacao', { ascending: false });

    if (dateRange) {
      procsQuery = procsQuery
        .gte('data_realizacao', `${dateRange.inicio}T00:00:00.000Z`)
        .lte('data_realizacao', `${dateRange.fim}T23:59:59.999Z`);
    }

    if (targetProfissionalId) {
      procsQuery = procsQuery.eq('dentista_id', targetProfissionalId);
    }

    const [procsRes, procedimentosDefRes, pacientesDefRes] = await Promise.all([
      procsQuery,
      supabase.from('procedimentos').select('id, nome'),
      supabase.from('pacientes').select('id, nome'),
    ]);

    const procsRaw = procsRes.data ?? [];
    const procsDefMap = new Map((procedimentosDefRes.data ?? []).map((p) => [p.id, p.nome]));
    const pacsDefMap = new Map((pacientesDefRes.data ?? []).map((p) => [p.id, p.nome]));

    // ── 4. Despesas ──────────────────────────────────────────────────────
    let despesasQuery = supabase
      .from('despesas')
      .select('id, descricao, valor, status, categoria, created_at, data_vencimento, data_pagamento, user_id')
      .order('created_at', { ascending: false });

    if (dateRange) {
      despesasQuery = despesasQuery
        .gte('created_at', `${dateRange.inicio}T00:00:00.000Z`)
        .lte('created_at', `${dateRange.fim}T23:59:59.999Z`);
    }

    if (filters.status !== 'todos') {
      if (filters.status === 'pago') {
        despesasQuery = despesasQuery.in('status', ['pago', 'paga', 'concluido']);
      } else if (filters.status === 'pendente') {
        despesasQuery = despesasQuery.in('status', ['pendente', null as unknown as string]);
      } else if (filters.status === 'vencido') {
        const hoje = new Date().toISOString().split('T')[0];
        despesasQuery = despesasQuery
          .lt('data_vencimento', hoje)
          .in('status', ['pendente', null as unknown as string]);
      }
    }

    // Se estiver filtrando por um profissional específico, busca apenas despesas criadas por ele
    if (targetProfissionalId) {
      despesasQuery = despesasQuery.eq('user_id', targetProfissionalId);
    }

    const { data: despesasRaw, error: despesasError } = await despesasQuery;

    if (despesasError) {
      console.error('[financeiro.fetchLancamentosFinanceiros] despesas:', despesasError.message);
    }

    // ── 5. Normaliza e Monta Lançamentos ─────────────────────────────────
    const hoje = new Date().toISOString().split('T')[0];

    const lancamentosReceitas: LancamentoFinanceiro[] = (receitasRaw ?? []).map((r) => ({
      id: r.id,
      data: r.created_at,
      descricao: r.descricao ?? 'Receita',
      categoria: r.tipo_receituario ?? 'Receita',
      forma: r.observacoes || 'Pix / Boleto',
      valor: Number(r.valor ?? 0),
      tipo: 'entrada' as const,
      status: r.status ?? 'pendente',
      profissional_id: r.profissional_id ?? null,
      profissional_nome: r.profissional_id ? (profisMap[r.profissional_id] ?? null) : null,
      origem: 'receita' as const,
    }));

    const lancamentosProcs: LancamentoFinanceiro[] = procsRaw.map((p) => {
      const procNome = (p.procedimento_id && procsDefMap.get(p.procedimento_id)) || 'Procedimento Clínico';
      const pacNome = (p.paciente_id && pacsDefMap.get(p.paciente_id)) || 'Paciente';
      const profNome = p.dentista_id ? (profisMap[p.dentista_id] ?? null) : null;

      return {
        id: p.id,
        data: p.data_realizacao || p.created_at,
        descricao: `${procNome} - ${pacNome}`,
        categoria: 'Procedimento',
        forma: 'Pix / Cartão',
        valor: Number(p.valor_cobrado ?? 0),
        tipo: 'entrada' as const,
        status: 'pago',
        profissional_id: p.dentista_id ?? null,
        profissional_nome: profNome,
        origem: 'procedimento' as const,
      };
    });

    const lancamentosDespesas: LancamentoFinanceiro[] = (despesasRaw ?? []).map((d) => {
      const vencido =
        d.data_vencimento &&
        d.data_vencimento < hoje &&
        (d.status ?? 'pendente') === 'pendente';

      return {
        id: d.id,
        data: d.created_at,
        descricao: d.descricao ?? 'Despesa',
        categoria: d.categoria ?? 'Despesa Fixa',
        forma: 'Boleto',
        valor: Number(d.valor ?? 0),
        tipo: 'saida' as const,
        status: vencido ? 'vencido' : (d.status ?? 'pendente'),
        profissional_id: d.user_id ?? null,
        profissional_nome: d.user_id ? (profisMap[d.user_id] ?? null) : null,
        origem: 'despesa' as const,
      };
    });

    let lancamentos = [...lancamentosReceitas, ...lancamentosProcs, ...lancamentosDespesas].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
    );

    // ── 6. Filtro de busca textual ─────────────────────────────────────────
    if (filters.busca.trim()) {
      const termo = filters.busca.toLowerCase();
      lancamentos = lancamentos.filter(
        (l) =>
          l.descricao.toLowerCase().includes(termo) ||
          l.categoria.toLowerCase().includes(termo) ||
          (l.profissional_nome ?? '').toLowerCase().includes(termo)
      );
    }

    // ── 7. Calcula KPIs ───────────────────────────────────────────────────
    const todasEntradas = lancamentos.filter((l) => l.tipo === 'entrada');
    const todasSaidas = lancamentos.filter((l) => l.tipo === 'saida');

    const faturamentoTotal = todasEntradas.reduce((s, r) => s + r.valor, 0);
    const totalRecebido = todasEntradas
      .filter((r) => ['pago', 'recebido', 'concluido'].includes(r.status.toLowerCase()))
      .reduce((s, r) => s + r.valor, 0);
    const aReceber = todasEntradas
      .filter((r) => !['pago', 'recebido', 'concluido'].includes(r.status.toLowerCase()))
      .reduce((s, r) => s + r.valor, 0);
    const inadimplencia = todasEntradas
      .filter((r) => {
        const created = new Date(r.data);
        const diff = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
        return diff > 30 && !['pago', 'recebido', 'concluido'].includes(r.status.toLowerCase());
      })
      .reduce((s, r) => s + r.valor, 0);
    const despesasPeriodo = todasSaidas.reduce((s, d) => s + d.valor, 0);

    const kpis: KpisFinanceiro = {
      faturamentoTotal,
      totalRecebido,
      aReceber,
      inadimplencia,
      despesasPeriodo,
    };

    return { success: true, data: lancamentos, kpis };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    console.error('[financeiro.fetchLancamentosFinanceiros] Exceção:', msg);
    return {
      success: false,
      data: [],
      kpis: emptyKpis,
      error: msg,
    };
  }
}

// ─── Action: Buscar Profissionais para o <select> ──────────────────────────

export async function fetchProfissionaisSelect(): Promise<ProfissionaisResult> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, data: [], error: 'Não autorizado.' };
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, nome')
      .order('nome', { ascending: true });

    if (error) {
      console.error('[financeiro.fetchProfissionaisSelect] Erro:', error.message);
      return { success: false, data: [], error: error.message };
    }

    return { success: true, data: (data ?? []) as ProfissionalSelectItem[] };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    console.error('[financeiro.fetchProfissionaisSelect] Exceção:', msg);
    return { success: false, data: [], error: msg };
  }
}

// ─── Action: Criar Lançamento (Receita ou Despesa) ────────────────────────

export interface NovoLancamentoData {
  tipo: 'receita' | 'despesa';
  descricao: string;
  valor: number;
  data: string; // YYYY-MM-DD
  categoria: string;
  forma_pagamento: string;
  paciente?: string;
}

export async function createLancamentoFinanceiro(
  payload: NovoLancamentoData
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Não autorizado.' };
    }

    if (payload.tipo === 'receita') {
      const { error } = await supabase.from('receitas').insert({
        descricao: payload.descricao,
        valor: payload.valor,
        tipo_receituario: payload.categoria,
        status: 'pendente',
        profissional_id: user.id,
        observacoes: payload.forma_pagamento,
        created_at: `${payload.data}T12:00:00.000Z`,
      });
      if (error) {
        console.error('[financeiro.createLancamento] receita:', error.message);
        return { success: false, error: error.message };
      }
    } else {
      const { error } = await supabase.from('despesas').insert({
        descricao: payload.descricao,
        valor: payload.valor,
        categoria: payload.categoria,
        data_vencimento: payload.data,
        status: 'pendente',
        user_id: user.id,
      });
      if (error) {
        console.error('[financeiro.createLancamento] despesa:', error.message);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    console.error('[financeiro.createLancamento] Exceção:', msg);
    return { success: false, error: msg };
  }
}

// ─── Action: Marcar Lançamento como Pago / Recebido ────────────────────────

export async function marcarLancamentoComoPago(
  id: string,
  origem: 'receita' | 'despesa' | 'procedimento'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Não autorizado.' };
    }

    if (origem === 'receita') {
      const { error } = await supabase
        .from('receitas')
        .update({ status: 'pago' })
        .eq('id', id);
      if (error) {
        console.error('[financeiro.marcarLancamentoComoPago] receita:', error.message);
        return { success: false, error: error.message };
      }
    } else if (origem === 'despesa') {
      const hoje = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('despesas')
        .update({ status: 'pago', data_pagamento: hoje })
        .eq('id', id);
      if (error) {
        console.error('[financeiro.marcarLancamentoComoPago] despesa:', error.message);
        return { success: false, error: error.message };
      }
    } else if (origem === 'procedimento') {
      // Procedimento registrado na produção clínica
      return { success: true };
    }

    return { success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    console.error('[financeiro.marcarLancamentoComoPago] Exceção:', msg);
    return { success: false, error: msg };
  }
}

// ─── Action: Excluir Lançamento Financeiro ─────────────────────────────────

export async function deleteLancamentoFinanceiro(
  id: string,
  origem: 'receita' | 'despesa' | 'procedimento'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Não autorizado.' };
    }

    if (origem === 'receita') {
      const { error } = await supabase.from('receitas').delete().eq('id', id);
      if (error) {
        console.error('[financeiro.deleteLancamento] receita:', error.message);
        return { success: false, error: error.message };
      }
    } else if (origem === 'despesa') {
      const { error } = await supabase.from('despesas').delete().eq('id', id);
      if (error) {
        console.error('[financeiro.deleteLancamento] despesa:', error.message);
        return { success: false, error: error.message };
      }
    } else if (origem === 'procedimento') {
      const { error } = await supabase.from('procedimentos_realizados').delete().eq('id', id);
      if (error) {
        console.error('[financeiro.deleteLancamento] procedimento:', error.message);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    console.error('[financeiro.deleteLancamento] Exceção:', msg);
    return { success: false, error: msg };
  }
}

// ─── Action: Editar Lançamento Financeiro ──────────────────────────────────

export interface UpdateLancamentoData {
  id: string;
  origem: 'receita' | 'despesa' | 'procedimento';
  descricao: string;
  valor: number;
  data?: string; // YYYY-MM-DD
  categoria?: string;
  forma?: string;
  status?: string;
}

export async function updateLancamentoFinanceiro(
  payload: UpdateLancamentoData
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Não autorizado.' };
    }

    if (payload.origem === 'receita') {
      const updateData: ReceitaUpdate = {
        descricao: payload.descricao,
        valor: payload.valor,
      };
      if (payload.categoria) updateData.tipo_receituario = payload.categoria;
      if (payload.forma) updateData.observacoes = payload.forma;
      if (payload.status) updateData.status = payload.status;
      if (payload.data) updateData.created_at = `${payload.data}T12:00:00.000Z`;

      const { error } = await supabase.from('receitas').update(updateData).eq('id', payload.id);
      if (error) {
        console.error('[financeiro.updateLancamento] receita:', error.message);
        return { success: false, error: error.message };
      }
    } else if (payload.origem === 'despesa') {
      const updateData: DespesaUpdate = {
        descricao: payload.descricao,
        valor: payload.valor,
      };
      if (payload.categoria) updateData.categoria = payload.categoria;
      if (payload.status) {
        updateData.status = payload.status;
        if (payload.status === 'pago') {
          updateData.data_pagamento = new Date().toISOString().split('T')[0];
        }
      }
      if (payload.data) updateData.data_vencimento = payload.data;

      const { error } = await supabase.from('despesas').update(updateData).eq('id', payload.id);
      if (error) {
        console.error('[financeiro.updateLancamento] despesa:', error.message);
        return { success: false, error: error.message };
      }
    } else if (payload.origem === 'procedimento') {
      const updateData: ProcedimentoRealizadoUpdate = {
        valor_cobrado: payload.valor,
      };
      if (payload.data) updateData.data_realizacao = `${payload.data}T12:00:00.000Z`;

      const { error } = await supabase
        .from('procedimentos_realizados')
        .update(updateData)
        .eq('id', payload.id);
      if (error) {
        console.error('[financeiro.updateLancamento] procedimento:', error.message);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    console.error('[financeiro.updateLancamento] Exceção:', msg);
    return { success: false, error: msg };
  }
}
