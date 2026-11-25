'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, Activity, CalendarDays, Loader2 } from 'lucide-react'
import { fetchTeamMembers } from '@/app/actions/users'
import { fetchDentistPerformance } from '@/app/actions/performance'

export default function PerformancePage() {
  const [dentistas, setDentistas] = useState<any[]>([])
  const [selectedDentistaId, setSelectedDentistaId] = useState<string>('')
  
  const [loading, setLoading] = useState(false)
  const [performance, setPerformance] = useState<{ totalComissoes: number; procedimentos: any[] } | null>(null)

  useEffect(() => {
    // Carrega os dentistas para o dropdown de simulação (em prod seria o user da sessão)
    fetchTeamMembers().then(res => {
      if (res.success) {
        const d = res.data.filter(u => u.role === 'dentista')
        setDentistas(d)
        if (d.length > 0) {
          setSelectedDentistaId(d[0].id)
        }
      }
    })
  }, [])

  useEffect(() => {
    if (selectedDentistaId) {
      loadPerformance(selectedDentistaId)
    }
  }, [selectedDentistaId])

  const loadPerformance = async (id: string) => {
    setLoading(true)
    try {
      const res = await fetchDentistPerformance(id, 30) // últimos 30 dias
      if (res.success) {
        setPerformance(res.data)
      } else {
        setPerformance({ totalComissoes: 0, procedimentos: [] })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  return (
    <div className="flex flex-col w-full h-full bg-[var(--bg-base)] dark:bg-[var(--bg-base)] text-[var(--text-primary)] overflow-y-auto">
      {/* Header */}
      <header className="p-8 bg-[var(--bg-surface)] border-b border-[var(--border)]  shadow-sm shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Desempenho e Comissões</h1>
            <p className="text-sm font-semibold text-[var(--text-muted)] mt-1">Acompanhe seus procedimentos e valores gerados</p>
          </div>
          <div className="flex items-center gap-3 bg-[var(--bg-base)] p-2 rounded-xl">
            <span className="text-sm font-bold text-[var(--text-secondary)] px-2">Visualizando como:</span>
            <select 
              value={selectedDentistaId}
              onChange={e => setSelectedDentistaId(e.target.value)}
              className="bg-[var(--bg-surface)] border border-[var(--border-medium)]  rounded-lg px-3 py-1.5 text-sm font-bold outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              {dentistas.map(d => (
                <option key={d.id} value={d.id}>{d.nome}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-8 max-w-6xl mx-auto w-full space-y-6">
        
        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[var(--bg-surface)] p-6 rounded-[24px] border border-[var(--border)]  shadow-sm flex items-center gap-5">
            <div className="p-4 bg-green-100 text-green-600 rounded-2xl">
              <DollarSign className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Comissões (30 dias)</p>
              <h2 className="text-2xl font-extrabold text-[var(--text-primary)]">
                {loading ? '...' : formatCurrency(performance?.totalComissoes || 0)}
              </h2>
            </div>
          </div>
          
          <div className="bg-[var(--bg-surface)] p-6 rounded-[24px] border border-[var(--border)]  shadow-sm flex items-center gap-5">
            <div className="p-4 bg-[var(--primary-subtle)] text-[var(--primary)] rounded-2xl">
              <Activity className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Procedimentos Realizados</p>
              <h2 className="text-2xl font-extrabold text-[var(--text-primary)]">
                {loading ? '...' : performance?.procedimentos.length || 0}
              </h2>
            </div>
          </div>

          <div className="bg-[var(--bg-surface)] p-6 rounded-[24px] border border-[var(--border)]  shadow-sm flex items-center gap-5">
            <div className="p-4 bg-[var(--primary-subtle)] text-[var(--primary)] rounded-2xl">
              <CalendarDays className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Período</p>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Últimos 30 dias</h2>
            </div>
          </div>
        </div>

        {/* Tabela de Procedimentos */}
        <div className="bg-[var(--bg-surface)] rounded-[32px] border border-[var(--border)]  shadow-sm overflow-hidden mt-8">
          <div className="p-6 border-b border-[var(--border)] flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-[var(--primary)]" />
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Histórico de Procedimentos</h3>
          </div>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 text-[var(--primary)] animate-spin mb-4" />
              <p className="text-sm text-[var(--text-muted)] font-semibold">Carregando dados...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border-b border-[var(--border)]  text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold">
                    <th className="p-5">Data</th>
                    <th className="p-5">Procedimento</th>
                    <th className="p-5">Valor Cobrado</th>
                    <th className="p-5">Comissão Gerada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {performance && performance.procedimentos.length > 0 ? (
                    performance.procedimentos.map(p => (
                      <tr key={p.id} className="hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] dark:bg-[var(--bg-base)] transition-colors">
                        <td className="p-5 font-semibold text-[var(--text-secondary)]">
                          {new Date(p.data_realizacao).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-5 font-bold text-[var(--text-primary)]">{p.procedimento_nome}</td>
                        <td className="p-5 text-[var(--text-secondary)]">{formatCurrency(p.valor_cobrado)}</td>
                        <td className="p-5 font-bold text-green-600">{formatCurrency(p.comissao_gerada)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-[var(--text-muted)] font-semibold">
                        Nenhum procedimento realizado neste período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
