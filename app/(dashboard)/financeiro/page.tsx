'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../components/RequireAuth'
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, CreditCard,
  Plus, ArrowUpRight, ArrowDownRight, Search, Filter, Download,
  Send, FileText, Settings, Users, CheckCircle2, Clock, XCircle,
  BarChart3, Wallet, Receipt, Percent, ChevronDown, MoreHorizontal,
  Banknote, QrCode, Smartphone, Copy, Trash2, CheckCheck, Check, Minus, Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { fetchExtratoComissoes, ExtratoComissoes, fetchDentistasComComissoes, DentistaComissao } from '@/app/actions/performance'

// ─── Tipos ────────────────────────────────────────────────
type TabId = 'painel' | 'fluxo' | 'boletos' | 'comissoes'

// ─── Dados Mock ───────────────────────────────────────────
const kpis = [
  { label: 'Faturamento Total', value: 'R$ 48.750,00', change: '+12%', trend: 'up', icon: DollarSign, color: 'blue' },
  { label: 'Total Recebido', value: 'R$ 39.200,00', change: '+8%', trend: 'up', icon: TrendingUp, color: 'green' },
  { label: 'A Receber', value: 'R$ 9.550,00', change: '15 títulos', trend: 'neutral', icon: Clock, color: 'amber' },
  { label: 'Inadimplência', value: 'R$ 3.180,00', change: '6,5%', trend: 'down', icon: AlertTriangle, color: 'red' },
  { label: 'Despesas do Mês', value: 'R$ 12.430,00', change: '-3%', trend: 'down', icon: TrendingDown, color: 'purple' },
]

const lancamentos = [
  { id: 1, data: '29/07/2026', descricao: 'Limpeza - João Silva', categoria: 'Procedimento', forma: 'Pix', valor: 350, tipo: 'entrada', status: 'pago' },
  { id: 2, data: '29/07/2026', descricao: 'Aluguel do consultório', categoria: 'Despesa Fixa', forma: 'Boleto', valor: 4500, tipo: 'saida', status: 'pago' },
  { id: 3, data: '28/07/2026', descricao: 'Clareamento - Maria Fernanda', categoria: 'Estético', forma: 'Cartão Crédito', valor: 1200, tipo: 'entrada', status: 'pago' },
  { id: 4, data: '28/07/2026', descricao: 'Restauração - Roberto Almeida', categoria: 'Procedimento', forma: 'Dinheiro', valor: 480, tipo: 'entrada', status: 'pendente' },
  { id: 5, data: '27/07/2026', descricao: 'Material Odontológico (Resina)', categoria: 'Insumos', forma: 'Cartão Crédito', valor: 890, tipo: 'saida', status: 'pago' },
  { id: 6, data: '26/07/2026', descricao: 'Implante - Ana Paula', categoria: 'Cirúrgico', forma: 'Pix', valor: 3500, tipo: 'entrada', status: 'pendente' },
  { id: 7, data: '25/07/2026', descricao: 'Energia Elétrica', categoria: 'Despesa Fixa', forma: 'Débito Automático', valor: 620, tipo: 'saida', status: 'pago' },
  { id: 8, data: '25/07/2026', descricao: 'Ortodontia (Mensalidade) - Carlos', categoria: 'Procedimento', forma: 'Boleto', valor: 450, tipo: 'entrada', status: 'pago' },
]

const boletos = [
  { id: 1, paciente: 'Roberto Almeida', descricao: 'Restauração Classe II', valor: 480, vencimento: '05/08/2026', status: 'aberto', banco: 'Banco Inter' },
  { id: 2, paciente: 'Ana Paula Souza', descricao: 'Implante - Parcela 2/6', valor: 1200, vencimento: '10/08/2026', status: 'aberto', banco: 'Itaú' },
  { id: 3, paciente: 'Carlos Eduardo', descricao: 'Ortodontia - Mensalidade Ago', valor: 450, vencimento: '01/08/2026', status: 'aberto', banco: 'Banco Inter' },
  { id: 4, paciente: 'Fernanda Lima', descricao: 'Lente de Contato (4 un)', valor: 6800, vencimento: '20/07/2026', status: 'vencido', banco: 'Itaú' },
  { id: 5, paciente: 'João Silva', descricao: 'Limpeza Periodontal', valor: 350, vencimento: '15/07/2026', status: 'pago', banco: 'Banco Inter' },
]

const profissionais = [
  { id: 1, nome: 'Dra. Camila Ribeiro', especialidade: 'Ortodontia', atendimentos: 42, faturado: 18500, comissao: 40, repasse: 7400, status: 'pendente' },
  { id: 2, nome: 'Dr. João Pedro', especialidade: 'Implantodontia', atendimentos: 28, faturado: 32000, comissao: 50, repasse: 16000, status: 'pendente' },
  { id: 3, nome: 'Dra. Mariana Costa', especialidade: 'Endodontia', atendimentos: 35, faturado: 14200, comissao: 35, repasse: 4970, status: 'pago' },
]

// ─── Helpers ──────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const formaIcon = (forma: string) => {
  if (forma.toLowerCase().includes('pix')) return <QrCode className="h-3.5 w-3.5" />
  if (forma.toLowerCase().includes('cartão') || forma.toLowerCase().includes('crédito') || forma.toLowerCase().includes('débito')) return <CreditCard className="h-3.5 w-3.5" />
  if (forma.toLowerCase().includes('dinheiro')) return <Banknote className="h-3.5 w-3.5" />
  if (forma.toLowerCase().includes('boleto')) return <Receipt className="h-3.5 w-3.5" />
  return <Wallet className="h-3.5 w-3.5" />
}

// ─── Gráfico de Barras Simples (CSS) ──────────────────────
const chartData = [
  { mes: 'Fev', entradas: 32, saidas: 18 },
  { mes: 'Mar', entradas: 45, saidas: 22 },
  { mes: 'Abr', entradas: 38, saidas: 25 },
  { mes: 'Mai', entradas: 52, saidas: 20 },
  { mes: 'Jun', entradas: 48, saidas: 28 },
  { mes: 'Jul', entradas: 58, saidas: 24 },
]

// ═══════════════════════════════════════════════════════════
// ─── COMPONENTE PRINCIPAL ─────────────────────────────────
// ═══════════════════════════════════════════════════════════
export default function FinanceiroPage() {
  const [activeTab, setActiveTab] = useState<TabId>('painel')
  const [showNewModal, setShowNewModal] = useState<'receita' | 'despesa' | null>(null)
  const [comissaoModal, setComissaoModal] = useState(false)

  // ── Estado da aba de Boletos ─────────────────────────────
  const [boletosData, setBoletosData] = useState(boletos)
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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900">

      {/* ── PAGE HEADER ──────────────────────────────── */}
      <div className="px-8 pt-6 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Financeiro</h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">Gestão financeira completa da sua clínica</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowNewModal('receita')}
              className="h-10 px-5 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-[0_4px_12px_rgba(37,99,235,0.2)] flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Nova Receita
            </button>
            <button
              onClick={() => setShowNewModal('despesa')}
              className="h-10 px-5 rounded-xl font-bold text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-950 dark:hover:bg-slate-700 transition-colors shadow-sm flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Nova Despesa
            </button>
          </div>
        </div>

        {/* ── TABS ────────────────────────────────────── */}
        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all -mb-px ${
                  isActive
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:bg-slate-800/50 rounded-t-lg'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:border-slate-700'
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
          <div className="p-8 space-y-8 animate-in fade-in duration-300">

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {kpis.map((kpi, i) => {
                const Icon = kpi.icon
                const colorMap: Record<string, string> = {
                  blue: 'bg-blue-50 text-blue-600',
                  green: 'bg-green-50 text-green-600',
                  amber: 'bg-amber-50 text-amber-600',
                  red: 'bg-red-50 text-red-600',
                  purple: 'bg-purple-50 text-purple-600',
                }
                return (
                  <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2.5 rounded-xl ${colorMap[kpi.color]}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                        kpi.trend === 'up' ? 'bg-green-50 text-green-600' :
                        kpi.trend === 'down' ? 'bg-red-50 text-red-600' :
                        'bg-slate-100 text-slate-500 dark:text-slate-400'
                      }`}>
                        {kpi.change}
                      </span>
                    </div>
                    <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">{kpi.value}</p>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">{kpi.label}</p>
                  </div>
                )
              })}
            </div>

            {/* Gráfico de Fluxo de Caixa */}
            <div className="bg-white dark:bg-slate-800 rounded-[24px] p-6 border border-slate-200 dark:border-slate-700 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">Fluxo de Caixa</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Entradas vs. Saídas (últimos 6 meses)</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold">
                  <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full bg-blue-500"></div> Entradas</div>
                  <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full bg-red-400"></div> Saídas</div>
                </div>
              </div>
              <div className="flex items-end gap-4 h-56">
                {chartData.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex gap-1 items-end justify-center h-48">
                      <div
                        className="w-5 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all duration-500 hover:from-blue-600 hover:to-blue-500"
                        style={{ height: `${(d.entradas / 60) * 100}%` }}
                        title={`Entradas: R$ ${d.entradas}k`}
                      ></div>
                      <div
                        className="w-5 bg-gradient-to-t from-red-400 to-red-300 rounded-t-lg transition-all duration-500 hover:from-red-500 hover:to-red-400"
                        style={{ height: `${(d.saidas / 60) * 100}%` }}
                        title={`Saídas: R$ ${d.saidas}k`}
                      ></div>
                    </div>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{d.mes}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Últimos Lançamentos (resumo) */}
            <div className="bg-white dark:bg-slate-800 rounded-[24px] p-6 border border-slate-200 dark:border-slate-700 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">Últimos Lançamentos</h3>
                <button onClick={() => setActiveTab('fluxo')} className="text-sm font-bold text-blue-600 hover:text-blue-700">
                  Ver todos →
                </button>
              </div>
              <div className="space-y-3">
                {lancamentos.slice(0, 4).map(l => (
                  <div key={l.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${l.tipo === 'entrada' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                        {l.tipo === 'entrada' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{l.descricao}</p>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{l.data} · {l.categoria}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-extrabold ${l.tipo === 'entrada' ? 'text-green-600' : 'text-red-500'}`}>
                      {l.tipo === 'entrada' ? '+' : '-'} {fmt(l.valor)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ ABA: FLUXO DE CAIXA ═══════════════════ */}
        {activeTab === 'fluxo' && (
          <div className="p-8 space-y-6 animate-in fade-in duration-300">

            {/* Filtros */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 flex-1 min-w-[200px] max-w-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                <Search className="h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Buscar lançamento ou paciente..." className="bg-transparent border-none outline-none text-sm w-full text-slate-800 dark:text-slate-100 placeholder-slate-500 font-medium" />
              </div>
              <select className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500">
                <option>Este Mês</option>
                <option>Mês Passado</option>
                <option>Últimos 90 dias</option>
                <option>Personalizado</option>
              </select>
              <select className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500">
                <option>Todos os Status</option>
                <option>Pago</option>
                <option>Pendente</option>
              </select>
              <select className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500">
                <option>Todos os Profissionais</option>
                <option>Dra. Camila</option>
                <option>Dr. João</option>
              </select>
              <button className="ml-auto h-9 px-4 rounded-xl text-sm font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-950 dark:hover:bg-slate-700 flex items-center gap-2 shadow-sm">
                <Download className="h-4 w-4" /> Exportar
              </button>
            </div>

            {/* Lista de Lançamentos em Cards */}
            <div className="space-y-3">
              {lancamentos.map(l => (
                <div key={l.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.04)] hover:shadow-md transition-all flex items-center gap-4">
                  {/* Ícone Tipo */}
                  <div className={`p-2.5 rounded-xl shrink-0 ${l.tipo === 'entrada' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                    {l.tipo === 'entrada' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                  </div>

                  {/* Info Principal */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-slate-800 dark:text-slate-100 truncate">{l.descricao}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{l.data}</span>
                      <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{l.categoria}</span>
                    </div>
                  </div>

                  {/* Forma de Pagamento */}
                  <div className="hidden md:flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700/50 shrink-0">
                    {formaIcon(l.forma)}
                    {l.forma}
                  </div>

                  {/* Status */}
                  <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-lg shrink-0 ${
                    l.status === 'pago' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-amber-50 text-amber-600 border border-amber-200'
                  }`}>
                    {l.status}
                  </span>

                  {/* Valor */}
                  <span className={`text-base font-extrabold shrink-0 w-32 text-right ${l.tipo === 'entrada' ? 'text-green-600' : 'text-red-500'}`}>
                    {l.tipo === 'entrada' ? '+' : '-'} {fmt(l.valor)}
                  </span>

                  {/* Ações */}
                  <button className="p-1.5 text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ ABA: BOLETOS ══════════════════════════ */}
        {activeTab === 'boletos' && (
          <div className="p-8 space-y-6 animate-in fade-in duration-300">

            {/* Resumo Boletos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Em Aberto</p>
                <p className="text-2xl font-extrabold text-amber-600">R$ 2.130,00</p>
                <p className="text-xs font-semibold text-slate-400 mt-1">3 boletos</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Vencidos</p>
                <p className="text-2xl font-extrabold text-red-600">R$ 6.800,00</p>
                <p className="text-xs font-semibold text-slate-400 mt-1">1 boleto</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Pagos no Mês</p>
                <p className="text-2xl font-extrabold text-green-600">R$ 350,00</p>
                <p className="text-xs font-semibold text-slate-400 mt-1">1 boleto</p>
              </div>
            </div>

            {/* Barra de seleção em massa */}
            {selectedBoletos.size > 0 && (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 animate-in fade-in duration-200">
                <span className="text-sm font-bold text-blue-700">{selectedBoletos.size} boleto(s) selecionado(s)</span>
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

            {/* Cabeçalho com Selecionar Todos */}
            <div className="flex items-center gap-4 px-5 pb-1">
              <button
                onClick={toggleSelectAll}
                className={`h-4.5 w-4.5 flex items-center justify-center rounded border-2 transition-all shrink-0 ${
                  allSelected ? 'bg-blue-600 border-blue-600' :
                  someSelected ? 'bg-blue-100 border-blue-400' :
                  'border-slate-300 dark:border-slate-700 hover:border-blue-400'
                }`}
                title="Selecionar todos"
              >
                {allSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                {someSelected && <Minus className="h-3 w-3 text-blue-600" strokeWidth={3} />}
              </button>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
              </span>
            </div>

            {/* Lista de Boletos */}
            <div ref={dropdownRef} className="space-y-3">
              {boletosData.map(b => (
                <div key={b.id} className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border shadow-[0_4px_16px_-4px_rgba(0,0,0,0.04)] hover:shadow-md transition-all flex items-center gap-4 ${
                  selectedBoletos.has(b.id) ? 'border-blue-300 ring-1 ring-blue-200' :
                  b.status === 'vencido' ? 'border-red-200 bg-red-50/30' : 'border-slate-200 dark:border-slate-700'
                }`}>

                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelectOne(b.id)}
                    className={`h-4.5 w-4.5 flex items-center justify-center rounded border-2 transition-all shrink-0 ${
                      selectedBoletos.has(b.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-700 hover:border-blue-400'
                    }`}
                  >
                    {selectedBoletos.has(b.id) && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                  </button>

                  {/* Ícone de status */}
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    b.status === 'pago' ? 'bg-green-50 text-green-600' :
                    b.status === 'vencido' ? 'bg-red-50 text-red-500' :
                    'bg-blue-50 text-blue-600'
                  }`}>
                    <Receipt className="h-5 w-5" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-slate-800 dark:text-slate-100">{b.paciente}</p>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">{b.descricao}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-semibold text-slate-400">Venc: {b.vencimento}</span>
                      <span className="text-xs font-semibold text-slate-400">• {b.banco}</span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-lg shrink-0 ${
                    b.status === 'pago' ? 'bg-green-50 text-green-600 border border-green-200' :
                    b.status === 'vencido' ? 'bg-red-50 text-red-600 border border-red-200' :
                    'bg-blue-50 text-blue-600 border border-blue-200'
                  }`}>
                    {b.status}
                  </span>

                  {/* Valor */}
                  <span className="text-base font-extrabold text-slate-800 dark:text-slate-100 w-28 text-right shrink-0">
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
                          openDropdownId === b.id ? 'bg-slate-200 text-slate-800 dark:text-slate-100' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                        title="Mais opções"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      {openDropdownId === b.id && (
                        <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700/50 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                          <button
                            onClick={() => handleBoletosAction(b.id, 'copiar')}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-950 dark:hover:bg-slate-700 font-medium transition-colors"
                          >
                            <Copy className="h-4 w-4 text-slate-400" /> Copiar código de barras
                          </button>
                          <button
                            onClick={() => handleBoletosAction(b.id, 'baixar')}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-950 dark:hover:bg-slate-700 font-medium transition-colors"
                          >
                            <Download className="h-4 w-4 text-slate-400" /> Baixar boleto
                          </button>
                          {b.status !== 'pago' && (
                            <>
                              <div className="h-px bg-slate-100 mx-3 my-1" />
                              <button
                                onClick={() => handleBoletosAction(b.id, 'pagar')}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-green-700 hover:bg-green-50 font-bold transition-colors"
                              >
                                <CheckCircle2 className="h-4 w-4" /> Marcar como pago
                              </button>
                            </>
                          )}
                          <div className="h-px bg-slate-100 mx-3 my-1" />
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
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">Repasse de Comissões — Julho 2026</h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Gerencie os valores devidos a cada profissional.</p>
              </div>
              <button
                onClick={() => setComissaoModal(true)}
                className="h-10 px-5 rounded-xl font-bold text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-950 dark:hover:bg-slate-700 transition-colors shadow-sm flex items-center gap-2"
              >
                <Settings className="h-4 w-4" /> Configurar Regras
              </button>
            </div>

            {/* Cards de Profissionais */}
            {profsLoading ? (
              <div className="flex items-center justify-center py-20 gap-3">
                <Loader2 className="h-7 w-7 text-blue-500 animate-spin" />
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Carregando dados do Supabase...</p>
              </div>
            ) : profsData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Users className="h-12 w-12 text-slate-300 mb-3" />
                <p className="text-base font-bold text-slate-600 dark:text-slate-300">Nenhum dentista cadastrado</p>
                <p className="text-sm font-medium text-slate-400 mt-1">Cadastre profissionais com a função "Dentista" em Configurações → Equipe.</p>
              </div>
            ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {profsData.map(p => (
                <div key={p.id} className="bg-white dark:bg-slate-800 rounded-[24px] p-6 border border-slate-200 dark:border-slate-700 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] flex flex-col">
                  
                  {/* Header do Card */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg shrink-0">
                      {p.nome.split(' ').filter((_,i) => i === 0 || i === p.nome.split(' ').length - 1).map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">{p.nome}</h4>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{p.especialidade}</p>
                    </div>
                  </div>

                  {/* Métricas */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 text-center">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Atendimentos</p>
                      <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{p.atendimentos}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 text-center">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Faturado</p>
                      <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{fmt(p.faturado)}</p>
                    </div>
                  </div>

                  {/* Extrato */}
                  <div className="bg-blue-50 rounded-xl p-4 mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-blue-700">Comissão ({p.comissao}%)</span>
                      <span className="text-lg font-extrabold text-blue-700">{fmt(p.repasse)}</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${p.comissao}%` }}></div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="mt-auto flex gap-2">
                    {p.status === 'pendente' ? (
                      <button 
                        onClick={() => handleQuitar(p.id)}
                        disabled={quittingId === p.id}
                        className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-[0_4px_12px_rgba(37,99,235,0.2)] disabled:opacity-70 flex items-center justify-center gap-2"
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
                      className="px-3 py-2.5 bg-slate-100 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
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
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowNewModal(null)}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-[24px] p-8 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 fade-in duration-200">
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-6">
              {showNewModal === 'receita' ? '+ Nova Receita' : '+ Nova Despesa'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">Descrição</label>
                <input type="text" placeholder="Ex: Consulta odontológica" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">Valor (R$)</label>
                  <input type="number" step="0.01" placeholder="0,00" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">Data</label>
                  <input type="date" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">Categoria</label>
                  <select className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500">
                    <option>Procedimento</option>
                    <option>Consulta</option>
                    <option>Estético</option>
                    <option>Cirúrgico</option>
                    <option>Despesa Fixa</option>
                    <option>Insumos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">Forma de Pagamento</label>
                  <select className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500">
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
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">Paciente (opcional)</label>
                  <input type="text" placeholder="Buscar paciente..." className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowNewModal(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">
                Cancelar
              </button>
              <button className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-[0_4px_12px_rgba(37,99,235,0.2)]">
                Salvar Lançamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: CONFIGURAR COMISSÃO ═════════════ */}
      {comissaoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setComissaoModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-[24px] p-8 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 fade-in duration-200">
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-2">Configurar Regras de Comissão</h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">Defina o percentual de repasse para cada profissional.</p>

            <div className="space-y-4">
              {profissionais.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                      {p.nome.split(' ')[0][0]}{p.nome.split(' ').pop()?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{p.nome}</p>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{p.especialidade}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      defaultValue={p.comissao}
                      className="w-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm font-bold text-center text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400">%</span>
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                <input type="radio" name="base" defaultChecked className="accent-blue-600" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Sobre Valor Bruto</span>
                <input type="radio" name="base" className="accent-blue-600 ml-4" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Sobre Valor Líquido</span>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setComissaoModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">
                Cancelar
              </button>
              <button onClick={() => setComissaoModal(false)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-[0_4px_12px_rgba(37,99,235,0.2)]">
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
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setExtratoModal(null)}></div>
            <div className="relative bg-white dark:bg-slate-800 rounded-[24px] w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 fade-in duration-200 flex flex-col max-h-[85vh]">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Extrato de Comissões</h2>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{p.nome} • {p.especialidade} • Últimos 30 dias</p>
                </div>
                <button onClick={() => setExtratoModal(null)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                {extratoLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Buscando dados do Supabase...</p>
                  </div>
                ) : extratoData && extratoData.procedimentos.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Total Faturado</p>
                        <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{fmt(extratoData.totalFaturado)}</p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <p className="text-xs font-bold text-blue-600 uppercase">Total de Comissões</p>
                        <p className="text-xl font-extrabold text-blue-700">{fmt(extratoData.totalComissoes)}</p>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 uppercase tracking-wide">Procedimentos Realizados</h3>
                    <div className="space-y-3">
                      {extratoData.procedimentos.map(item => (
                        <div key={item.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700/50 p-4 rounded-xl">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{item.procedimento_nome}</p>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              {item.paciente_nome} • {new Date(item.data_realizacao).toLocaleDateString('pt-BR')} • Base: {fmt(item.valor_cobrado)}
                            </p>
                          </div>
                          <p className="font-extrabold text-blue-600 text-sm shrink-0 ml-4">+{fmt(item.comissao_gerada)}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Receipt className="h-12 w-12 text-slate-300 mb-3" />
                    <p className="text-base font-bold text-slate-600 dark:text-slate-300">Nenhum procedimento encontrado</p>
                    <p className="text-sm font-medium text-slate-400 mt-1">Nenhum registro nos últimos 30 dias para este profissional.</p>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-700 shrink-0">
                <button 
                  onClick={() => setExtratoModal(null)} 
                  className="w-full py-3 bg-slate-100 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
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