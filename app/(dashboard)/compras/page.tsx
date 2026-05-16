'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function Compras() {
  const [fornecedores, setFornecedores] = useState<any[]>([])
  const [compras, setCompras] = useState<any[]>([])
  const [fornecedorId, setFornecedorId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valorTotal, setValorTotal] = useState('')
  const [dataCompra, setDataCompra] = useState('')

  async function carregarDados() {
    const { data: forns } = await supabase.from('fornecedores').select('*')
    setFornecedores(forns || [])
    const { data: comps } = await supabase.from('compras').select('*, fornecedores(nome)').order('created_at', { ascending: false })
    setCompras(comps || [])
  }

  async function salvarCompra() {
    if (!descricao.trim() || !valorTotal || !dataCompra) return
    const { data: userData } = await supabase.auth.getUser()
    await supabase.from('compras').insert([{ fornecedor_id: fornecedorId || null, descricao, valor_total: Number(valorTotal), data_compra: dataCompra, user_id: userData.user?.id }])
    setFornecedorId(''); setDescricao(''); setValorTotal(''); setDataCompra('')
    carregarDados()
  }

  useEffect(() => { carregarDados() }, [])

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Compras</h2>
        <p className="text-slate-400 mt-1">Registro de compras de materiais e equipamentos</p>
      </div>

      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 mb-8">
        <h3 className="text-lg font-bold text-white mb-4">Nova Compra</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold text-slate-400 mb-1.5">Fornecedor</label>
            <select className="appearance-none block w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all" value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}>
              <option value="">Selecione (opcional)</option>
              {fornecedores.map((f) => (<option key={f.id} value={f.id}>{f.nome}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-400 mb-1.5">Descrição</label>
            <input className="appearance-none block w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all" placeholder="Ex: Resina composta" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-400 mb-1.5">Valor Total (R$)</label>
            <input className="appearance-none block w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all" type="number" step="0.01" min="0" placeholder="0.00" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-400 mb-1.5">Data da Compra</label>
            <input type="date" className="appearance-none block w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all" value={dataCompra} onChange={(e) => setDataCompra(e.target.value)} />
          </div>
          <button onClick={salvarCompra} className="w-full bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-500 transition-all font-bold text-sm h-[42px] border border-blue-500">
            Registrar Compra
          </button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white">Histórico de Compras</h3>
        </div>
        {compras.length === 0 ? (
          <div className="text-center py-16"><h3 className="text-lg font-bold text-white mb-1">Nenhuma compra registrada</h3><p className="text-slate-400">Registre a primeira compra acima.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Fornecedor</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {compras.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-white text-sm">{c.descricao}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 hidden sm:table-cell">{c.fornecedores?.nome || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{c.data_compra ? new Date(c.data_compra + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-amber-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(c.valor_total))}</td>
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
