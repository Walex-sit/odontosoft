'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { ShoppingBag, Plus, ListFilter } from 'lucide-react'

export default function Compras() {
  const [fornecedores, setFornecedores] = useState<any[]>([])
  const [compras, setCompras] = useState<any[]>([])
  const [fornecedorId, setFornecedorId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valorTotal, setValorTotal] = useState('')
  const [dataCompra, setDataCompra] = useState('')
  const [carregando, setCarregando] = useState(true)

  async function carregarDados() {
    try {
      const { data: forns } = await supabase.from('fornecedores').select('*')
      setFornecedores(forns || [])
      const { data: comps } = await supabase.from('compras').select('*, fornecedores(nome)').order('created_at', { ascending: false })
      setCompras(comps || [])
    } catch (e) {
      console.error(e)
    } finally {
      setCarregando(false)
    }
  }

  async function salvarCompra() {
    if (!descricao.trim() || !valorTotal || !dataCompra) return
    const { data: userData } = await supabase.auth.getUser()
    
    try {
      await supabase.from('compras').insert([{ fornecedor_id: proveedorIdFunc(), descricao, valor_total: Number(valorTotal), data_compra: dataCompra, user_id: userData.user?.id }])
      setFornecedorId(''); setDescricao(''); setValorTotal(''); setDataCompra('')
      carregarDados()
    } catch (e) {
      alert('Erro ao registrar compra')
    }
  }

  function proveedorIdFunc() {
    return fornecedorId || null
  }

  useEffect(() => { carregarDados() }, [])

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-105">Compras</h2>
        <p className="text-slate-400 mt-1 text-sm">Registro de compras de materiais e equipamentos</p>
      </div>

      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700/50 mb-8 shadow-sm">
        <h3 className="text-lg font-bold text-slate-105 mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-blue-400" />
          Nova Compra
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fornecedor</label>
            <select 
              className="appearance-none block w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all shadow-sm" 
              value={fornecedorId} 
              onChange={(e) => setFornecedorId(e.target.value)}
            >
              <option value="" className="bg-slate-900 text-slate-400">Selecione (opcional)</option>
              {fornecedores.map((f) => (<option key={f.id} value={f.id} className="bg-slate-900 text-slate-100">{f.nome}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Descrição</label>
            <input 
              className="appearance-none block w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all shadow-sm" 
              placeholder="Ex: Resina composta" 
              value={descricao} 
              onChange={(e) => setDescricao(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Valor Total (R$)</label>
            <input 
              className="appearance-none block w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all shadow-sm" 
              type="number" 
              step="0.01" 
              min="0" 
              placeholder="0,00" 
              value={valorTotal} 
              onChange={(e) => setValorTotal(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-505 uppercase tracking-wider mb-2">Data da Compra</label>
            <input 
              type="date" 
              className="appearance-none block w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all shadow-sm" 
              value={dataCompra} 
              onChange={(e) => setDataCompra(e.target.value)} 
            />
          </div>
          <button 
            onClick={salvarCompra} 
            className="w-full bg-blue-600 hover:bg-blue-505 text-white px-6 py-2.5 rounded-xl transition-all font-bold text-sm h-[42px] border border-blue-500 shadow-sm flex items-center justify-center shrink-0 active:scale-95"
          >
            Registrar Compra
          </button>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700/50 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-700/50 flex items-center gap-2">
          <ListFilter className="h-5 w-5 text-slate-400" />
          <h3 className="text-lg font-bold text-slate-105">Histórico de Compras</h3>
        </div>

        {carregando ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : compras.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="h-16 w-16 bg-slate-900 text-slate-550 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-800">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-1">Nenhuma compra registrada</h3>
            <p className="text-slate-400 text-sm">Registre a primeira compra acima.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full no-scrollbar">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-slate-900/40 border-b border-slate-700/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fornecedor</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {compras.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-200 text-sm">{c.descricao}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{c.fornecedores?.nome || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{c.data_compra ? new Date(c.data_compra + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-slate-200">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(c.valor_total))}</td>
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
