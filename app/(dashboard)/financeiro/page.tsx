'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../components/RequireAuth'
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, CreditCard,
  Plus, ArrowUpRight, ArrowDownRight, Search, Filter, Download,
  Send, FileText, Settings, Users, CheckCircle2, Clock, XCircle,
  BarChart3, Wallet, Receipt, Percent, ChevronDown, MoreHorizontal,
  Banknote, QrCode, Smartphone, Copy, Trash2, CheckCheck, Check, Minus, Loader2,
  Pencil, X
} from 'lucide-react'
import { toast } from 'sonner'
import { fetchExtratoComissoes, ExtratoComissoes, fetchDentistasComComissoes, DentistaComissao } from '@/app/actions/performance'
import {
  fetchLancamentosFinanceiros,
  fetchProfissionaisSelect,
  createLancamentoFinanceiro,
  marcarLancamentoComoPago,
  deleteLancamentoFinanceiro,
  updateLancamentoFinanceiro,
  type LancamentoFinanceiro,
  type PeriodoFilter,
  type StatusFilter,
  type KpisFinanceiro,
  type ProfissionalSelectItem,
} from '@/app/actions/financeiro'
import { TableSkeleton } from '@/app/components/ui/Skeleton'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { ErrorState } from '@/app/components/ui/ErrorState'

// ─── Tipos ────────────────────────────────────────────────
type TabId = 'painel' | 'fluxo' | 'boletos' | 'comissoes'

// ─── Helpers ──────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const fmtData = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return iso
  }
}

const formaIcon = (forma: string) => {
  if (forma.toLowerCase().includes('pix')) return <QrCode className="h-3.5 w-3.5" />
  if (forma.toLowerCase().includes('cartão') || forma.toLowerCase().includes('crédito') || forma.toLowerCase().includes('débito')) return <CreditCard className="h-3.5 w-3.5" />
  if (forma.toLowerCase().includes('dinheiro')) return <Banknote className="h-3.5 w-3.5" />
  if (forma.toLowerCase().includes('boleto')) return <Receipt className="h-3.5 w-3.5" />
  return <Wallet className="h-3.5 w-3.5" />
}

// ─── Tipo para boletos (integração futura com Supabase) ────
interface BoletoItem {
  id: number
  paciente: string
  descricao: string
  valor: number
  vencimento: string
  status: 'aberto' | 'vencido' | 'pago'
  banco: string
}

// ═══════════════════════════════════════════════════════════
// ─── COMPONENTE PRINCIPAL ─────────────────────────────────
// ═══════════════════════════════════════════════════════════
export default function FinanceiroPage() {
  const [activeTab, setActiveTab] = useState<TabId>('painel')
  const [showNewModal, setShowNewModal] = useState<'receita' | 'despesa' | null>(null)
  const [comissaoModal, setComissaoModal] = useState(false)

  // ── Estados do modal de criação ──────────────────────────
  const [novoDescricao, setNovoDescricao] = useState('')
  const [novoValor, setNovoValor] = useState('')
  const [novoData, setNovoData] = useState(new Date().toISOString().split('T')[0])
  const [novoCategoria, setNovoCategoria] = useState('Procedimento')
  const [novoForma, setNovoForma] = useState('Pix')
  const [novoPaciente, setNovoPaciente] = useState('')
  const [modalSaving, setModalSaving] = useState(false)

  // ── Estados dos Filtros do Fluxo de Caixa ───────────────
  const [periodoFilter, setPeriodoFilter] = useState<PeriodoFilter>('este_mes')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')
  const [profissionalFilter, setProfissionalFilter] = useState<string>('todos')
  const [searchFilter, setSearchFilter] = useState('')

  // ── Dados dinâmicos do Fluxo de Caixa ───────────────────
  const [lancamentosLoading, setLancamentosLoading] = useState(true)
  const [lancamentosList, setLancamentosList] = useState<LancamentoFinanceiro[]>([])
  const [kpisDinamicos, setKpisDinamicos] = useState<KpisFinanceiro>({
    faturamentoTotal: 0,
    totalRecebido: 0,
    aReceber: 0,
    inadimplencia: 0,
    despesasPeriodo: 0,
  })
  const kpis = kpisDinamicos
  const [profissionaisList, setProfissionaisList] = useState<ProfissionalSelectItem[]>([])

  // Busca profissionais ao montar
  useEffect(() => {
    fetchProfissionaisSelect().then(res => {
      if (res.success) setProfissionaisList(res.data)
    })
  }, [])

  // Busca lançamentos sempre que os filtros mudarem
  const carregarLancamentos = useCallback(async () => {
    setLancamentosLoading(true)
    const res = await fetchLancamentosFinanceiros({
      periodo: periodoFilter,
      status: statusFilter,
      profissionalId: profissionalFilter,
      busca: searchFilter,
    })
    if (res.success) {
      setLancamentosList(res.data)
      setKpisDinamicos(res.kpis)
    } else {
      toast.error('Erro ao carregar lançamentos: ' + res.error)
    }
    setLancamentosLoading(false)
  }, [periodoFilter, statusFilter, profissionalFilter, searchFilter])

  useEffect(() => {
    carregarLancamentos()
  }, [carregarLancamentos])

  // ── Exportação CSV ───────────────────────────────────────
  function handleExportCSV() {
    if (lancamentosList.length === 0) {
      toast.error('Nenhum lançamento para exportar com os filtros atuais.')
      return
    }

    const BOM = '\uFEFF'
    const headers = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Forma de Pagamento', 'Status', 'Valor (R$)']
    const rows = lancamentosList.map(l => [
      fmtData(l.data),
      `"${l.descricao.replace(/"/g, '""')}"`,
      `"${l.categoria.replace(/"/g, '""')}"`,
      l.tipo === 'entrada' ? 'Receita' : 'Despesa',
      `"${l.forma.replace(/"/g, '""')}"`,
      l.status,
      String(l.valor.toFixed(2)).replace('.', ','),
    ])

    const csvContent =
      BOM +
      [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const dataHoje = new Date().toISOString().split('T')[0]
    link.href = url
    link.download = `lancamentos_financeiros_${dataHoje}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success(`${lancamentosList.length} lançamentos exportados com sucesso!`)
  }

  // ── Salvar novo lançamento ───────────────────────────────
  async function handleSalvarLancamento() {
    if (!novoDescricao.trim() || !novoValor || !novoData) {
      toast.error('Preencha todos os campos obrigatórios.')
      return
    }
    setModalSaving(true)
    const res = await createLancamentoFinanceiro({
      tipo: showNewModal === 'receita' ? 'receita' : 'despesa',
      descricao: novoDescricao,
      valor: Number(novoValor),
      data: novoData,
      categoria: novoCategoria,
      forma_pagamento: novoForma,
      paciente: novoPaciente || undefined,
    })
    if (res.success) {
      toast.success('Lançamento salvo com sucesso!')
      setShowNewModal(null)
      setNovoDescricao('')
      setNovoValor('')
      setNovoData(new Date().toISOString().split('T')[0])
      setNovoCategoria('Procedimento')
      setNovoForma('Pix')
      setNovoPaciente('')
      // Recarrega se estiver na aba de fluxo
      if (activeTab === 'fluxo') carregarLancamentos()
    } else {
      toast.error('Erro ao salvar lançamento: ' + res.error)
    }
    setModalSaving(false)
  }

  // ── Estado do Menu de Ações dos Lançamentos ───────────────
  const [activeLancamentoMenuId, setActiveLancamentoMenuId] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  // ── Estado do Modal de Edição de Lançamento ───────────────
  const [editingLancamento, setEditingLancamento] = useState<LancamentoFinanceiro | null>(null)
  const [editDescricao, setEditDescricao] = useState('')
  const [editValor, setEditValor] = useState('')
  const [editData, setEditData] = useState('')
  const [editCategoria, setEditCategoria] = useState('')
  const [editForma, setEditForma] = useState('')
  const [editStatus, setEditStatus] = useState('pago')
  const [editSaving, setEditSaving] = useState(false)

  // Handlers para ações de lançamentos
  async function handleMarcarComoPago(l: LancamentoFinanceiro) {
    setActiveLancamentoMenuId(null)
    setActionLoadingId(l.id)
    const res = await marcarLancamentoComoPago(l.id, l.origem)
    if (res.success) {
      toast.success(l.tipo === 'entrada' ? 'Lançamento marcado como recebido!' : 'Lançamento marcado como pago!')
      carregarLancamentos()
    } else {
      toast.error('Erro ao atualizar status: ' + (res.error || 'Erro desconhecido'))
    }
    setActionLoadingId(null)
  }

  async function handleExcluirLancamento(l: LancamentoFinanceiro) {
    setActiveLancamentoMenuId(null)
    if (!window.confirm(`Tem certeza que deseja excluir o lançamento "${l.descricao}"?`)) {
      return
    }
    setActionLoadingId(l.id)
    const res = await deleteLancamentoFinanceiro(l.id, l.origem)
    if (res.success) {
      toast.success('Lançamento excluído com sucesso!')
      carregarLancamentos()
    } else {
      toast.error('Erro ao excluir lançamento: ' + (res.error || 'Erro desconhecido'))
    }
    setActionLoadingId(null)
  }

  function handleAbrirEdicao(l: LancamentoFinanceiro) {
    setActiveLancamentoMenuId(null)
    setEditingLancamento(l)
    setEditDescricao(l.descricao)
    setEditValor(String(l.valor))
    setEditData(l.data ? l.data.split('T')[0] : new Date().toISOString().split('T')[0])
    setEditCategoria(l.categoria)
    setEditForma(l.forma)
    setEditStatus(l.status)
  }

  async function handleSalvarEdicao() {
    if (!editingLancamento) return
    if (!editDescricao.trim() || !editValor || !editData) {
      toast.error('Preencha os campos obrigatórios.')
      return
    }
    setEditSaving(true)
    const res = await updateLancamentoFinanceiro({
      id: editingLancamento.id,
      origem: editingLancamento.origem,
      descricao: editDescricao.trim(),
      valor: Number(editValor),
      data: editData,
      categoria: editCategoria,
      forma: editForma,
      status: editStatus,
    })
    if (res.success) {
      toast.success('Lançamento atualizado com sucesso!')
      setEditingLancamento(null)
      carregarLancamentos()
    } else {
      toast.error('Erro ao atualizar lançamento: ' + (res.error || 'Erro desconhecido'))
    }
    setEditSaving(false)
  }

  // ── Estado da aba de Boletos ─────────────────────────────
  // Boletos: estado vazio — integração futura com Supabase (tabela boletos/cobranças)
  const [boletosData, setBoletosData] = useState<BoletoItem[]>([])
  const [selectedBoletos, setSelectedBoletos] = useState<Set<number>>(new Set())
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const allSelected = selectedBoletos.size === boletosData.length && boletosData.length > 0
  const someSelected = selectedBoletos.size > 0 && !allSelected

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedBoletos(new Set())
    } else {
      setSelectedBoletos(new Set(boletosData.map(b => b.id)))
    }
  }

  function toggleSelectOne(id: number) {
    setSelectedBoletos(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleBoletosAction(boletoId: number, action: string) {
    setOpenDropdownId(null)
    if (action === 'pagar') {
      setBoletosData(prev => prev.map(b => b.id === boletoId ? { ...b, status: 'pago' } : b))
      toast.success('Boleto marcado como pago!')
    } else if (action === 'excluir') {
      setBoletosData(prev => prev.filter(b => b.id !== boletoId))
      setSelectedBoletos(prev => { const n = new Set(prev); n.delete(boletoId); return n })
      toast.success('Boleto removido.')
    } else if (action === 'copiar') {
      // Simulação: copia um código de barras fictício
      navigator.clipboard.writeText('34191.09008 22091.070054 00024.881007 3 94520000048000')
        .then(() => toast.success('Código de barras copiado!'))
        .catch(() => toast.info('Código: 34191.09008 22091.070054 00024.881007 3 94520000048000'))
    } else if (action === 'baixar') {
      toast.info('Download do boleto iniciado (integração com banco necessária).')
    }
  }

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdownId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Estado da aba de Comissões ───────────────────────────
  const [profsData, setProfsData] = useState<DentistaComissao[]>([])
  const [profsLoading, setProfsLoading] = useState(true)
  const [quittingId, setQuittingId] = useState<string | null>(null)
  const [extratoModal, setExtratoModal] = useState<string | null>(null)
  const [extratoData, setExtratoData] = useState<ExtratoComissoes | null>(null)
  const [extratoLoading, setExtratoLoading] = useState(false)

  // Carrega dentistas com totais reais ao montar
  useEffect(() => {
    fetchDentistasComComissoes(30).then(res => {
      if (res.success) setProfsData(res.data)
      else toast.error('Erro ao carregar comissões: ' + res.error)
      setProfsLoading(false)
    })
  }, [])

  const handleOpenExtrato = useCallback(async (id: string) => {
    setExtratoModal(id)
    setExtratoData(null)
    setExtratoLoading(true)
    const res = await fetchExtratoComissoes(id, 30)
    if (res.success) setExtratoData(res.data)
    else toast.error('Erro ao buscar extrato: ' + res.error)
    setExtratoLoading(false)
  }, [])

  async function handleQuitar(id: string) {
    setQuittingId(id)
    await new Promise(r => setTimeout(r, 800))
    setProfsData(prev => prev.map(p => p.id === id ? { ...p, status: 'pago' as const } : p))
    setQuittingId(null)
    toast.success('Repasse quitado com sucesso!')
  }

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'painel', label: 'Painel', icon: BarChart3 },
    { id: 'fluxo', label: 'Fluxo de Caixa', icon: Wallet },
    { id: 'boletos', label: 'Boletos', icon: Receipt },
    { id: 'comissoes', label: 'Comissões', icon: Percent },
  ]

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-base)]">

      {/* ── PAGE HEADER ──────────────────────────────── */}
      <div className="px-4 sm:px-8 pt-6 pb-2 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Financeiro</h1>
            <p className="text-xs sm:text-sm font-semibold text-[var(--text-muted)] mt-0.5">Gestão de fluxo de caixa, boletos, conciliação e comissões</p>
          </div>
          <div className="flex gap-2.5 self-start sm:self-auto">
            <button
              onClick={() => setShowNewModal('receita')}
              className="h-10 px-4 sm:px-5 rounded-2xl font-bold text-xs sm:text-sm bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] text-[var(--on-primary)] transition-all  flex items-center gap-2 active:scale-95"
            >
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nova </span>Receita
            </button>
            <button
              onClick={() => setShowNewModal('despesa')}
              className="h-10 px-4 sm:px-5 rounded-2xl font-bold text-xs sm:text-sm bg-[var(--bg-surface)] border border-[var(--border)]/80  text-[var(--text-secondary)] hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] transition-all shadow-2xs flex items-center gap-2 active:scale-95"
            >
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nova </span>Despesa
            </button>
          </div>
        </div>

        {/* ── TABS (Estilo Bento Pills) ────────────────── */}
        <div className="flex gap-1.5 p-1 bg-[var(--border)]/60 dark:bg-[var(--bg-surface)] rounded-2xl w-fit border border-[var(--border)]/70  overflow-x-auto scrollbar-none">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-extrabold rounded-xl transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[var(--bg-surface)] text-[var(--primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] '
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── TAB CONTENT ──────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* ═══ ABA: PAINEL ═══════════════════════════ */}
        {activeTab === 'painel' && (
          <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 animate-in fade-in duration-300 max-w-7xl mx-auto w-full">

            {/* KPIs Bento Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
              {[
                { label: 'Faturamento Total', value: fmt(kpisDinamicos.faturamentoTotal), change: 'Total', trend: 'up', icon: DollarSign, color: 'blue' },
                { label: 'Total Recebido', value: fmt(kpisDinamicos.totalRecebido), change: 'Recebido', trend: 'up', icon: TrendingUp, color: 'green' },
                { label: 'A Receber', value: fmt(kpisDinamicos.aReceber), change: 'Pendente', trend: 'neutral', icon: Clock, color: 'amber' },
                { label: 'Inadimplência', value: fmt(kpisDinamicos.inadimplencia), change: '> 30 dias', trend: 'down', icon: AlertTriangle, color: 'red' },
                { label: 'Despesas do Mês', value: fmt(kpisDinamicos.despesasPeriodo), change: 'Saídas', trend: 'down', icon: TrendingDown, color: 'cyan' },
              ].map((kpi, i) => {
                const Icon = kpi.icon
                const colorMap: Record<string, string> = {
                  blue: 'bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/20',
                  green: 'bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/20',
                  amber: 'bg-[var(--bg-base)] text-[var(--text-secondary)] border border-[var(--border)]',
                  red: 'bg-[var(--bg-base)] text-[var(--text-secondary)] border border-[var(--border)]',
                  cyan: 'bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/20',
                }

                return (
                  <div key={i} className="bento-card bento-card-interactive p-6 rounded-3xl shadow-bento flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-extrabold text-[var(--text-muted)] uppercase tracking-wider">
                        {kpi.label}
                      </span>
                      <div className={`p-2 rounded-xl ${colorMap[kpi.color || 'green']}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-auto">
                      <p className="text-2xl font-black text-[var(--text-primary)] tracking-tight">{kpi.value}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                          kpi.trend === 'up' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/50' :
                          kpi.trend === 'down' ? 'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/50' :
                          'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/50'
                        }`}>
                          {kpi.change}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Gráfico de Fluxo de Caixa */}
            <div className="bg-[var(--bg-surface)] rounded-3xl p-6 sm:p-8 border border-[var(--border)]/80  shadow-bento">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Fluxo de Caixa</h3>
                  <p className="text-xs sm:text-sm font-semibold text-[var(--text-muted)] mt-0.5">Entradas vs. Saídas (últimos 6 meses)</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/30">
                    <span className="h-2 w-2 rounded-full bg-[var(--primary-fill)]"></span> Entradas
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60">
                    <span className="h-2 w-2 rounded-full bg-rose-500"></span> Saídas
                  </span>
                </div>
              </div>
              {/* Gráfico derivado dos lançamentos reais (últimos 6 meses) */}
              {(() => {
                // Agrupa lancamentosLoading por mês (MM/YY) para exibir no gráfico
                const mesesMap: Record<string, { entradas: number; saidas: number }> = {}
                lancamentosList.forEach(l => {
                  const d = new Date(l.data)
                  if (isNaN(d.getTime())) return
                  const key = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
                  if (!mesesMap[key]) mesesMap[key] = { entradas: 0, saidas: 0 }
                  if (l.tipo === 'entrada') mesesMap[key].entradas += l.valor
                  else mesesMap[key].saidas += l.valor
                })
                const chartPoints = Object.entries(mesesMap)
                  .slice(-6)
                  .map(([mes, vals]) => ({ mes, ...vals }))
                const maxVal = Math.max(...chartPoints.flatMap(d => [d.entradas, d.saidas]), 1)

                if (chartPoints.length === 0) {
                  return (
                    <div className="flex items-center justify-center h-48 text-[var(--text-muted)] text-sm">
                      Nenhum lançamento para exibir.
                    </div>
                  )
                }

                return (
                  <div className="flex items-end gap-4 h-56">
                    {chartPoints.map((d, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full flex gap-1.5 items-end justify-center h-48">
                          <div
                            className="w-5 bg-[var(--primary-fill)] rounded-t-xl transition-all duration-500 hover:bg-[var(--primary-fill-hover)]"
                            style={{ height: `${(d.entradas / maxVal) * 100}%` }}
                            title={`Entradas: ${fmt(d.entradas)}`}
                          ></div>
                          <div
                            className="w-5 bg-[var(--error)] rounded-t-xl transition-all duration-500 hover:opacity-90"
                            style={{ height: `${(d.saidas / maxVal) * 100}%` }}
                            title={`Saídas: ${fmt(d.saidas)}`}
                          ></div>
                        </div>
                        <span className="text-xs font-bold text-[var(--text-muted)]">{d.mes}</span>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>

            {/* Últimos Lançamentos (resumo) */}
            <div className="bg-[var(--bg-surface)] rounded-3xl p-6 sm:p-8 border border-[var(--border)]/80  shadow-bento">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Últimos Lançamentos</h3>
                  <p className="text-xs font-semibold text-[var(--text-muted)] mt-0.5">Transações registradas recentemente</p>
                </div>
                <button onClick={() => setActiveTab('fluxo')} className="text-xs sm:text-sm font-bold text-[var(--primary)] hover:text-[var(--primary)] flex items-center gap-1 transition-colors">
                  Ver todos <ArrowUpRight className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2.5">
                {lancamentosLoading ? (
                  <div className="flex items-center justify-center py-6 text-[var(--text-muted)] text-sm gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando lançamentos...
                  </div>
                ) : lancamentosList.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] text-center py-6">Nenhum lançamento recente.</p>
                ) : (
                  lancamentosList.slice(0, 4).map(l => (
                    <div key={l.id} className="flex items-center justify-between gap-3 p-3.5 bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)]/60  hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2.5 rounded-xl shrink-0 ${l.tipo === 'entrada' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'}`}>
                          {l.tipo === 'entrada' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[var(--text-primary)] truncate">{l.descricao}</p>
                          <p className="text-xs font-semibold text-[var(--text-muted)] truncate">{fmtData(l.data)} · {l.categoria}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-black shrink-0 ${l.tipo === 'entrada' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {l.tipo === 'entrada' ? '+' : '-'} {fmt(l.valor)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ ABA: FLUXO DE CAIXA ═══════════════════ */}
        {activeTab === 'fluxo' && (
          <div className="p-4 sm:p-8 space-y-6 animate-in fade-in duration-300">

            {/* Filtros */}
            <div className="bg-[var(--bg-surface)] rounded-3xl p-5 border border-[var(--border)]/80  shadow-bento flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2 bg-[var(--bg-base)] border border-[var(--border)]/80  rounded-2xl px-3.5 py-2 flex-1 min-w-[200px] max-w-sm focus-within:border-[var(--primary)]/40 focus-within:ring-2 focus-within:ring-[var(--primary)]/20 transition-all">
                <Search className="h-4 w-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Buscar lançamento ou categoria..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs sm:text-sm w-full text-[var(--text-primary)] placeholder-[var(--text-secondary)] font-semibold"
                />
              </div>
              <select
                value={periodoFilter}
                onChange={e => setPeriodoFilter(e.target.value as PeriodoFilter)}
                className="bg-[var(--bg-base)] border border-[var(--border)]/80  rounded-2xl px-3.5 py-2 text-xs sm:text-sm font-bold text-[var(--text-secondary)] focus:outline-none focus:border-[var(--primary)]/40"
              >
                <option value="este_mes">Este Mês</option>
                <option value="mes_passado">Mês Passado</option>
                <option value="7">Últimos 7 dias</option>
                <option value="30">Últimos 30 dias</option>
                <option value="90">Últimos 90 dias</option>
                <option value="este_ano">Este Ano</option>
                <option value="todos">Todos</option>
              </select>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                className="bg-[var(--bg-base)] border border-[var(--border)]/80  rounded-2xl px-3.5 py-2 text-xs sm:text-sm font-bold text-[var(--text-secondary)] focus:outline-none focus:border-[var(--primary)]/40"
              >
                <option value="todos">Todos os Status</option>
                <option value="pago">Pago</option>
                <option value="pendente">Pendente</option>
                <option value="vencido">Vencido</option>
              </select>
              <select
                value={profissionalFilter}
                onChange={e => setProfissionalFilter(e.target.value)}
                className="bg-[var(--bg-base)] border border-[var(--border)]/80  rounded-2xl px-3.5 py-2 text-xs sm:text-sm font-bold text-[var(--text-secondary)] focus:outline-none focus:border-[var(--primary)]/40"
              >
                <option value="todos">Todos os Profissionais</option>
                {profissionaisList.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
              <button
                onClick={handleExportCSV}
                disabled={lancamentosLoading || lancamentosList.length === 0}
                className="ml-auto h-10 px-4 rounded-2xl text-xs sm:text-sm font-bold bg-[var(--bg-surface)] border border-[var(--border)]/80  text-[var(--text-secondary)] hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] flex items-center gap-2 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="h-4 w-4" /> Exportar
              </button>
            </div>

            {/* Resumo KPIs Dinâmicos */}
            {!lancamentosLoading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                {[
                  { label: 'Faturamento', value: kpisDinamicos.faturamentoTotal, color: 'blue', icon: DollarSign },
                  { label: 'Recebido', value: kpisDinamicos.totalRecebido, color: 'green', icon: TrendingUp },
                  { label: 'A Receber', value: kpisDinamicos.aReceber, color: 'amber', icon: Clock },
                  { label: 'Inadimplência', value: kpisDinamicos.inadimplencia, color: 'red', icon: AlertTriangle },
                  { label: 'Despesas', value: kpisDinamicos.despesasPeriodo, color: 'purple', icon: TrendingDown },
                ].map((k, i) => {
                  const Icon = k.icon
                  const colorMap: Record<string, string> = {
                    blue: 'text-[var(--primary)] bg-[var(--primary-subtle)] border border-[var(--primary)]/20',
                    green: 'text-[var(--primary)] bg-[var(--primary-subtle)] border border-[var(--primary)]/20',
                    amber: 'text-[var(--text-secondary)] bg-[var(--bg-base)] border border-[var(--border)]',
                    red: 'text-[var(--text-secondary)] bg-[var(--bg-base)] border border-[var(--border)]',
                    purple: 'text-[var(--text-secondary)] bg-[var(--bg-base)] border border-[var(--border)]',
                  }
                  return (
                    <div key={i} className="bento-card p-4 rounded-2xl shadow-2xs">
                      <div className={`inline-flex p-1.5 rounded-xl mb-2 ${colorMap[k.color]}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-base font-black text-[var(--text-primary)] leading-tight">{fmt(k.value)}</p>
                      <p className="text-xs font-bold text-[var(--text-secondary)] mt-0.5">{k.label}</p>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Lista de Lançamentos com Skeleton e EmptyState */}
            {lancamentosLoading ? (
              <div className="bg-[var(--bg-surface)] rounded-3xl p-6 border border-[var(--border)]/80  shadow-xs">
                <TableSkeleton rows={4} cols={5} />
              </div>
            ) : lancamentosList.length === 0 ? (
              <EmptyState
                icon={<Wallet size={30} />}
                title="Nenhum lançamento encontrado"
                description="Tente ajustar os filtros selecionados ou registre uma nova receita ou despesa para alimentar o fluxo de caixa."
                actionLabel="Nova Receita"
                actionIcon={<Plus size={15} />}
                onAction={() => setShowNewModal('receita')}
              />
            ) : (
              <div className="space-y-3">
                {lancamentosList.map(l => (
                  <div key={l.id} className="bg-[var(--bg-surface)] rounded-3xl p-5 border border-[var(--border)]/80  shadow-bento hover:shadow-md transition-all">
                    {/* Linha superior: ícone + descrição + botão ações */}
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-2xl shrink-0 mt-0.5 ${l.tipo === 'entrada' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'}`}>
                        {l.tipo === 'entrada' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-bold text-[var(--text-primary)] truncate leading-tight">{l.descricao}</p>
                        <p className="text-xs font-semibold text-[var(--text-muted)] mt-0.5">
                          {fmtData(l.data)}
                          {l.profissional_nome && <> · <span className="text-[var(--primary)]">{l.profissional_nome}</span></>}
                        </p>
                      </div>

                      {/* Menu Flutuante de Ações (...) */}
                      <div className="relative shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveLancamentoMenuId(activeLancamentoMenuId === l.id ? null : l.id)
                          }}
                          disabled={actionLoadingId === l.id}
                          className={`p-1.5 rounded-lg transition-colors ${
                            activeLancamentoMenuId === l.id
                              ? 'bg-[var(--border)] dark:bg-[var(--border)] text-[var(--text-primary)]'
                              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)]'
                          }`}
                          title="Mais opções"
                        >
                          {actionLoadingId === l.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </button>

                        {activeLancamentoMenuId === l.id && (
                          <>
                            {/* Backdrop invisível para fechar com click-outside */}
                            <div
                              className="fixed inset-0 z-30"
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveLancamentoMenuId(null)
                              }}
                            />
                            <div
                              className="absolute right-0 top-full mt-1.5 w-56 bg-[var(--bg-surface)] rounded-2xl shadow-md border border-[var(--border)]  py-1.5 z-40 animate-in fade-in slide-in-from-top-2 duration-150"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => handleAbrirEdicao(l)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] font-semibold transition-colors"
                              >
                                <Pencil className="h-4 w-4 text-[var(--primary)]" /> Editar Lançamento
                              </button>

                              {l.status !== 'pago' && l.status !== 'recebido' && l.status !== 'concluido' && (
                                <button
                                  onClick={() => handleMarcarComoPago(l)}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-semibold transition-colors"
                                >
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                  {l.tipo === 'entrada' ? 'Marcar como Recebido' : 'Marcar como Pago'}
                                </button>
                              )}

                              <div className="h-px bg-[var(--bg-base)] dark:bg-[var(--border)] my-1" />

                              <button
                                onClick={() => handleExcluirLancamento(l)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold transition-colors"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" /> Excluir
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Linha inferior: categoria + forma (desktop) + status + valor */}
                    <div className="flex flex-wrap items-center gap-2 mt-3 pl-[52px]">
                      <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-base)] dark:bg-[var(--border)] px-2 py-0.5 rounded-md">{l.categoria}</span>

                      <span className="hidden md:flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] px-2.5 py-1 rounded-lg border border-[var(--border)]/50">
                        {formaIcon(l.forma)}
                        {l.forma}
                      </span>

                      <span className={`text-xs uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-lg ${
                        l.status === 'pago' || l.status === 'recebido' || l.status === 'concluido'
                          ? 'bg-green-50 text-green-600 border border-green-200'
                          : l.status === 'vencido'
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : 'bg-amber-50 text-amber-600 border border-amber-200'
                      }`}>
                        {l.status}
                      </span>

                      {/* Valor alinhado à direita com ml-auto */}
                      <span className={`ml-auto text-base font-extrabold ${
                        l.tipo === 'entrada' ? 'text-green-600' : 'text-red-500'
                      }`}>
                        {l.tipo === 'entrada' ? '+' : '-'} {fmt(l.valor)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ ABA: BOLETOS ══════════════════════════ */}
        {activeTab === 'boletos' && (
          <div className="p-8 space-y-6 animate-in fade-in duration-300">

            {/* Resumo Boletos — calculado dinamicamente a partir do estado boletosData */}
            {(() => {
              const abertos = boletosData.filter(b => b.status === 'aberto')
              const vencidos = boletosData.filter(b => b.status === 'vencido')
              const pagos = boletosData.filter(b => b.status === 'pago')
              const totalAberto = abertos.reduce((s, b) => s + b.valor, 0)
              const totalVencido = vencidos.reduce((s, b) => s + b.valor, 0)
              const totalPago = pagos.reduce((s, b) => s + b.valor, 0)
              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[var(--bg-surface)] rounded-2xl p-5 border border-[var(--border)]  shadow-sm">
                    <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Em Aberto</p>
                    <p className="text-2xl font-extrabold text-amber-600">{fmt(totalAberto)}</p>
                    <p className="text-xs font-semibold text-[var(--text-muted)] mt-1">{abertos.length} {abertos.length === 1 ? 'boleto' : 'boletos'}</p>
                  </div>
                  <div className="bg-[var(--bg-surface)] rounded-2xl p-5 border border-[var(--border)]  shadow-sm">
                    <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Vencidos</p>
                    <p className="text-2xl font-extrabold text-red-600">{fmt(totalVencido)}</p>
                    <p className="text-xs font-semibold text-[var(--text-muted)] mt-1">{vencidos.length} {vencidos.length === 1 ? 'boleto' : 'boletos'}</p>
                  </div>
                  <div className="bg-[var(--bg-surface)] rounded-2xl p-5 border border-[var(--border)]  shadow-sm">
                    <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Pagos no Mês</p>
                    <p className="text-2xl font-extrabold text-green-600">{fmt(totalPago)}</p>
                    <p className="text-xs font-semibold text-[var(--text-muted)] mt-1">{pagos.length} {pagos.length === 1 ? 'boleto' : 'boletos'}</p>
                  </div>
                </div>
              )
            })()}

            {/* Barra de seleção em massa */}
            {selectedBoletos.size > 0 && (
              <div className="flex items-center justify-between bg-[var(--primary-subtle)] border border-[var(--primary)]/40 rounded-xl px-4 py-2.5 animate-in fade-in duration-200">
                <span className="text-sm font-bold text-[var(--primary)]">{selectedBoletos.size} boleto(s) selecionado(s)</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      selectedBoletos.forEach(id => handleBoletosAction(id, 'pagar'))
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
                  >
                    <CheckCheck className="h-3.5 w-3.5" /> Marcar como pago
                  </button>
                  <button
                    onClick={() => {
                      selectedBoletos.forEach(id => handleBoletosAction(id, 'excluir'))
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </button>
                </div>
              </div>
            )}

            {/* Cabeçalho com Selecionar Todos — só aparece com boletos */}
            {boletosData.length > 0 && (
            <div className="flex items-center gap-4 px-5 pb-1">
              <button
                onClick={toggleSelectAll}
                className={`h-4.5 w-4.5 flex items-center justify-center rounded border-2 transition-all shrink-0 ${
                  allSelected ? 'bg-[var(--primary-fill)] border-[var(--primary)]/40' :
                  someSelected ? 'bg-[var(--primary-subtle)] border-[var(--primary)]/40' :
                  'border-[var(--border-medium)]  hover:border-[var(--primary)]/40'
                }`}
                title="Selecionar todos"
              >
                {allSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                {someSelected && <Minus className="h-3 w-3 text-[var(--primary)]" strokeWidth={3} />}
              </button>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
              </span>
            </div>
            )}

            {/* Lista de Boletos */}
            <div ref={dropdownRef} className="space-y-3">
              {boletosData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Receipt className="h-12 w-12 text-[var(--text-secondary)] mb-3" />
                  <p className="text-base font-bold text-[var(--text-secondary)]">Nenhum boleto encontrado</p>
                  <p className="text-sm font-medium text-[var(--text-muted)] mt-1">Os boletos gerados aparecerão aqui após integração com o banco emissor.</p>
                </div>
              ) : boletosData.map(b => (
                <div key={b.id} className={`bg-[var(--bg-surface)] rounded-2xl p-5 border shadow-[0_4px_16px_-4px_rgba(0,0,0,0.04)] hover:shadow-md transition-all flex items-center gap-4 ${
                  selectedBoletos.has(b.id) ? 'border-[var(--primary)]/40 ring-1 ring-[var(--primary)]' :
                  b.status === 'vencido' ? 'border-red-200 bg-red-50/30' : 'border-[var(--border)] '
                }`}>

                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelectOne(b.id)}
                    className={`h-4.5 w-4.5 flex items-center justify-center rounded border-2 transition-all shrink-0 ${
                      selectedBoletos.has(b.id) ? 'bg-[var(--primary-fill)] border-[var(--primary)]/40' : 'border-[var(--border-medium)]  hover:border-[var(--primary)]/40'
                    }`}
                  >
                    {selectedBoletos.has(b.id) && <Check className="h-3 w-3 text-[var(--on-primary)]" strokeWidth={3} />}
                  </button>

                  {/* Ícone de status */}
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    b.status === 'pago' ? 'bg-green-50 text-green-600' :
                    b.status === 'vencido' ? 'bg-red-50 text-red-500' :
                    'bg-[var(--primary-subtle)] text-[var(--primary)]'
                  }`}>
                    <Receipt className="h-5 w-5" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-[var(--text-primary)]">{b.paciente}</p>
                    <p className="text-sm font-medium text-[var(--text-muted)] truncate">{b.descricao}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-semibold text-[var(--text-muted)]">Venc: {b.vencimento}</span>
                      <span className="text-xs font-semibold text-[var(--text-muted)]">• {b.banco}</span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span className={`text-xs uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-lg shrink-0 ${
                    b.status === 'pago' ? 'bg-green-50 text-green-600 border border-green-200' :
                    b.status === 'vencido' ? 'bg-red-50 text-red-600 border border-red-200' :
                    'bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/40'
                  }`}>
                    {b.status}
                  </span>

                  {/* Valor */}
                  <span className="text-base font-extrabold text-[var(--text-primary)] w-28 text-right shrink-0">
                    {fmt(b.valor)}
                  </span>

                  {/* Ações */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        const num = '5511999999999'
                        const msg = encodeURIComponent(`Olá ${b.paciente}, segue o boleto de ${fmt(b.valor)} com vencimento em ${b.vencimento}.`)
                        window.open(`https://wa.me/${num}?text=${msg}`, '_blank')
                      }}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Enviar via WhatsApp"
                    >
                      <Smartphone className="h-4 w-4" />
                    </button>

                    {/* Dropdown de ações (...) */}
                    <div className="relative">
                      <button
                        onClick={() => setOpenDropdownId(openDropdownId === b.id ? null : b.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          openDropdownId === b.id ? 'bg-[var(--border)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)]'
                        }`}
                        title="Mais opções"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      {openDropdownId === b.id && (
                        <div className="absolute right-0 top-full mt-1 w-52 bg-[var(--bg-surface)] rounded-2xl shadow-xl border border-[var(--border)]/50 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                          <button
                            onClick={() => handleBoletosAction(b.id, 'copiar')}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] dark:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] font-medium transition-colors"
                          >
                            <Copy className="h-4 w-4 text-[var(--text-muted)]" /> Copiar código de barras
                          </button>
                          <button
                            onClick={() => handleBoletosAction(b.id, 'baixar')}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] dark:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] font-medium transition-colors"
                          >
                            <Download className="h-4 w-4 text-[var(--text-muted)]" /> Baixar boleto
                          </button>
                          {b.status !== 'pago' && (
                            <>
                              <div className="h-px bg-[var(--bg-base)] mx-3 my-1" />
                              <button
                                onClick={() => handleBoletosAction(b.id, 'pagar')}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-green-700 hover:bg-green-50 font-bold transition-colors"
                              >
                                <CheckCircle2 className="h-4 w-4" /> Marcar como pago
                              </button>
                            </>
                          )}
                          <div className="h-px bg-[var(--bg-base)] mx-3 my-1" />
                          <button
                            onClick={() => handleBoletosAction(b.id, 'excluir')}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-bold transition-colors"
                          >
                            <Trash2 className="h-4 w-4" /> Excluir boleto
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ ABA: COMISSÕES ════════════════════════ */}
        {activeTab === 'comissoes' && (
          <div className="p-8 space-y-6 animate-in fade-in duration-300">

            {/* Header Comissões */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-[var(--text-primary)]">Repasse de Comissões — Julho 2026</h3>
                <p className="text-sm font-medium text-[var(--text-muted)]">Gerencie os valores devidos a cada profissional.</p>
              </div>
              <button
                onClick={() => setComissaoModal(true)}
                className="h-10 px-5 rounded-xl font-bold text-sm bg-[var(--bg-surface)] border border-[var(--border)]  text-[var(--text-secondary)] hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] dark:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] transition-colors shadow-sm flex items-center gap-2"
              >
                <Settings className="h-4 w-4" /> Configurar Regras
              </button>
            </div>

            {/* Cards de Profissionais */}
            {profsLoading ? (
              <div className="flex items-center justify-center py-20 gap-3">
                <Loader2 className="h-7 w-7 text-[var(--primary)] animate-spin" />
                <p className="text-sm font-semibold text-[var(--text-muted)]">Carregando dados do Supabase...</p>
              </div>
            ) : profsData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Users className="h-12 w-12 text-[var(--text-secondary)] mb-3" />
                <p className="text-base font-bold text-[var(--text-secondary)]">Nenhum dentista cadastrado</p>
                <p className="text-sm font-medium text-[var(--text-muted)] mt-1">Cadastre profissionais com a função &quot;Dentista&quot; em Configurações → Equipe.</p>
              </div>
            ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {profsData.map(p => (
                <div key={p.id} className="bg-[var(--bg-surface)] rounded-[24px] p-6 border border-[var(--border)]  shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] flex flex-col">
                  
                  {/* Header do Card */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-12 w-12 rounded-full bg-[var(--primary-subtle)] flex items-center justify-center text-[var(--primary)] font-bold text-lg shrink-0">
                      {p.nome.split(' ').filter((_,i) => i === 0 || i === p.nome.split(' ').length - 1).map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-[var(--text-primary)]">{p.nome}</h4>
                      <p className="text-xs font-semibold text-[var(--text-muted)]">{p.especialidade}</p>
                    </div>
                  </div>

                  {/* Métricas */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] rounded-xl p-3 text-center">
                      <p className="text-xs font-bold text-[var(--text-muted)]">Atendimentos</p>
                      <p className="text-xl font-extrabold text-[var(--text-primary)]">{p.atendimentos}</p>
                    </div>
                    <div className="bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] rounded-xl p-3 text-center">
                      <p className="text-xs font-bold text-[var(--text-muted)]">Faturado</p>
                      <p className="text-xl font-extrabold text-[var(--text-primary)]">{fmt(p.faturado)}</p>
                    </div>
                  </div>

                  {/* Extrato */}
                  <div className="bg-[var(--primary-subtle)] rounded-xl p-4 mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-[var(--primary)]">Comissão ({p.comissao}%)</span>
                      <span className="text-lg font-extrabold text-[var(--primary)]">{fmt(p.repasse)}</span>
                    </div>
                    <div className="w-full bg-[var(--border)] rounded-full h-2">
                      <div className="bg-[var(--primary-fill)] h-2 rounded-full transition-all duration-500" style={{ width: `${p.comissao}%` }}></div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="mt-auto flex gap-2">
                    {p.status === 'pendente' ? (
                      <button 
                        onClick={() => handleQuitar(p.id)}
                        disabled={quittingId === p.id}
                        className="flex-1 py-2.5 bg-[var(--primary-fill)] text-[var(--on-primary)] rounded-xl font-bold text-sm hover:bg-[var(--primary-fill-hover)] transition-colors disabled:bg-[var(--border-medium)] disabled:text-[var(--text-primary)] flex items-center justify-center gap-2"
                      >
                        {quittingId === p.id ? (
                          <>
                            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block"></span>
                            Processando...
                          </>
                        ) : 'Quitar Período'}
                      </button>
                    ) : (
                      <button className="flex-1 py-2.5 bg-green-50 text-green-700 rounded-xl font-bold text-sm border border-green-200 cursor-default flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-4 w-4" /> Pago
                      </button>
                    )}
                    <button 
                      onClick={() => handleOpenExtrato(p.id)}
                      className="px-3 py-2.5 bg-[var(--bg-base)] text-[var(--text-secondary)] rounded-xl font-bold text-sm hover:bg-[var(--border)] transition-colors"
                      title="Ver Extrato Detalhado"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ MODAL: NOVA RECEITA / DESPESA ══════════ */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowNewModal(null)}></div>
          <div className="relative bg-[var(--bg-surface)] rounded-[24px] p-8 w-full max-w-lg shadow-md border border-[var(--border)]  animate-in zoom-in-95 fade-in duration-200">
            <h2 className="text-xl font-extrabold text-[var(--text-primary)] mb-6">
              {showNewModal === 'receita' ? '+ Nova Receita' : '+ Nova Despesa'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[var(--text-secondary)] mb-1.5">Descrição *</label>
                <input
                  type="text"
                  placeholder="Ex: Consulta odontológica"
                  value={novoDescricao}
                  onChange={e => setNovoDescricao(e.target.value)}
                  className="w-full bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] border border-[var(--border)]  rounded-xl px-4 py-3 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]/40 focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-[var(--text-secondary)] mb-1.5">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={novoValor}
                    onChange={e => setNovoValor(e.target.value)}
                    className="w-full bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] border border-[var(--border)]  rounded-xl px-4 py-3 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]/40 focus:ring-2 focus:ring-[var(--primary)]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--text-secondary)] mb-1.5">Data *</label>
                  <input
                    type="date"
                    value={novoData}
                    onChange={e => setNovoData(e.target.value)}
                    className="w-full bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] border border-[var(--border)]  rounded-xl px-4 py-3 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]/40 focus:ring-2 focus:ring-[var(--primary)]/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-[var(--text-secondary)] mb-1.5">Categoria</label>
                  <select
                    value={novoCategoria}
                    onChange={e => setNovoCategoria(e.target.value)}
                    className="w-full bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] border border-[var(--border)]  rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-secondary)] focus:outline-none focus:border-[var(--primary)]/40"
                  >
                    <option>Procedimento</option>
                    <option>Consulta</option>
                    <option>Estético</option>
                    <option>Cirúrgico</option>
                    <option>Despesa Fixa</option>
                    <option>Insumos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--text-secondary)] mb-1.5">Forma de Pagamento</label>
                  <select
                    value={novoForma}
                    onChange={e => setNovoForma(e.target.value)}
                    className="w-full bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] border border-[var(--border)]  rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-secondary)] focus:outline-none focus:border-[var(--primary)]/40"
                  >
                    <option>Pix</option>
                    <option>Cartão Crédito</option>
                    <option>Cartão Débito</option>
                    <option>Dinheiro</option>
                    <option>Boleto</option>
                  </select>
                </div>
              </div>
              {showNewModal === 'receita' && (
                <div>
                  <label className="block text-sm font-bold text-[var(--text-secondary)] mb-1.5">Paciente (opcional)</label>
                  <input
                    type="text"
                    placeholder="Buscar paciente..."
                    value={novoPaciente}
                    onChange={e => setNovoPaciente(e.target.value)}
                    className="w-full bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] border border-[var(--border)]  rounded-xl px-4 py-3 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]/40 focus:ring-2 focus:ring-[var(--primary)]/20"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowNewModal(null)}
                disabled={modalSaving}
                className="flex-1 py-3 bg-[var(--bg-base)] text-[var(--text-secondary)] rounded-xl font-bold text-sm hover:bg-[var(--border)] transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarLancamento}
                disabled={modalSaving}
                className="flex-1 py-3 bg-[var(--primary-fill)] text-[var(--on-primary)] rounded-xl font-bold text-sm hover:bg-[var(--primary-fill-hover)] transition-colors shadow-[0_4px_12px_rgba(37,99,235,0.2)] flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {modalSaving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
                ) : 'Salvar Lançamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: EDITAR LANÇAMENTO ═══════════════ */}
      {editingLancamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditingLancamento(null)}></div>
          <div className="relative bg-[var(--bg-surface)] rounded-[24px] p-6 sm:p-8 w-full max-w-lg shadow-md border border-[var(--border)]  animate-in zoom-in-95 fade-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${editingLancamento.tipo === 'entrada' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                  {editingLancamento.tipo === 'entrada' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-[var(--text-primary)]">
                    Editar {editingLancamento.tipo === 'entrada' ? 'Receita' : 'Despesa'}
                  </h2>
                  <p className="text-xs font-semibold text-[var(--text-muted)]">Origem: {editingLancamento.origem}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingLancamento(null)}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Descrição *</label>
                <input
                  type="text"
                  value={editDescricao}
                  onChange={e => setEditDescricao(e.target.value)}
                  className="w-full bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] border border-[var(--border)]  rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editValor}
                    onChange={e => setEditValor(e.target.value)}
                    className="w-full bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] border border-[var(--border)]  rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Data *</label>
                  <input
                    type="date"
                    value={editData}
                    onChange={e => setEditData(e.target.value)}
                    className="w-full bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] border border-[var(--border)]  rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]/40 [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Categoria</label>
                  <input
                    type="text"
                    value={editCategoria}
                    onChange={e => setEditCategoria(e.target.value)}
                    className="w-full bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] border border-[var(--border)]  rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Forma de Pagamento</label>
                  <select
                    value={editForma}
                    onChange={e => setEditForma(e.target.value)}
                    className="w-full bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] border border-[var(--border)]  rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]/40"
                  >
                    <option value="Pix">Pix</option>
                    <option value="Cartão Crédito">Cartão Crédito</option>
                    <option value="Cartão Débito">Cartão Débito</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Transferência">Transferência</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  className="w-full bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] border border-[var(--border)]  rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]/40"
                >
                  <option value="pago">Pago / Recebido / Concluído</option>
                  <option value="pendente">Pendente</option>
                  <option value="vencido">Vencido</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setEditingLancamento(null)}
                disabled={editSaving}
                className="flex-1 py-3 bg-[var(--bg-base)] dark:bg-[var(--border)] text-[var(--text-secondary)] rounded-xl font-bold text-sm hover:bg-[var(--border)] dark:hover:bg-[var(--border-medium)] transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarEdicao}
                disabled={editSaving}
                className="flex-1 py-3 bg-[var(--primary-fill)] text-[var(--on-primary)] rounded-xl font-bold text-sm hover:bg-[var(--primary-fill-hover)] transition-colors shadow-[0_4px_12px_rgba(37,99,235,0.2)] flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {editSaving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
                ) : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: CONFIGURAR COMISSÃO ═════════════ */}
      {comissaoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setComissaoModal(false)}></div>
          <div className="relative bg-[var(--bg-surface)] rounded-[24px] p-8 w-full max-w-md shadow-md border border-[var(--border)]  animate-in zoom-in-95 fade-in duration-200">
            <h2 className="text-xl font-extrabold text-[var(--text-primary)] mb-2">Configurar Regras de Comissão</h2>
            <p className="text-sm font-medium text-[var(--text-muted)] mb-6">Defina o percentual de repasse para cada profissional.</p>

            <div className="space-y-4">
              {profissionaisList.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] text-center py-4">Nenhum profissional cadastrado ainda.</p>
              ) : profissionaisList.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border)] ">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-[var(--primary-subtle)] flex items-center justify-center text-[var(--primary)] font-bold text-xs shrink-0">
                      {p.nome.split(' ')[0][0]}{p.nome.split(' ').pop()?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">{p.nome}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      defaultValue={30}
                      className="w-16 bg-[var(--bg-surface)] border border-[var(--border)]  rounded-lg px-2 py-1.5 text-sm font-bold text-center text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]/40"
                    />
                    <span className="text-sm font-bold text-[var(--text-muted)]">%</span>
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-3 p-3 bg-[var(--primary-subtle)] rounded-xl border border-[var(--primary)]/40">
                <input type="radio" name="base" defaultChecked className="accent-[var(--primary)]" />
                <span className="text-sm font-bold text-[var(--text-secondary)]">Sobre Valor Bruto</span>
                <input type="radio" name="base" className="accent-[var(--primary)] ml-4" />
                <span className="text-sm font-bold text-[var(--text-secondary)]">Sobre Valor Líquido</span>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setComissaoModal(false)} className="flex-1 py-3 bg-[var(--bg-base)] text-[var(--text-secondary)] rounded-xl font-bold text-sm hover:bg-[var(--border)] transition-colors">
                Cancelar
              </button>
              <button onClick={() => setComissaoModal(false)} className="flex-1 py-3 bg-[var(--primary-fill)] text-[var(--on-primary)] rounded-xl font-bold text-sm hover:bg-[var(--primary-fill-hover)] transition-colors">
                Salvar Regras
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: EXTRATO DO PROFISSIONAL ══════════ */}
      {extratoModal !== null && (() => {
        const p = profsData.find(prof => prof.id === extratoModal)
        if (!p) return null
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30" onClick={() => setExtratoModal(null)}></div>
            <div className="relative bg-[var(--bg-surface)] rounded-[24px] w-full max-w-2xl shadow-md border border-[var(--border)]  animate-in zoom-in-95 fade-in duration-200 flex flex-col max-h-[85vh]">
              <div className="p-6 border-b border-[var(--border)]  flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl font-extrabold text-[var(--text-primary)]">Extrato de Comissões</h2>
                  <p className="text-sm font-medium text-[var(--text-muted)]">{p.nome} • {p.especialidade} • Últimos 30 dias</p>
                </div>
                <button onClick={() => setExtratoModal(null)} className="p-2 text-[var(--text-muted)] hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] rounded-xl transition-colors">
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                {extratoLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="h-8 w-8 text-[var(--primary)] animate-spin" />
                    <p className="text-sm font-semibold text-[var(--text-muted)]">Buscando dados do Supabase...</p>
                  </div>
                ) : extratoData && extratoData.procedimentos.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] border border-[var(--border)]  rounded-xl p-4">
                        <p className="text-xs font-bold text-[var(--text-muted)] uppercase">Total Faturado</p>
                        <p className="text-xl font-extrabold text-[var(--text-primary)]">{fmt(extratoData.totalFaturado)}</p>
                      </div>
                      <div className="bg-[var(--primary-subtle)] border border-[var(--primary)]/40 rounded-xl p-4">
                        <p className="text-xs font-bold text-[var(--primary)] uppercase">Total de Comissões</p>
                        <p className="text-xl font-extrabold text-[var(--primary)]">{fmt(extratoData.totalComissoes)}</p>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 uppercase tracking-wide">Procedimentos Realizados</h3>
                    <div className="space-y-3">
                      {extratoData.procedimentos.map(item => (
                        <div key={item.id} className="flex justify-between items-center bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] border border-[var(--border)]/50 p-4 rounded-xl">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-[var(--text-primary)] text-sm truncate">{item.procedimento_nome}</p>
                            <p className="text-xs font-medium text-[var(--text-muted)]">
                              {item.paciente_nome} • {new Date(item.data_realizacao).toLocaleDateString('pt-BR')} • Base: {fmt(item.valor_cobrado)}
                            </p>
                          </div>
                          <p className="font-extrabold text-[var(--primary)] text-sm shrink-0 ml-4">+{fmt(item.comissao_gerada)}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Receipt className="h-12 w-12 text-[var(--text-secondary)] mb-3" />
                    <p className="text-base font-bold text-[var(--text-secondary)]">Nenhum procedimento encontrado</p>
                    <p className="text-sm font-medium text-[var(--text-muted)] mt-1">Nenhum registro nos últimos 30 dias para este profissional.</p>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-[var(--border)]  shrink-0">
                <button 
                  onClick={() => setExtratoModal(null)} 
                  className="w-full py-3 bg-[var(--bg-base)] text-[var(--text-secondary)] rounded-xl font-bold text-sm hover:bg-[var(--border)] transition-colors"
                >
                  Fechar Extrato
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}