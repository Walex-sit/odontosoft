'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function FluxoCaixa() {
  const [receitas, setReceitas] = useState<any[]>([])
  const [despesas, setDespesas] = useState<any[]>([])

  async function carregarDados() {
    const { data: receitasData } = await supabase.from('receitas').select('*').order('created_at', { ascending: false })
    const { data: despesasData } = await supabase.from('despesas').select('*').order('created_at', { ascending: false })
    setReceitas(receitasData || [])
    setDespesas(despesasData || [])
  }

  useEffect(() => { carregarDados() }, [])

  const totalReceitas = receitas.reduce((acc, r) => acc + Number(r.valor), 0)
  const totalDespesas = despesas.reduce((acc, d) => acc + Number(d.valor), 0)
  const saldo = totalReceitas - totalDespesas

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Fluxo de Caixa</h2>
        <p className="text-slate-400 mt-1">Visão consolidada de receitas e despesas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <p className="text-slate-400 font-medium text-sm mb-1">Total Receitas</p>
          <h3 className="text-3xl font-extrabold text-emerald-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalReceitas)}</h3>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <p className="text-slate-400 font-medium text-sm mb-1">Total Despesas</p>
          <h3 className="text-3xl font-extrabold text-red-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDespesas)}</h3>
        </div>
        <div className={`bg-slate-900 border p-6 rounded-2xl ${saldo >= 0 ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
          <p className="text-slate-400 font-medium text-sm mb-1">Saldo</p>
          <h3 className={`text-3xl font-extrabold ${saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldo)}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h3 className="text-lg font-bold text-white">Últimas Receitas</h3>
          </div>
          {receitas.length === 0 ? (
            <div className="text-center py-12 text-slate-500">Nenhuma receita registrada.</div>
          ) : (
            <div className="divide-y divide-slate-800">
              {receitas.slice(0, 8).map((r) => (
                <div key={r.id} className="px-6 py-4 flex justify-between items-center hover:bg-slate-800/50 transition-colors">
                  <div>
                    <p className="font-bold text-white text-sm">{r.descricao}</p>
                    <p className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <span className="font-bold text-emerald-400 text-sm">+{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(r.valor))}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h3 className="text-lg font-bold text-white">Últimas Despesas</h3>
          </div>
          {despesas.length === 0 ? (
            <div className="text-center py-12 text-slate-500">Nenhuma despesa registrada.</div>
          ) : (
            <div className="divide-y divide-slate-800">
              {despesas.slice(0, 8).map((d) => (
                <div key={d.id} className="px-6 py-4 flex justify-between items-center hover:bg-slate-800/50 transition-colors">
                  <div>
                    <p className="font-bold text-white text-sm">{d.descricao}</p>
                    <p className="text-xs text-slate-500">{d.data_vencimento ? new Date(d.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</p>
                  </div>
                  <span className="font-bold text-red-400 text-sm">-{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(d.valor))}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
