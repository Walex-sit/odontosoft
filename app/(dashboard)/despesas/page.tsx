'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { logAction } from '../../lib/logger'

export default function Despesas() {
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [categoria, setCategoria] = useState('')
  const [dataVencimento, setDataVencimento] = useState('')
  const [despesas, setDespesas] = useState<any[]>([])

  async function carregarDespesas() {
    const { data } = await supabase
      .from('despesas')
      .select('*')
      .order('created_at', { ascending: false })

    setDespesas(data || [])
  }

  async function salvarDespesa() {
    if (!descricao.trim() || !valor || !dataVencimento) return

    const { data: userData } = await supabase.auth.getUser()

    await supabase.from('despesas').insert([
      {
        descricao,
        valor: Number(valor),
        categoria,
        data_vencimento: dataVencimento,
        status: 'pendente',
        user_id: userData.user?.id
      }
    ])

    await logAction('financeiro', 'despesas', { descricao, valor: Number(valor), categoria, acao: 'despesa_criada' })

    setDescricao('')
    setValor('')
    setCategoria('')
    setDataVencimento('')
    carregarDespesas()
  }

  useEffect(() => {
    carregarDespesas()
  }, [])

  const total = despesas.reduce((acc, item) => acc + Number(item.valor), 0)

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Despesas</h2>
          <p className="text-slate-400 mt-1">Controle de despesas e contas a pagar</p>
        </div>
        <div className="bg-slate-900 px-6 py-3 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="h-10 w-10 bg-red-900/30 text-red-400 rounded-full flex items-center justify-center border border-red-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Despesas</p>
            <p className="text-xl font-extrabold text-red-400">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 mb-8">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nova Despesa
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold text-slate-400 mb-1.5">Descrição</label>
            <input className="appearance-none block w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent sm:text-sm transition-all" placeholder="Ex: Aluguel" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-400 mb-1.5">Valor (R$)</label>
            <input className="appearance-none block w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent sm:text-sm transition-all" placeholder="0.00" type="number" step="0.01" min="0" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-400 mb-1.5">Categoria</label>
            <select className="appearance-none block w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent sm:text-sm transition-all" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="">Selecione</option>
              <option value="aluguel">Aluguel</option>
              <option value="salarios">Salários</option>
              <option value="materiais">Materiais</option>
              <option value="equipamentos">Equipamentos</option>
              <option value="impostos">Impostos</option>
              <option value="outros">Outros</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-400 mb-1.5">Vencimento</label>
            <input type="date" className="appearance-none block w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent sm:text-sm transition-all" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} />
          </div>
          <button onClick={salvarDespesa} className="w-full bg-red-600 text-white px-6 py-2.5 rounded-xl hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-bold text-sm h-[42px] border border-red-500">
            Lançar Despesa
          </button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Histórico de Despesas
          </h3>
        </div>
        {despesas.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="h-16 w-16 bg-slate-800 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Nenhuma despesa lançada</h3>
            <p className="text-slate-400">Registre as despesas da clínica.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Categoria</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vencimento</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {despesas.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-white text-sm">{d.descricao}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-medium capitalize">{d.categoria || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-medium">{d.data_vencimento ? new Date(d.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${d.status === 'pendente' ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : d.status === 'pago' ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20' : 'bg-slate-700 text-slate-400 border border-slate-600'}`}>
                        {d.status ? d.status.toUpperCase() : 'PENDENTE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-red-400">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(d.valor))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
