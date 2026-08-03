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
    <div className="flex w-full h-full overflow-hidden text-slate-100">
      {/* Column 2 (Context/Filters) */}
      <aside className="w-72 border-r border-slate-600 bg-slate-700 flex flex-col h-full shrink-0">
        <div className="h-14 border-b border-slate-600 flex items-center px-6 shrink-0">
          <h2 className="text-sm font-bold text-slate-100">Filtros de Fluxo</h2>
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {/* Note: the DashboardFinanceiro component already handles most of the summary */}
          <div className="p-3 bg-slate-700/50 border border-slate-600 rounded text-sm text-slate-300">
            A visão de fluxo de caixa apresenta um resumo consolidado de suas receitas e despesas registradas no sistema.
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            Para adicionar novos registros, utilize as telas de Receitas e Despesas.
          </div>
        </div>
      </aside>

      {/* Column 3 (Main Workspace) */}
      <main className="flex-1 flex flex-col h-full bg-slate-800 relative">
        <div className="h-14 border-b border-slate-600 flex items-center px-6 shrink-0">
          <div className="flex items-center gap-2 text-slate-400 w-1/3">
            <Search className="h-4 w-4" />
            <input 
              placeholder="Buscar histórico..." 
              className="w-full text-sm outline-none placeholder-slate-400 text-slate-100 bg-transparent"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-100 mb-4">Resumo Financeiro</h2>
            {/* Keeping the DashboardFinanceiro component as it provides the cards */}
            <DashboardFinanceiro />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Últimas Receitas */}
            <div>
              <h3 className="text-md font-bold text-slate-100 mb-3">Últimas Receitas</h3>
              <table className="w-full border-collapse border border-slate-600 text-sm">
                <thead>
                  <tr className="bg-slate-700/50 border-b border-slate-600">
                    <th className="text-left py-2 px-3 font-semibold text-slate-100 border-r border-slate-600">Descrição</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-100 border-r border-slate-600">Data</th>
                    <th className="text-right py-2 px-3 font-semibold text-slate-100">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {carregando ? (
                    <tr>
                      <td colSpan={3} className="text-center py-4 text-slate-400 border-b border-slate-600">Carregando...</td>
                    </tr>
                  ) : filteredReceitas.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-4 text-slate-400 border-b border-slate-600">Nenhuma receita registrada.</td>
                    </tr>
                  ) : (
                    filteredReceitas.slice(0, 10).map((r) => (
                      <tr key={r.id} className="border-b border-slate-600 hover:bg-slate-700/50">
                        <td className="py-2 px-3 border-r border-slate-600 text-slate-100 truncate max-w-[150px]" title={r.descricao}>{r.descricao}</td>
                        <td className="py-2 px-3 border-r border-slate-600 text-slate-300">{new Date(r.created_at).toLocaleDateString('pt-BR')}</td>
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
              <h3 className="text-md font-bold text-slate-100 mb-3">Últimas Despesas</h3>
              <table className="w-full border-collapse border border-slate-600 text-sm">
                <thead>
                  <tr className="bg-slate-700/50 border-b border-slate-600">
                    <th className="text-left py-2 px-3 font-semibold text-slate-100 border-r border-slate-600">Descrição</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-100 border-r border-slate-600">Vencimento</th>
                    <th className="text-right py-2 px-3 font-semibold text-slate-100">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {carregando ? (
                    <tr>
                      <td colSpan={3} className="text-center py-4 text-slate-400 border-b border-slate-600">Carregando...</td>
                    </tr>
                  ) : filteredDespesas.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-4 text-slate-400 border-b border-slate-600">Nenhuma despesa registrada.</td>
                    </tr>
                  ) : (
                    filteredDespesas.slice(0, 10).map((d) => (
                      <tr key={d.id} className="border-b border-slate-600 hover:bg-slate-700/50">
                        <td className="py-2 px-3 border-r border-slate-600 text-slate-100 truncate max-w-[150px]" title={d.descricao}>{d.descricao}</td>
                        <td className="py-2 px-3 border-r border-slate-600 text-slate-300">{d.data_vencimento ? new Date(d.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
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
