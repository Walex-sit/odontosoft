'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

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

  const totalReceitas = receitas.reduce((acc, r) => acc + Number(r.valor), 0)
  const totalDespesas = despesas.reduce((acc, d) => acc + Number(d.valor), 0)
  const saldo = totalReceitas - totalDespesas

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-100">Fluxo de Caixa</h2>
        <p className="text-slate-400 mt-1 text-sm">Visão consolidada de receitas e despesas</p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-800 border border-slate-700/50 p-6 rounded-2xl flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-slate-400 font-semibold text-sm">Total Receitas</p>
            <div className="h-8 w-8 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/20">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-emerald-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalReceitas)}</h3>
        </div>

        <div className="bg-slate-800 border border-slate-700/50 p-6 rounded-2xl flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-slate-400 font-semibold text-sm">Total Despesas</p>
            <div className="h-8 w-8 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center border border-red-500/20">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-red-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDespesas)}</h3>
        </div>

        <div className="bg-slate-800 border border-slate-700/50 p-6 rounded-2xl flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-slate-400 font-semibold text-sm">Saldo</p>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center border ${saldo >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <h3 className={`text-2xl sm:text-3xl font-extrabold ${saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldo)}</h3>
        </div>
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
