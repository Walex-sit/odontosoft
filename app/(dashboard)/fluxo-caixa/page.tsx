'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import DashboardFinanceiro from '../../components/DashboardFinanceiro'

export default function FluxoCaixa() {
  const [receitas, setReceitas] = useState<any[]>([])
  const [despesas, setDespesas] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)

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

  // Os totais vêm da view v_fluxo_caixa via DashboardFinanceiro

  return (
    <>
      <div className="mb-6 sm:mb-8 px-1 sm:px-0">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-100">Fluxo de Caixa</h2>
        <p className="text-slate-400 mt-1 text-xs sm:text-sm">Visão consolidada de receitas e despesas</p>
      </div>

      {/* Cards de Resumo — dados reais via view v_fluxo_caixa */}
      <div className="mb-8">
        <DashboardFinanceiro />
      </div>

      {/* Grid de Tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Últimas Receitas */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700/50 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-700/50">
            <h3 className="text-lg font-bold text-slate-100">Últimas Receitas</h3>
          </div>

          {carregando ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : receitas.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">Nenhuma receita registrada.</div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {receitas.slice(0, 8).map((r) => (
                <div key={r.id} className="px-6 py-4 flex justify-between items-center hover:bg-slate-700/30 transition-colors">
                  <div className="min-w-0 pr-3">
                    <p className="font-bold text-slate-200 text-sm truncate">{r.descricao}</p>
                    <p className="text-xs text-slate-450 mt-0.5">{new Date(r.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <span className="font-bold text-emerald-450 text-sm shrink-0">+{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(r.valor))}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Últimas Despesas */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700/50 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-700/50">
            <h3 className="text-lg font-bold text-slate-100">Últimas Despesas</h3>
          </div>

          {carregando ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : despesas.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">Nenhuma despesa registrada.</div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {despesas.slice(0, 8).map((d) => (
                <div key={d.id} className="px-6 py-4 flex justify-between items-center hover:bg-slate-700/30 transition-colors">
                  <div className="min-w-0 pr-3">
                    <p className="font-bold text-slate-200 text-sm truncate">{d.descricao}</p>
                    <p className="text-xs text-slate-450 mt-0.5">{d.data_vencimento ? new Date(d.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</p>
                  </div>
                  <span className="font-bold text-red-400 text-sm shrink-0">-{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(d.valor))}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  )
}
