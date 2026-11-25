'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import DashboardFinanceiro from '../../components/DashboardFinanceiro'
import { Search } from 'lucide-react'

export default function FluxoCaixa() {
  const [receitas, setReceitas] = useState<any[]>([])
  const [despesas, setDespesas] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  async function carregarDados() {
    try {
      const { data: receitasData } = await supabase.from('receitas').select('*').order('created_at', { ascending: false })
      const { data: despesasData } = await supabase.from('despesas').select('*').order('created_at', { ascending: false })
      setReceitas(receitasData || [])
      setDespesas(despesasData || [])
    } catch (e) {
      console.error(e)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregarDados() }, [])

  const filteredReceitas = receitas.filter(r => r.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
  const filteredDespesas = despesas.filter(d => d.descricao.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="flex w-full h-full overflow-hidden text-[var(--text-primary)]">
      {/* Column 2 (Context/Filters) */}
      <aside className="w-72 border-r border-[var(--border)] bg-[var(--bg-surface)] flex flex-col h-full shrink-0">
        <div className="h-14 border-b border-[var(--border)] flex items-center px-6 shrink-0">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Filtros de Fluxo</h2>
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {/* Note: the DashboardFinanceiro component already handles most of the summary */}
          <div className="p-3 bg-[var(--bg-surface)] border border-[var(--border)] rounded text-sm text-[var(--text-secondary)]">
            A visão de fluxo de caixa apresenta um resumo consolidado de suas receitas e despesas registradas no sistema.
          </div>
          <div className="p-3 bg-[var(--primary-subtle)] border border-[var(--primary)]/40 rounded text-sm text-[var(--primary)]">
            Para adicionar novos registros, utilize as telas de Receitas e Despesas.
          </div>
        </div>
      </aside>

      {/* Column 3 (Main Workspace) */}
      <main className="flex-1 flex flex-col h-full bg-[var(--bg-surface)] relative">
        <div className="h-14 border-b border-[var(--border)] flex items-center px-6 shrink-0">
          <div className="flex items-center gap-2 text-[var(--text-muted)] w-1/3">
            <Search className="h-4 w-4" />
            <input 
              placeholder="Buscar histórico..." 
              className="w-full text-sm outline-none placeholder-[var(--text-secondary)] text-[var(--text-primary)] bg-transparent"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Resumo Financeiro</h2>
            {/* Keeping the DashboardFinanceiro component as it provides the cards */}
            <DashboardFinanceiro />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Últimas Receitas */}
            <div>
              <h3 className="text-md font-bold text-[var(--text-primary)] mb-3">Últimas Receitas</h3>
              <table className="w-full border-collapse border border-[var(--border)] text-sm">
                <thead>
                  <tr className="bg-[var(--bg-surface)] border-b border-[var(--border)]">
                    <th className="text-left py-2 px-3 font-semibold text-[var(--text-primary)] border-r border-[var(--border)]">Descrição</th>
                    <th className="text-left py-2 px-3 font-semibold text-[var(--text-primary)] border-r border-[var(--border)]">Data</th>
                    <th className="text-right py-2 px-3 font-semibold text-[var(--text-primary)]">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {carregando ? (
                    <tr>
                      <td colSpan={3} className="text-center py-4 text-[var(--text-muted)] border-b border-[var(--border)]">Carregando...</td>
                    </tr>
                  ) : filteredReceitas.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-4 text-[var(--text-muted)] border-b border-[var(--border)]">Nenhuma receita registrada.</td>
                    </tr>
                  ) : (
                    filteredReceitas.slice(0, 10).map((r) => (
                      <tr key={r.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-surface)]">
                        <td className="py-2 px-3 border-r border-[var(--border)] text-[var(--text-primary)] truncate max-w-[150px]" title={r.descricao}>{r.descricao}</td>
                        <td className="py-2 px-3 border-r border-[var(--border)] text-[var(--text-secondary)]">{new Date(r.created_at).toLocaleDateString('pt-BR')}</td>
                        <td className="py-2 px-3 text-right font-medium text-emerald-600">
                          +{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(r.valor))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Últimas Despesas */}
            <div>
              <h3 className="text-md font-bold text-[var(--text-primary)] mb-3">Últimas Despesas</h3>
              <table className="w-full border-collapse border border-[var(--border)] text-sm">
                <thead>
                  <tr className="bg-[var(--bg-surface)] border-b border-[var(--border)]">
                    <th className="text-left py-2 px-3 font-semibold text-[var(--text-primary)] border-r border-[var(--border)]">Descrição</th>
                    <th className="text-left py-2 px-3 font-semibold text-[var(--text-primary)] border-r border-[var(--border)]">Vencimento</th>
                    <th className="text-right py-2 px-3 font-semibold text-[var(--text-primary)]">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {carregando ? (
                    <tr>
                      <td colSpan={3} className="text-center py-4 text-[var(--text-muted)] border-b border-[var(--border)]">Carregando...</td>
                    </tr>
                  ) : filteredDespesas.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-4 text-[var(--text-muted)] border-b border-[var(--border)]">Nenhuma despesa registrada.</td>
                    </tr>
                  ) : (
                    filteredDespesas.slice(0, 10).map((d) => (
                      <tr key={d.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-surface)]">
                        <td className="py-2 px-3 border-r border-[var(--border)] text-[var(--text-primary)] truncate max-w-[150px]" title={d.descricao}>{d.descricao}</td>
                        <td className="py-2 px-3 border-r border-[var(--border)] text-[var(--text-secondary)]">{d.data_vencimento ? new Date(d.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                        <td className="py-2 px-3 text-right font-medium text-red-600">
                          -{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(d.valor))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
