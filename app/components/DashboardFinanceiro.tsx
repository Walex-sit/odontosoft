'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import { TrendingUp, TrendingDown, Wallet, RefreshCw, AlertCircle } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface FluxoCaixaRow {
  total_receitas: number
  total_despesas: number
  saldo_liquido: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const brl = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

// ─── Sub-components ──────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string
  value: number
  icon: React.ElementType
  colorScheme: 'green' | 'red' | 'dynamic'
  /** Usado apenas quando colorScheme === 'dynamic' */
  dynamicValue?: number
  loading?: boolean
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  colorScheme,
  dynamicValue,
  loading = false,
}: SummaryCardProps) {
  const isPositive = colorScheme === 'dynamic' ? (dynamicValue ?? value) >= 0 : true

  const colors = {
    green: {
      icon: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      value: 'text-emerald-400',
    },
    red: {
      icon: 'bg-red-500/10 text-red-400 border-red-500/20',
      value: 'text-red-400',
    },
    dynamic: {
      icon: isPositive
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        : 'bg-red-500/10 text-red-400 border-red-500/20',
      value: isPositive ? 'text-emerald-400' : 'text-red-400',
    },
  }

  const c = colors[colorScheme]

  return (
    <div className="bg-slate-800 border border-slate-700/50 p-4 sm:p-6 rounded-xl sm:rounded-2xl flex flex-col justify-between shadow-sm hover:border-slate-600 transition-all duration-300 group">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <p className="text-slate-400 font-semibold text-xs sm:text-sm">{label}</p>
        <div
          className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center border group-hover:scale-105 transition-transform ${c.icon}`}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2} />
        </div>
      </div>

      {loading ? (
        <div className="h-8 w-32 bg-slate-700/60 rounded-lg animate-pulse" />
      ) : (
        <h3 className={`text-xl sm:text-3xl font-extrabold tracking-tight ${c.value}`}>
          {brl(value)}
        </h3>
      )}
    </div>
  )
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="bg-slate-800 border border-slate-700/50 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 w-28 bg-slate-700/60 rounded animate-pulse" />
            <div className="h-9 w-9 bg-slate-700/60 rounded-xl animate-pulse" />
          </div>
          <div className="h-8 w-36 bg-slate-700/60 rounded-lg animate-pulse" />
        </div>
      ))}
    </div>
  )
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className="h-10 w-10 bg-red-500/10 text-red-400 rounded-xl flex items-center justify-center border border-red-500/20 shrink-0">
        <AlertCircle className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-red-400">Erro ao carregar dados financeiros</p>
        <p className="text-xs text-slate-400 mt-0.5 truncate">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-xl transition-all border border-slate-600 shrink-0 active:scale-95"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Tentar novamente
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * DashboardFinanceiro
 *
 * Exibe os valores consolidados de Total Receitas, Total Despesas e Saldo Líquido
 * buscando dados da view `v_fluxo_caixa` no Supabase.
 *
 * Uso:
 *   <DashboardFinanceiro />
 *
 * A view deve retornar uma única linha com as colunas:
 *   total_receitas  NUMERIC
 *   total_despesas  NUMERIC
 *   saldo_liquido   NUMERIC
 */
export default function DashboardFinanceiro() {
  const [dados, setDados] = useState<FluxoCaixaRow | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  async function buscarDados() {
    setCarregando(true)
    setErro(null)

    const { data, error } = await supabase
      .from('v_fluxo_caixa')
      .select('*')
      .single()

    if (error) {
      setErro(error.message)
      setDados(null)
    } else {
      setDados(data as FluxoCaixaRow)
    }

    setCarregando(false)
  }

  useEffect(() => {
    buscarDados()
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────

  if (carregando) return <SkeletonCards />

  if (erro) return <ErrorCard message={erro} onRetry={buscarDados} />

  if (!dados) {
    return (
      <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-8 text-center text-slate-400 text-sm">
        Nenhum dado financeiro disponível.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
      <SummaryCard
        label="Total Receitas"
        value={dados.total_receitas}
        icon={TrendingUp}
        colorScheme="green"
      />
      <SummaryCard
        label="Total Despesas"
        value={dados.total_despesas}
        icon={TrendingDown}
        colorScheme="red"
      />
      <SummaryCard
        label="Saldo Líquido"
        value={dados.saldo_liquido}
        icon={Wallet}
        colorScheme="dynamic"
        dynamicValue={dados.saldo_liquido}
      />
    </div>
  )
}
