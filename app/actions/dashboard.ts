'use server';

/**
 * app/actions/dashboard.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Ações de agregação de métricas e gráficos do Dashboard.
 *
 * Segurança (T001):
 *  ✅ Usa createServerClient() — autenticado via JWT/cookie → RLS ativo.
 *  ✅ Todas as leituras em receitas, pacientes, agendamentos, procedimentos_realizados
 *     e user_profiles respeitam as políticas de RLS da clínica do usuário logado.
 *  ✅ Sem uso indevido de service_role.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createServerClient } from '@/app/lib/supabase/server';

// ==========================================
// 1. Métricas Principais (KPIs)
// ==========================================
export async function fetchDashboardMetrics(anoParam?: number, mesParam?: number): Promise<{
  success: boolean;
  data: {
    faturamentoMensal: number;
    faturamentoMesAnterior: number;
    faturamentoCrescimento: number;
    pacientesAtivos: number;
    pacientesCrescimento: number;
    consultasHoje: number;
    consultasRealizadasHoje: number;
    taxaComparecimento: number;
  };
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        data: {
          faturamentoMensal: 0,
          faturamentoMesAnterior: 0,
          faturamentoCrescimento: 0,
          pacientesAtivos: 0,
          pacientesCrescimento: 0,
          consultasHoje: 0,
          consultasRealizadasHoje: 0,
          taxaComparecimento: 0,
        },
        error: 'Não autorizado: sessão inválida.',
      };
    }
    
    // Datas para filtros baseadas no parâmetro ou no momento atual
    const now = new Date();
    const targetYear = anoParam ?? now.getFullYear();
    const targetMonth = mesParam !== undefined ? mesParam : now.getMonth(); // 0 a 11

    const startOfMonth = new Date(targetYear, targetMonth, 1).toISOString();
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59).toISOString();
    
    const startOfLastMonth = new Date(targetYear, targetMonth - 1, 1).toISOString();
    const endOfLastMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59).toISOString();

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const yearStr = targetYear;
    const monthStr = String(targetMonth + 1).padStart(2, '0');
    const dayStr = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yearStr}-${monthStr}-${dayStr}`;

    // 1.1 Faturamento do Mês Selecionado (buscando da tabela 'receitas')
    const { data: faturamentoData, error: fatError } = await supabase
      .from('receitas')
      .select('valor, status, created_at')
      .gte('created_at', startOfMonth)
      .lte('created_at', endOfMonth);

    if (fatError) {
      console.error('[dashboard.fetchDashboardMetrics] Erro ao buscar receitas do mês:', fatError.message);
    }
      
    const faturamentoMensal = (faturamentoData || [])
      .filter(r => {
        const st = (r.status || '').toLowerCase();
        return st === 'pago' || st === 'recebido' || st === 'concluido';
      })
      .reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);

    // 1.1.2 Faturamento Mês Anterior ao Selecionado (para cálculo do crescimento %)
    const { data: faturamentoPassadoData } = await supabase
      .from('receitas')
      .select('valor, status, created_at')
      .gte('created_at', startOfLastMonth)
      .lte('created_at', endOfLastMonth);

    const faturamentoMesAnterior = (faturamentoPassadoData || [])
      .filter(r => {
        const st = (r.status || '').toLowerCase();
        return st === 'pago' || st === 'recebido' || st === 'concluido';
      })
      .reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);

    const faturamentoCrescimento = faturamentoMesAnterior > 0
      ? Math.round(((faturamentoMensal - faturamentoMesAnterior) / faturamentoMesAnterior) * 100)
      : 0;

    // 1.2 Pacientes Ativos Total
    const { count: pacientesCount } = await supabase
      .from('pacientes')
      .select('id', { count: 'exact', head: true });

    const pacientesAtivos = pacientesCount || 0;

    // Novos Pacientes nos últimos 7 dias
    const { count: novosPacientesCount } = await supabase
      .from('pacientes')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo);

    const pacientesCrescimento = novosPacientesCount || 0;

    // 1.3 Consultas Hoje (da tabela agendamentos) usando a coluna data_consulta
    const { data: agendaHoje } = await supabase
      .from('agendamentos')
      .select('status')
      .eq('data_consulta', todayStr);

    const consultasHoje = (agendaHoje || []).length;
    const consultasRealizadasHoje = (agendaHoje || []).filter(a => 
      ['atendido', 'realizado', 'concluido', 'confirmado'].includes(a.status)
    ).length;

    // 1.4 Taxa de Comparecimento
    const taxaComparecimento = consultasHoje > 0 
      ? Math.round((consultasRealizadasHoje / consultasHoje) * 100) 
      : 0;

    return {
      success: true,
      data: {
        faturamentoMensal,
        faturamentoMesAnterior,
        faturamentoCrescimento,
        pacientesAtivos,
        pacientesCrescimento,
        consultasHoje,
        consultasRealizadasHoje,
        taxaComparecimento
      }
    };

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro em fetchDashboardMetrics:', msg);
    return {
      success: false,
      data: {
        faturamentoMensal: 0,
        faturamentoMesAnterior: 0,
        faturamentoCrescimento: 0,
        pacientesAtivos: 0,
        pacientesCrescimento: 0,
        consultasHoje: 0,
        consultasRealizadasHoje: 0,
        taxaComparecimento: 0
      },
      error: msg
    };
  }
}

// ==========================================
// 2. Métricas Complementares (saldo líquido e despesas do mês)
// ==========================================
export async function fetchDashboardComplement(anoParam?: number, mesParam?: number): Promise<{
  success: boolean;
  data: { despesasMes: number; saldoLiquido: number };
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, data: { despesasMes: 0, saldoLiquido: 0 }, error: 'Não autorizado.' };
    }

    const now = new Date();
    const targetYear = anoParam ?? now.getFullYear();
    const targetMonth = mesParam !== undefined ? mesParam : now.getMonth();
    const startOfMonth = new Date(targetYear, targetMonth, 1).toISOString();
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59).toISOString();

    const { data: despesasData } = await supabase
      .from('despesas')
      .select('valor, status, data_vencimento')
      .gte('data_vencimento', startOfMonth.slice(0, 10))
      .lte('data_vencimento', endOfMonth.slice(0, 10));

    const despesasMes = (despesasData || []).reduce((acc, d) => acc + (Number(d.valor) || 0), 0);

    // saldo líquido = faturamento já calculado na action principal — aqui só devolvemos despesas
    // O chamador calcula: saldo = faturamentoMensal - despesasMes
    return { success: true, data: { despesasMes, saldoLiquido: 0 } };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, data: { despesasMes: 0, saldoLiquido: 0 }, error: msg };
  }
}

// ==========================================
// 3. Alertas Rápidos do Dashboard
// ==========================================
export interface AgendamentoDia {
  id: string;
  hora_consulta: string;
  procedimento: string | null;
  status: string;
  paciente_nome: string;
}

export interface EstoqueCritico {
  id: string;
  nome: string;
  quantidade: number;
  minimo: number;
  unidade: string;
}

export interface DespesaVencida {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  dias_atraso: number;
}

export async function fetchDashboardAlerts(): Promise<{
  success: boolean;
  data: {
    agendamentosDia: AgendamentoDia[];
    estoqueCritico: EstoqueCritico[];
    despesasVencidas: DespesaVencida[];
  };
  error?: string;
}> {
  const empty = { agendamentosDia: [], estoqueCritico: [], despesasVencidas: [] };
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, data: empty, error: 'Não autorizado.' };
    }

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayIso = now.toISOString().slice(0, 10);

    // ── Agendamentos do dia (ordenados por hora) ──────────────────────────────
    const [{ data: agData }, { data: pacData }] = await Promise.all([
      supabase
        .from('agendamentos')
        .select('id, hora_consulta, procedimento, status, paciente_id')
        .eq('data_consulta', todayStr)
        .not('status', 'in', '("cancelado","faltou")')
        .order('hora_consulta', { ascending: true })
        .limit(8),
      supabase
        .from('pacientes')
        .select('id, nome'),
    ]);

    const pacMap: Record<string, string> = {};
    (pacData || []).forEach((p) => {
      if (p.id && p.nome) pacMap[p.id] = p.nome;
    });

    const agendamentosDia: AgendamentoDia[] = (agData || []).map((a) => ({
      id: a.id,
      hora_consulta: a.hora_consulta,
      procedimento: a.procedimento,
      status: a.status,
      paciente_nome: (a.paciente_id ? pacMap[a.paciente_id] : null) || 'Paciente',
    }));

    // ── Estoque crítico (quantidade <= minimo) ────────────────────────────────
    const { data: estoqueData } = await supabase
      .from('estoque')
      .select('id, nome, quantidade, minimo, unidade');

    const estoqueCritico: EstoqueCritico[] = (estoqueData || [])
      .filter((e) => Number(e.quantidade ?? 0) <= Number(e.minimo ?? 0))
      .slice(0, 5)
      .map((e) => ({
        id: e.id,
        nome: e.nome,
        quantidade: Number(e.quantidade ?? 0),
        minimo: Number(e.minimo ?? 0),
        unidade: e.unidade || 'un',
      }));

    // ── Despesas vencidas e ainda pendentes ───────────────────────────────────
    const { data: despData } = await supabase
      .from('despesas')
      .select('id, descricao, valor, data_vencimento')
      .eq('status', 'pendente')
      .lt('data_vencimento', todayIso)
      .order('data_vencimento', { ascending: true })
      .limit(5);

    const nowMs = now.getTime();
    const despesasVencidas: DespesaVencida[] = (despData || []).map((d) => {
      const vencMs = new Date(d.data_vencimento).getTime();
      const diasAtraso = Math.max(1, Math.floor((nowMs - vencMs) / 86_400_000));
      return {
        id: d.id,
        descricao: d.descricao,
        valor: Number(d.valor ?? 0),
        data_vencimento: d.data_vencimento,
        dias_atraso: diasAtraso,
      };
    });

    return { success: true, data: { agendamentosDia, estoqueCritico, despesasVencidas } };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro em fetchDashboardAlerts:', msg);
    return { success: false, data: empty, error: msg };
  }
}

// ==========================================
// 4. Gráficos de Desempenho
// ==========================================
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export interface CashFlowPoint {
  name: string;
  receitas: number;
  despesas: number;
}

export interface ProcedureRank {
  name: string;
  count: number;
  fill: string;
}

export interface DentistDist {
  name: string;
  value: number;
  fill: string;
}

export async function fetchDashboardCharts(): Promise<{
  success: boolean;
  data: {
    cashFlow: CashFlowPoint[];
    topProcedures: ProcedureRank[];
    dentistDistribution: DentistDist[];
  };
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        data: { cashFlow: [], topProcedures: [], dentistDistribution: [] },
        error: 'Não autorizado: sessão inválida.',
      };
    }

    const now = new Date();

    // ── 1. Fluxo de Caixa: últimos 7 meses (1 única consulta agregada) ──
    const sevenMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString();
    const { data: recsAll } = await supabase
      .from('receitas')
      .select('valor, status, created_at')
      .gte('created_at', sevenMonthsAgo);

    const cashFlow: CashFlowPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ano = d.getFullYear();
      const mes = d.getMonth();
      const label = d.toLocaleDateString('pt-BR', { month: 'short' });

      const receitas = (recsAll || [])
        .filter((r) => {
          if (!r.created_at) return false;
          const dt = new Date(r.created_at);
          if (dt.getFullYear() !== ano || dt.getMonth() !== mes) return false;
          const st = (r.status || '').toLowerCase();
          return st === 'pago' || st === 'recebido' || st === 'concluido';
        })
        .reduce((s: number, r) => s + (Number(r.valor) || 0), 0);

      cashFlow.push({ name: label.charAt(0).toUpperCase() + label.slice(1, 3), receitas, despesas: 0 });
    }

    // ── 2. Top Procedimentos (buscando da tabela 'receitas' via descricao) ──
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
    const { data: recsRaw } = await supabase
      .from('receitas')
      .select('descricao, created_at')
      .gte('created_at', startOfYear);

    const procCount: Record<string, number> = {};
    (recsRaw || []).forEach((r) => {
      const nome = r.descricao || 'Outros';
      procCount[nome] = (procCount[nome] || 0) + 1;
    });

    const topProcedures: ProcedureRank[] = Object.entries(procCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count], i) => ({ name, count, fill: CHART_COLORS[i % CHART_COLORS.length] }));

    // ── 3. Distribuição por Dentista ────────────────────────────────────────
    const { data: dentistas } = await supabase
      .from('user_profiles')
      .select('id, nome')
      .eq('role', 'dentista');

    const dentistDistribution: DentistDist[] = [];

    if (dentistas && dentistas.length > 0) {
      const { data: atendimentos } = await supabase
        .from('procedimentos_realizados')
        .select('dentista_id')
        .gte('data_realizacao', new Date(now.getFullYear(), now.getMonth(), 1).toISOString());

      const countByDentist: Record<string, number> = {};
      (atendimentos || []).forEach((a) => {
        if (a.dentista_id) {
          countByDentist[a.dentista_id] = (countByDentist[a.dentista_id] || 0) + 1;
        }
      });

      dentistas.forEach((d, i: number) => {
        const value = countByDentist[d.id] || 0;
        dentistDistribution.push({
          name: d.nome,
          value,
          fill: CHART_COLORS[i % CHART_COLORS.length],
        });
      });
    }

    return {
      success: true,
      data: {
        cashFlow: cashFlow.length > 0 ? cashFlow : [],
        topProcedures: topProcedures.length > 0 ? topProcedures : [],
        dentistDistribution,
      },
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro em fetchDashboardCharts:', msg);
    return {
      success: false,
      data: { cashFlow: [], topProcedures: [], dentistDistribution: [] },
      error: msg
    };
  }
}